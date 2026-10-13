import { act, renderHook } from '@testing-library/react';
import type { Marker as LeafletMarker } from 'leaflet';
import type { RefObject } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useInterpolatedMarkerPosition } from './useInterpolatedMarkerPosition';

function createMarker(latitude: number, longitude: number) {
  let position = { lat: latitude, lng: longitude };

  return {
    getLatLng: vi.fn(() => position),
    setLatLng: vi.fn(([lat, lng]: [number, number]) => {
      position = { lat, lng };
    }),
  } as unknown as LeafletMarker;
}

function stubAnimationFrames() {
  let nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();

  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      nextFrame += 1;
      frames.set(nextFrame, callback);

      return nextFrame;
    }),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn((frame: number) => frames.delete(frame)));

  return frames;
}

function stubMonotonicClock(initialTime = 0) {
  let currentTime = initialTime;

  vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

  return {
    advanceBy: (milliseconds: number) => {
      currentTime += milliseconds;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useInterpolatedMarkerPosition', () => {
  it('does not animate the initial position or an unchanged update', () => {
    const marker = createMarker(13.7563, 100.5018);
    const markerRef = { current: marker } as RefObject<LeafletMarker | null>;
    stubAnimationFrames();
    const { rerender } = renderHook(({ latitude, longitude }) => useInterpolatedMarkerPosition(markerRef, latitude, longitude), {
      initialProps: { latitude: 13.7563, longitude: 100.5018 },
    });

    expect(requestAnimationFrame).not.toHaveBeenCalled();

    rerender({ latitude: 13.7563, longitude: 100.5018 });

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(marker.setLatLng).not.toHaveBeenCalled();
  });

  it('interpolates from the current position and finishes exactly at the new position', () => {
    const marker = createMarker(10, 20);
    const markerRef = { current: marker } as RefObject<LeafletMarker | null>;
    const frames = stubAnimationFrames();
    const clock = stubMonotonicClock();
    const { rerender } = renderHook(({ latitude, longitude }) => useInterpolatedMarkerPosition(markerRef, latitude, longitude), {
      initialProps: { latitude: 10, longitude: 20 },
    });

    clock.advanceBy(1_000);
    rerender({ latitude: 14, longitude: 24 });
    act(() => frames.get(1)?.(100));
    act(() => frames.get(2)?.(525));
    act(() => frames.get(3)?.(950));

    expect(marker.setLatLng).toHaveBeenNthCalledWith(1, [10, 20]);
    expect(marker.setLatLng).toHaveBeenNthCalledWith(2, [12, 22]);
    expect(marker.setLatLng).toHaveBeenLastCalledWith([14, 24]);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(3);
  });

  it('snaps after a gap longer than three seconds, then resumes interpolation', () => {
    const marker = createMarker(10, 20);
    const markerRef = { current: marker } as RefObject<LeafletMarker | null>;
    stubAnimationFrames();
    const clock = stubMonotonicClock();
    const { rerender } = renderHook(({ latitude, longitude }) => useInterpolatedMarkerPosition(markerRef, latitude, longitude), {
      initialProps: { latitude: 10, longitude: 20 },
    });

    clock.advanceBy(3_001);
    rerender({ latitude: 14, longitude: 24 });

    expect(marker.setLatLng).toHaveBeenCalledWith([14, 24]);
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    clock.advanceBy(1_000);
    rerender({ latitude: 15, longitude: 25 });

    expect(requestAnimationFrame).toHaveBeenCalledOnce();
  });

  it('snaps a target received while the document is hidden', () => {
    const marker = createMarker(10, 20);
    const markerRef = { current: marker } as RefObject<LeafletMarker | null>;
    stubAnimationFrames();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    const { rerender } = renderHook(({ latitude, longitude }) => useInterpolatedMarkerPosition(markerRef, latitude, longitude), {
      initialProps: { latitude: 10, longitude: 20 },
    });

    rerender({ latitude: 14, longitude: 24 });

    expect(marker.setLatLng).toHaveBeenCalledWith([14, 24]);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('cancels a pending frame when the target changes and on unmount', () => {
    const marker = createMarker(10, 20);
    const markerRef = { current: marker } as RefObject<LeafletMarker | null>;
    stubAnimationFrames();
    const { rerender, unmount } = renderHook(
      ({ latitude, longitude }) => useInterpolatedMarkerPosition(markerRef, latitude, longitude),
      { initialProps: { latitude: 10, longitude: 20 } },
    );

    rerender({ latitude: 14, longitude: 24 });
    rerender({ latitude: 15, longitude: 25 });

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(2);
  });
});
