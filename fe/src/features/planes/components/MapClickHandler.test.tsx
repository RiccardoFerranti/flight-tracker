import { cleanup, render } from '@testing-library/react';
import type { LeafletMouseEvent } from 'leaflet';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ mapEvents: vi.fn() }));

vi.mock('react-leaflet', () => ({
  useMapEvents: mocks.mapEvents,
}));

import { MapClickHandler } from './MapClickHandler';

afterEach(() => {
  cleanup();
  mocks.mapEvents.mockClear();
});

function registeredClickHandler() {
  return mocks.mapEvents.mock.lastCall?.[0].click as (event: LeafletMouseEvent) => void;
}

describe('MapClickHandler', () => {
  it('deselects only for a click originating from the map background', () => {
    const onClick = vi.fn();
    render(<MapClickHandler onClick={onClick} />);

    const mapBackground = document.createElement('div');
    registeredClickHandler()({ originalEvent: { target: mapBackground } } as unknown as LeafletMouseEvent);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not race marker selection when the map observes a marker-originated click', () => {
    const onClick = vi.fn();
    render(<MapClickHandler onClick={onClick} />);

    const marker = document.createElement('div');
    marker.className = 'plane-marker-icon';
    const markerGraphic = document.createElement('span');
    marker.append(markerGraphic);

    registeredClickHandler()({ originalEvent: { target: markerGraphic } } as unknown as LeafletMouseEvent);

    expect(onClick).not.toHaveBeenCalled();
  });
});
