import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePlanesSocket } from './usePlanesSocket';

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readonly close = vi.fn();
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

    this.listeners.set(
      type,
      listeners.filter((registeredListener) => registeredListener !== listener),
    );
  }

  emit(type: string, event: Event): void {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

afterEach(() => {
  MockWebSocket.instances = [];
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

    expect(result.current.status).toBe('connected');

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
      },
    ]);

    act(() => {
      socket.emit('message', new MessageEvent('message', { data: '{invalid-json' }));
    });

    expect(result.current.error).toBe('Received malformed planes JSON.');
    expect(result.current.planes).toHaveLength(1);

    unmount();

    expect(socket.close).toHaveBeenCalledOnce();
  });
});
