import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TrackedPlane } from '@/data/planes/types';

const mocks = vi.hoisted(() => ({ markerProps: vi.fn() }));

vi.mock('react-leaflet', () => ({
  Marker: (props: {
    bubblingMouseEvents?: boolean;
    eventHandlers: { click: (event: { originalEvent: MouseEvent }) => void };
  }) => {
    mocks.markerProps(props);

    return (
      <button
        className="plane-marker-icon"
        onClick={(event) => props.eventHandlers.click({ originalEvent: event.nativeEvent })}
        type="button"
      >
        Plane marker
      </button>
    );
  },
}));

import { PlaneMarker } from './PlaneMarker';

const plane: TrackedPlane = {
  id: 'plane-1',
  latitude: 13.7563,
  longitude: 100.5018,
  altitude: 10_000,
  color: '#2563eb',
  heading: 90,
};

afterEach(() => {
  cleanup();
  mocks.markerProps.mockClear();
});

describe('PlaneMarker', () => {
  it('selects with one click without bubbling the click to the map', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<PlaneMarker onSelect={onSelect} plane={plane} />);

    expect(mocks.markerProps).toHaveBeenLastCalledWith(expect.objectContaining({ bubblingMouseEvents: false }));

    await user.click(screen.getByRole('button', { name: 'Plane marker' }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('plane-1');
  });

  it('releases pointer focus without removing keyboard focus', async () => {
    const user = userEvent.setup();
    render(<PlaneMarker onSelect={vi.fn()} plane={plane} />);

    const marker = screen.getByRole('button', { name: 'Plane marker' });

    await user.click(marker);
    expect(marker).not.toHaveFocus();

    marker.focus();
    fireEvent.click(marker, { detail: 0 });
    expect(marker).toHaveFocus();
  });
});
