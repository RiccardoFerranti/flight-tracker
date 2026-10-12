import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePlaneDetailsSocket } from './usePlaneDetailsSocket';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static constructorFailuresRemaining = 0;

  readonly close = vi.fn();
  readonly send = vi.fn();
  readonly url: string;
  private readonly listeners = new Map<string, EventListener[]>();

  constructor(url: string) {
    if (MockWebSocket.constructorFailuresRemaining > 0) {
      MockWebSocket.constructorFailuresRemaining -= 1;
      throw new Error('WebSocket constructor failed');
    }

    this.url = url;
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type);
    if (!listeners) return;

    this.listeners.set(
      type,
      listeners.filter((registeredListener) => registeredListener !== listener),
    );
  }

  emit(type: string, event: Event): void {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

const planeDetails = {
  id: 'plane-1',
  model: 'Airbus A320',
  airline: 'Example Air',
  flightNumber: 'EA123',
  registration: 'N123EA',
  latitude: 13.7563,
  longitude: 100.5018,
  altitude: 10_000,
  speed: 850,
  heading: 90,
  verticalSpeed: 0,
  origin: { airport: 'BKK', city: 'Bangkok' },
  destination: { airport: 'SIN', city: 'Singapore' },
  flightDuration: 5_400_000,
  estimatedArrival: 1_800_000_000_000,
  numberOfPassengers: 120,
  maxPassengers: 180,
  status: 'cruising' as const,
  color: '#2563eb',
};

function closeSocket(socket: MockWebSocket, code = 1000): void {
  const event = new Event('close') as CloseEvent;
  Object.defineProperty(event, 'code', { value: code });

  act(() => socket.emit('close', event));
}

function openSocket(socket: MockWebSocket): void {
  act(() => socket.emit('open', new Event('open')));
}

function emitWindowEvent(type: 'online' | 'offline'): void {
  act(() => window.dispatchEvent(new Event(type)));
}

function runNextRetry(delay: number): void {
  act(() => vi.advanceTimersByTime(delay));
}

function emitValidPlaneDetails(socket: MockWebSocket, planeId = 'plane-1'): void {
  act(() => {
    socket.emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'plane-details', data: { ...planeDetails, id: planeId } }),
      }),
    );
  });
}

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

afterEach(() => {
  MockWebSocket.instances = [];
  MockWebSocket.constructorFailuresRemaining = 0;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('usePlaneDetailsSocket', () => {
  it('does not open a connection without a selected plane', () => {
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result } = renderHook(() => usePlaneDetailsSocket(null));

    expect(MockWebSocket.instances).toHaveLength(0);
    expect(result.current).toEqual({ plane: null, status: 'disconnected', error: null });
  });

  it('waits for online when a selection lifecycle starts offline', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
    let isOnline = false;
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => isOnline);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));

    expect(result.current.status).toBe('disconnected');
    expect(MockWebSocket.instances).toHaveLength(0);
    runNextRetry(60_000);
    expect(MockWebSocket.instances).toHaveLength(0);

    isOnline = true;
    emitWindowEvent('online');
    const socket = MockWebSocket.instances[0];
    expect(MockWebSocket.instances).toHaveLength(1);

    openSocket(socket);
    expect(result.current.status).toBe('connecting');
    emitValidPlaneDetails(socket);
    expect(result.current.status).toBe('connected');

    unmount();
  });

  it('keeps a new selection offline until online after the previous selection disconnects', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
    let isOnline = true;
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => isOnline);

    const { result, rerender, unmount } = renderHook(({ planeId }) => usePlaneDetailsSocket(planeId), {
      initialProps: { planeId: 'plane-1' as string | null },
    });
    const firstSocket = MockWebSocket.instances[0];
    emitValidPlaneDetails(firstSocket);

    isOnline = false;
    emitWindowEvent('offline');
    rerender({ planeId: 'plane-2' });
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(result.current.status).toBe('disconnected');

    isOnline = true;
    emitWindowEvent('online');
    const secondSocket = MockWebSocket.instances[1];
    expect(MockWebSocket.instances).toHaveLength(2);
    emitValidPlaneDetails(secondSocket, 'plane-2');
    expect(result.current.status).toBe('connected');
    expect(firstSocket.close).toHaveBeenCalledOnce();

    unmount();
  });

  it('closes each previous socket when returning to a previously selected plane', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, rerender, unmount } = renderHook(({ planeId }) => usePlaneDetailsSocket(planeId), {
      initialProps: { planeId: 'plane-4' },
    });
    const socketA = MockWebSocket.instances[0];

    rerender({ planeId: 'plane-11' });
    const socketB = MockWebSocket.instances[1];
    rerender({ planeId: 'plane-4' });
    const socketC = MockWebSocket.instances[2];

    expect(socketA.close).toHaveBeenCalledOnce();
    expect(socketB.close).toHaveBeenCalledOnce();
    expect(socketC.close).not.toHaveBeenCalled();
    expect(MockWebSocket.instances).toHaveLength(3);

    // Removed listeners make late events from closed selections inert.
    act(() => {
      socketA.emit('open', new Event('open'));
      socketB.emit('open', new Event('open'));
      socketA.emit(
        'message',
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'plane-details', data: { ...planeDetails, id: 'plane-4' } }),
        }),
      );
      socketB.emit('close', new Event('close'));
    });
    runNextRetry(60_000);

    expect(socketA.send).not.toHaveBeenCalled();
    expect(socketB.send).not.toHaveBeenCalled();
    expect(result.current).toEqual({ plane: null, status: 'connecting', error: null });
    expect(MockWebSocket.instances).toHaveLength(3);

    unmount();
  });

  it('leaves only the final socket owned after rapid selection changes', () => {
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { rerender, unmount } = renderHook(({ planeId }) => usePlaneDetailsSocket(planeId), {
      initialProps: { planeId: 'plane-4' },
    });

    ['plane-11', 'plane-4', 'plane-7', 'plane-4'].forEach((planeId) => rerender({ planeId }));

    expect(MockWebSocket.instances).toHaveLength(5);
    MockWebSocket.instances.slice(0, -1).forEach((socket) => {
      expect(socket.close).toHaveBeenCalledOnce();
    });
    expect(MockWebSocket.instances[4].close).not.toHaveBeenCalled();

    unmount();
  });

  it('subscribes on open but becomes connected only after valid details arrive', () => {
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    const socket = MockWebSocket.instances[0];

    expect(socket.url).toBe(import.meta.env.VITE_PLANE_DETAILS_WS_URL);
    expect(result.current.status).toBe('connecting');

    openSocket(socket);

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'subscribe', planeId: 'plane-1' }));
    expect(result.current.status).toBe('connecting');

    emitValidPlaneDetails(socket);

    expect(result.current.plane).toEqual(planeDetails);
    expect(result.current.status).toBe('connected');
    expect(result.current.error).toBeNull();

    unmount();
  });

  it('keeps valid details intact for invalid messages and reports application errors', () => {
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    const socket = MockWebSocket.instances[0];
    emitValidPlaneDetails(socket);

    act(() => socket.emit('message', new MessageEvent('message', { data: '{invalid-json' })));
    expect(result.current.error).toBe('Received malformed plane details JSON.');
    expect(result.current.plane).toEqual(planeDetails);

    act(() =>
      socket.emit('message', new MessageEvent('message', { data: JSON.stringify({ type: 'error', message: 'Unknown plane' }) })),
    );
    expect(result.current.error).toBe('Unknown plane');
    expect(result.current.status).toBe('error');
    expect(result.current.plane).toEqual(planeDetails);

    unmount();
  });

  it('uses five linear fast retries before periodic health probes', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    closeSocket(MockWebSocket.instances[0]);

    [1_000, 2_000, 3_000, 4_000, 5_000].forEach((delay, index) => {
      runNextRetry(delay);
      expect(MockWebSocket.instances).toHaveLength(index + 2);
      expect(result.current.status).toBe('connecting');
      closeSocket(MockWebSocket.instances[index + 1]);
    });

    expect(result.current.status).toBe('disconnected');

    runNextRetry(10_000);
    expect(MockWebSocket.instances).toHaveLength(7);
    expect(result.current.status).toBe('disconnected');

    unmount();
  });

  it('resets recovery only after valid details arrive on the recovered socket', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    closeSocket(MockWebSocket.instances[0]);
    runNextRetry(1_000);
    const retrySocket = MockWebSocket.instances[1];
    openSocket(retrySocket);

    expect(result.current.status).toBe('connecting');
    emitValidPlaneDetails(retrySocket);
    expect(result.current.status).toBe('connected');

    closeSocket(retrySocket);
    runNextRetry(1_000);
    expect(MockWebSocket.instances).toHaveLength(3);

    unmount();
  });

  it('routes synchronous constructor failures through fast recovery', async () => {
    vi.useFakeTimers();
    MockWebSocket.constructorFailuresRemaining = 1;
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    await flushMicrotasks();

    expect(result.current.status).toBe('connecting');
    expect(result.current.error).toBe('Unable to create the plane details WebSocket connection.');

    runNextRetry(1_000);
    expect(MockWebSocket.instances).toHaveLength(1);

    unmount();
  });

  it('pauses a pending fast retry while offline', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    closeSocket(MockWebSocket.instances[0]);
    emitWindowEvent('offline');

    expect(result.current.status).toBe('disconnected');
    runNextRetry(10_000);
    expect(MockWebSocket.instances).toHaveLength(1);

    unmount();
  });

  it('pauses a pending health retry while offline', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    closeSocket(MockWebSocket.instances[0]);

    [1_000, 2_000, 3_000, 4_000, 5_000].forEach((delay, index) => {
      runNextRetry(delay);
      closeSocket(MockWebSocket.instances[index + 1]);
    });
    expect(result.current.status).toBe('disconnected');

    emitWindowEvent('offline');
    runNextRetry(10_000);
    expect(MockWebSocket.instances).toHaveLength(6);

    unmount();
  });

  it('does not schedule recovery if the browser goes offline before a constructor failure is handled', async () => {
    vi.useFakeTimers();
    MockWebSocket.constructorFailuresRemaining = 1;
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    emitWindowEvent('offline');
    await flushMicrotasks();

    expect(result.current.status).toBe('disconnected');
    runNextRetry(10_000);
    expect(MockWebSocket.instances).toHaveLength(0);

    unmount();
  });

  it('closes the active socket and cancels its stale watchdog while offline', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    const socket = MockWebSocket.instances[0];
    openSocket(socket);
    emitValidPlaneDetails(socket);

    emitWindowEvent('offline');
    expect(socket.close).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('disconnected');
    expect(result.current.plane).toEqual(planeDetails);

    closeSocket(socket);
    runNextRetry(10_000);
    expect(socket.close).toHaveBeenCalledOnce();
    expect(MockWebSocket.instances).toHaveLength(1);

    unmount();
  });

  it('reconnects immediately on online without duplicating an active socket', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    const firstSocket = MockWebSocket.instances[0];

    emitWindowEvent('online');
    expect(MockWebSocket.instances).toHaveLength(1);

    emitWindowEvent('offline');
    emitWindowEvent('online');
    const secondSocket = MockWebSocket.instances[1];
    expect(MockWebSocket.instances).toHaveLength(2);

    openSocket(secondSocket);
    expect(result.current.status).toBe('disconnected');
    emitValidPlaneDetails(secondSocket);
    expect(result.current.status).toBe('connected');
    expect(firstSocket.close).toHaveBeenCalledOnce();

    unmount();
  });

  it('preserves the retry history when online accelerates recovery', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    closeSocket(MockWebSocket.instances[0]);
    emitWindowEvent('offline');
    emitWindowEvent('online');

    const onlineSocket = MockWebSocket.instances[1];
    closeSocket(onlineSocket);
    runNextRetry(1_000);
    expect(MockWebSocket.instances).toHaveLength(2);
    runNextRetry(1_000);
    expect(MockWebSocket.instances).toHaveLength(3);

    unmount();
  });

  it('removes window listeners when the selection clears, so later browser events are ignored', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
    const removeEventListener = vi.spyOn(window, 'removeEventListener');

    const { rerender, unmount } = renderHook(({ planeId }) => usePlaneDetailsSocket(planeId), {
      initialProps: { planeId: 'plane-1' as string | null },
    });

    rerender({ planeId: null });
    emitWindowEvent('online');
    emitWindowEvent('offline');

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));

    unmount();
  });

  it('starts the watchdog on open, then closes a stale socket through normal recovery', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    const socket = MockWebSocket.instances[0];
    openSocket(socket);

    runNextRetry(4_999);
    expect(socket.close).not.toHaveBeenCalled();

    runNextRetry(1);
    expect(socket.close).toHaveBeenCalledOnce();

    // A real WebSocket emits close after close(), and that handler owns the existing recovery.
    closeSocket(socket);
    runNextRetry(1_000);
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(result.current.status).toBe('connecting');

    unmount();
  });

  it('resets the watchdog only after valid details for the selected plane arrive', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    const socket = MockWebSocket.instances[0];
    openSocket(socket);

    runNextRetry(4_900);
    emitValidPlaneDetails(socket);
    runNextRetry(4_900);
    expect(socket.close).not.toHaveBeenCalled();

    runNextRetry(100);
    expect(socket.close).toHaveBeenCalledOnce();

    unmount();
  });

  it.each([
    ['malformed JSON', '{invalid-json'],
    ['schema-invalid data', JSON.stringify({ type: 'plane-details', data: { id: 'plane-1' } })],
    ['application errors', JSON.stringify({ type: 'error', message: 'Plane plane-1 not found' })],
    ['details for another plane', JSON.stringify({ type: 'plane-details', data: { ...planeDetails, id: 'plane-2' } })],
  ])('does not reset the watchdog for %s', (_description, data) => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    const socket = MockWebSocket.instances[0];
    openSocket(socket);

    act(() => socket.emit('message', new MessageEvent('message', { data })));
    runNextRetry(5_000);

    expect(socket.close).toHaveBeenCalledOnce();
    unmount();
  });

  it('cancels the stale watchdog when the selection changes', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { rerender, unmount } = renderHook(({ planeId }) => usePlaneDetailsSocket(planeId), {
      initialProps: { planeId: 'plane-1' as string | null },
    });
    const firstSocket = MockWebSocket.instances[0];
    openSocket(firstSocket);

    rerender({ planeId: 'plane-2' });
    const secondSocket = MockWebSocket.instances[1];
    openSocket(secondSocket);
    runNextRetry(5_000);

    expect(firstSocket.close).toHaveBeenCalledOnce();
    expect(secondSocket.close).toHaveBeenCalledOnce();

    unmount();
  });

  it('treats a policy close without an application error as terminal until the selection changes', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, rerender, unmount } = renderHook(({ planeId }) => usePlaneDetailsSocket(planeId), {
      initialProps: { planeId: 'plane-1' as string | null },
    });
    closeSocket(MockWebSocket.instances[0], 1008);

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('The selected plane is no longer available.');

    runNextRetry(60_000);
    expect(MockWebSocket.instances).toHaveLength(1);

    rerender({ planeId: 'plane-2' });
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(result.current.status).toBe('connecting');

    unmount();
  });

  it('preserves the application error when the server follows it with a policy close', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    const socket = MockWebSocket.instances[0];

    act(() =>
      socket.emit(
        'message',
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'error', message: 'Plane plane-1 not found' }),
        }),
      ),
    );
    closeSocket(socket, 1008);

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Plane plane-1 not found');

    runNextRetry(60_000);
    expect(MockWebSocket.instances).toHaveLength(1);

    unmount();
  });

  it('cancels pending recovery and ignores old socket events when the selection changes or clears', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, rerender, unmount } = renderHook(({ planeId }) => usePlaneDetailsSocket(planeId), {
      initialProps: { planeId: 'plane-1' as string | null },
    });
    const firstSocket = MockWebSocket.instances[0];
    closeSocket(firstSocket);

    rerender({ planeId: 'plane-2' });
    const secondSocket = MockWebSocket.instances[1];

    runNextRetry(10_000);
    expect(MockWebSocket.instances).toHaveLength(2);

    act(() => secondSocket.emit('open', new Event('open')));
    act(() => {
      firstSocket.emit('open', new Event('open'));
      firstSocket.emit('error', new Event('error'));
      firstSocket.emit(
        'message',
        new MessageEvent('message', { data: JSON.stringify({ type: 'plane-details', data: planeDetails }) }),
      );
      firstSocket.emit('close', new Event('close'));
    });

    expect(firstSocket.send).not.toHaveBeenCalled();
    expect(result.current.status).toBe('connecting');
    expect(result.current.plane).toBeNull();

    rerender({ planeId: null });
    runNextRetry(10_000);
    expect(secondSocket.close).toHaveBeenCalledOnce();
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(result.current).toEqual({ plane: null, status: 'disconnected', error: null });

    unmount();
  });
});
