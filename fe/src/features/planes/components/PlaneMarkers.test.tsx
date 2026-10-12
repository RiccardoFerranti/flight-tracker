import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TrackedPlane } from '@/data/planes/types';

const mocks = vi.hoisted(() => ({
  onZoomEnd: undefined as (() => void) | undefined,
  planeMarkerProps: vi.fn(),
  zoom: 3,
}));

vi.mock('react-leaflet', () => ({
  useMap: () => ({ getZoom: () => mocks.zoom }),
  useMapEvent: (event: string, callback: () => void) => {
    if (event === 'zoomend') mocks.onZoomEnd = callback;
  },
}));

vi.mock('./PlaneMarker', () => ({
  PlaneMarker: ({ plane, ...props }: { plane: TrackedPlane; markerSize: number; onSelect: (id: string) => void }) => {
    mocks.planeMarkerProps({ plane, ...props });
    return <output>{plane.id}</output>;
  },
}));

import { PlaneMarkers } from './PlaneMarkers';

const planes: TrackedPlane[] = [
  { altitude: 1_000, color: '#111111', heading: 0, id: 'plane-1', latitude: 1, longitude: 2 },
  { altitude: 2_000, color: '#222222', heading: 90, id: 'plane-2', latitude: 3, longitude: 4 },
];

afterEach(() => {
  cleanup();
  mocks.onZoomEnd = undefined;
  mocks.planeMarkerProps.mockClear();
  mocks.zoom = 3;
});

describe('PlaneMarkers', () => {
  it('renders every tracked plane with a size derived from the initial map zoom', () => {
    render(<PlaneMarkers onPlaneSelect={vi.fn()} planes={planes} />);

    expect(screen.getByText('plane-1')).toBeInTheDocument();
    expect(screen.getByText('plane-2')).toBeInTheDocument();
    expect(mocks.planeMarkerProps).toHaveBeenCalledTimes(2);
    expect(mocks.planeMarkerProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ markerSize: 18, plane: planes[1] }),
    );
  });

  it('updates marker size after a zoom crosses a size threshold', () => {
    render(<PlaneMarkers onPlaneSelect={vi.fn()} planes={planes} />);

    act(() => {
      mocks.zoom = 7;
      mocks.onZoomEnd?.();
    });

    expect(mocks.planeMarkerProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ markerSize: 28, plane: planes[1] }),
    );
  });
});
