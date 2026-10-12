import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePlanesSocket } from './usePlanesSocket';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static constructorFailuresRemaining = 0;

  readonly close = vi.fn();
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

function closeSocket(socket: MockWebSocket): void {
  act(() => socket.emit('close', new Event('close')));
}

function runNextRetry(delay: number): void {
  act(() => vi.advanceTimersByTime(delay));
}

function emitValidPlanesMessage(socket: MockWebSocket): void {
  act(() => {
    socket.emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'planes',
          data: [
            {
              id: 'plane-1',
              latitude: 13.7563,
              longitude: 100.5018,
              altitude: 10000,
              color: '#2563eb',
            },
          ],
        }),
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
  vi.unstubAllGlobals();
});

describe('usePlanesSocket', () => {
  it('stores validated snapshots and closes its socket on cleanup', () => {
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlanesSocket());
    const socket = MockWebSocket.instances[0];

    expect(socket.url).toBe(import.meta.env.VITE_PLANES_BASIC_WS_URL);
    expect(result.current.status).toBe('connecting');

    act(() => {
      socket.emit('open', new Event('open'));
    });

    expect(result.current.status).toBe('connecting');

    act(() => {
      socket.emit(
        'message',
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'planes',
            data: [
              {
                id: 'plane-1',
                latitude: 13.7563,
                longitude: 100.5018,
                altitude: 10000,
                color: '#2563eb',
              },
            ],
          }),
        }),
      );
    });

    expect(result.current.planes).toEqual([
      {
        id: 'plane-1',
        latitude: 13.7563,
        longitude: 100.5018,
        altitude: 10000,
        color: '#2563eb',
        heading: null,
      },
    ]);
    expect(result.current.status).toBe('connected');

    act(() => {
      socket.emit('message', new MessageEvent('message', { data: '{invalid-json' }));
    });

    expect(result.current.error).toBe('Received malformed planes JSON.');
    expect(result.current.planes).toHaveLength(1);

    unmount();

    expect(socket.close).toHaveBeenCalledOnce();
  });

  it('uses five linear fast retries before periodic health probes', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlanesSocket());
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

  it('returns to normal operation after a health probe and restarts fast recovery on a later close', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlanesSocket());
    closeSocket(MockWebSocket.instances[0]);

    [1_000, 2_000, 3_000, 4_000, 5_000].forEach((delay, index) => {
      runNextRetry(delay);
      closeSocket(MockWebSocket.instances[index + 1]);
    });

    runNextRetry(10_000);
    const healthSocket = MockWebSocket.instances[6];
    act(() => healthSocket.emit('open', new Event('open')));
    emitValidPlanesMessage(healthSocket);

    expect(result.current.status).toBe('connected');

    closeSocket(healthSocket);
    expect(result.current.status).toBe('connecting');
    runNextRetry(1_000);
    expect(MockWebSocket.instances).toHaveLength(8);

    unmount();
  });

  it('lets close own transport recovery after an error', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlanesSocket());
    const socket = MockWebSocket.instances[0];

    act(() => socket.emit('error', new Event('error')));
    expect(result.current.error).toBe('The planes WebSocket connection encountered an error.');

    closeSocket(socket);
    runNextRetry(1_000);
    expect(MockWebSocket.instances).toHaveLength(2);

    unmount();
  });

  it('closes a stale feed after five seconds and lets close schedule one recovery', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlanesSocket());
    const socket = MockWebSocket.instances[0];
    emitValidPlanesMessage(socket);

    runNextRetry(4_000);
    emitValidPlanesMessage(socket);
    runNextRetry(4_999);
    expect(socket.close).not.toHaveBeenCalled();

    runNextRetry(1);
    expect(socket.close).toHaveBeenCalledOnce();

    closeSocket(socket);
    runNextRetry(1_000);
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(result.current.status).toBe('connecting');

    unmount();
  });

  it('keeps waiting after open until a valid snapshot arrives, then resets recovery', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlanesSocket());
    const firstSocket = MockWebSocket.instances[0];
    act(() => firstSocket.emit('open', new Event('open')));

    expect(result.current.status).toBe('connecting');
    runNextRetry(5_000);
    expect(firstSocket.close).toHaveBeenCalledOnce();
    closeSocket(firstSocket);

    runNextRetry(1_000);
    const retrySocket = MockWebSocket.instances[1];
    act(() => retrySocket.emit('open', new Event('open')));
    runNextRetry(5_000);
    closeSocket(retrySocket);

    // No valid snapshot arrived on either socket, so the second fast retry still waits two seconds.
    runNextRetry(1_999);
    expect(MockWebSocket.instances).toHaveLength(2);
    runNextRetry(1);
    const liveSocket = MockWebSocket.instances[2];
    act(() => liveSocket.emit('open', new Event('open')));
    emitValidPlanesMessage(liveSocket);

    expect(result.current.status).toBe('connected');

    unmount();
  });

  it('does not treat invalid messages as feed activity', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { unmount } = renderHook(() => usePlanesSocket());
    const socket = MockWebSocket.instances[0];
    emitValidPlanesMessage(socket);
    runNextRetry(4_000);

    act(() => socket.emit('message', new MessageEvent('message', { data: '{invalid-json' })));
    runNextRetry(1_000);

    expect(socket.close).toHaveBeenCalledOnce();
    unmount();
  });

  it('cancels the stale watchdog when the browser goes offline or the hook unmounts', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const firstHook = renderHook(() => usePlanesSocket());
    const offlineSocket = MockWebSocket.instances[0];
    emitValidPlanesMessage(offlineSocket);

    act(() => window.dispatchEvent(new Event('offline')));
    runNextRetry(5_000);
    expect(offlineSocket.close).toHaveBeenCalledOnce();
    firstHook.unmount();

    const secondHook = renderHook(() => usePlanesSocket());
    const cleanupSocket = MockWebSocket.instances[1];
    emitValidPlanesMessage(cleanupSocket);
    secondHook.unmount();
    runNextRetry(5_000);

    expect(cleanupSocket.close).toHaveBeenCalledOnce();
  });

  it('routes synchronous constructor failures through recovery', async () => {
    vi.useFakeTimers();
    MockWebSocket.constructorFailuresRemaining = 1;
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlanesSocket());
    await flushMicrotasks();

    expect(result.current.status).toBe('connecting');
    expect(result.current.error).toBe('Unable to create the planes WebSocket connection.');

    runNextRetry(1_000);
    expect(MockWebSocket.instances).toHaveLength(1);

    unmount();
  });

  it('uses online to accelerate health recovery without restarting fast retries', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlanesSocket());
    closeSocket(MockWebSocket.instances[0]);

    [1_000, 2_000, 3_000, 4_000, 5_000].forEach((delay, index) => {
      runNextRetry(delay);
      closeSocket(MockWebSocket.instances[index + 1]);
    });

    expect(result.current.status).toBe('disconnected');
    act(() => window.dispatchEvent(new Event('online')));
    expect(MockWebSocket.instances).toHaveLength(7);

    closeSocket(MockWebSocket.instances[6]);
    runNextRetry(9_999);
    expect(MockWebSocket.instances).toHaveLength(7);
    runNextRetry(1);
    expect(MockWebSocket.instances).toHaveLength(8);
    expect(result.current.status).toBe('disconnected');

    unmount();
  });

  it('cancels recovery on cleanup and ignores events from the old socket', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, unmount } = renderHook(() => usePlanesSocket());
    const socket = MockWebSocket.instances[0];
    closeSocket(socket);
    unmount();

    act(() => {
      socket.emit('open', new Event('open'));
      socket.emit('error', new Event('error'));
      socket.emit('close', new Event('close'));
      vi.advanceTimersByTime(20_000);
    });

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(result.current.status).toBe('connecting');
  });
});
