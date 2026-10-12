import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  map: {
    getMinZoom: vi.fn(),
    getPixelWorldBounds: vi.fn(),
    getScaleZoom: vi.fn(),
    getSize: vi.fn(),
    setMinZoom: vi.fn(),
  },
  mapEvent: vi.fn(),
}));

vi.mock('react-leaflet', () => ({
  useMap: () => mocks.map,
  useMapEvent: mocks.mapEvent,
}));

import { MapViewportMinZoom } from './MapViewportMinZoom';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.map.getMinZoom.mockReturnValue(1);
  mocks.map.getSize.mockReturnValue({ x: 1024, y: 800 });
  mocks.map.getPixelWorldBounds.mockReturnValue({
    getSize: () => ({ x: 256, y: 256 }),
  });
  mocks.map.getScaleZoom.mockReturnValue(4.5);
});

afterEach(cleanup);

describe('MapViewportMinZoom', () => {
  it('sets a minimum zoom that covers the viewport without exposing three world copies', () => {
    render(<MapViewportMinZoom />);

    // Vertical coverage (800 / 256) is stricter than the two-world horizontal coverage (1024 / 512).
    expect(mocks.map.getScaleZoom).toHaveBeenCalledWith(3.125, 0);
    expect(mocks.map.setMinZoom).toHaveBeenNthCalledWith(1, 1);
    expect(mocks.map.setMinZoom).toHaveBeenNthCalledWith(2, 4.5);
  });

  it('recalculates from the base minimum zoom when the map viewport is resized', () => {
    render(<MapViewportMinZoom />);
    mocks.map.getSize.mockReturnValue({ x: 1600, y: 512 });
    mocks.map.getScaleZoom.mockReturnValue(5);

    const resizeHandler = mocks.mapEvent.mock.lastCall?.[1] as () => void;
    act(resizeHandler);

    // Horizontal coverage (1600 / 512) becomes the limiting dimension after resizing.
    expect(mocks.map.getScaleZoom).toHaveBeenLastCalledWith(3.125, 0);
    expect(mocks.map.setMinZoom).toHaveBeenNthCalledWith(3, 1);
    expect(mocks.map.setMinZoom).toHaveBeenNthCalledWith(4, 5);
  });
});
