import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePlaneDetailsSocket } from './usePlaneDetailsSocket';

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readonly close = vi.fn();
  readonly send = vi.fn();
  readonly url: string;
  private readonly listeners = new Map<string, EventListener[]>();

  constructor(url: string) {
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

    this.listeners.set(type, listeners.filter((registeredListener) => registeredListener !== listener));
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

afterEach(() => {
  MockWebSocket.instances = [];
  vi.unstubAllGlobals();
});

describe('usePlaneDetailsSocket', () => {
  it('does not open a connection without a selected plane', () => {
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result } = renderHook(() => usePlaneDetailsSocket(null));

    expect(MockWebSocket.instances).toHaveLength(0);
    expect(result.current).toEqual({ plane: null, status: 'disconnected', error: null });
  });

  it('subscribes on open and stores validated details', () => {
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    const socket = MockWebSocket.instances[0];

    expect(socket.url).toBe(import.meta.env.VITE_PLANE_DETAILS_WS_URL);
    expect(result.current.status).toBe('connecting');

    act(() => socket.emit('open', new Event('open')));

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'subscribe', planeId: 'plane-1' }));
    expect(result.current.status).toBe('connected');

    act(() => {
      socket.emit(
        'message',
        new MessageEvent('message', { data: JSON.stringify({ type: 'plane-details', data: planeDetails }) }),
      );
    });

    expect(result.current.plane).toEqual(planeDetails);
    expect(result.current.error).toBeNull();
  });

  it('keeps valid details intact for invalid messages and reports application errors', () => {
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result } = renderHook(() => usePlaneDetailsSocket('plane-1'));
    const socket = MockWebSocket.instances[0];

    act(() => {
      socket.emit('message', new MessageEvent('message', { data: JSON.stringify({ type: 'plane-details', data: planeDetails }) }));
    });

    act(() => socket.emit('message', new MessageEvent('message', { data: '{invalid-json' })));
    expect(result.current.error).toBe('Received malformed plane details JSON.');
    expect(result.current.plane).toEqual(planeDetails);

    act(() => socket.emit('message', new MessageEvent('message', { data: JSON.stringify({ type: 'error', message: 'Unknown plane' }) })));
    expect(result.current.error).toBe('Unknown plane');
    expect(result.current.status).toBe('error');
    expect(result.current.plane).toEqual(planeDetails);
  });

  it('replaces and closes connections as the selection changes or clears', () => {
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result, rerender, unmount } = renderHook(({ planeId }) => usePlaneDetailsSocket(planeId), {
      initialProps: { planeId: 'plane-1' as string | null },
    });
    const firstSocket = MockWebSocket.instances[0];

    rerender({ planeId: 'plane-2' });
    const secondSocket = MockWebSocket.instances[1];

    expect(firstSocket.close).toHaveBeenCalledOnce();
    expect(secondSocket.url).toBe(import.meta.env.VITE_PLANE_DETAILS_WS_URL);
    expect(result.current.plane).toBeNull();

    rerender({ planeId: null });

    expect(secondSocket.close).toHaveBeenCalledOnce();
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(result.current).toEqual({ plane: null, status: 'disconnected', error: null });

    unmount();
    expect(secondSocket.close).toHaveBeenCalledOnce();
  });
});
