import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TrackedPlane } from '@/data/planes/types';

const mocks = vi.hoisted(() => ({ markerProps: vi.fn(), tooltipProps: vi.fn() }));

vi.mock('react-leaflet', () => ({
  Marker: forwardRef(function Marker(
    props: {
      bubblingMouseEvents?: boolean;
      eventHandlers: { click: (event: { originalEvent: MouseEvent }) => void };
      children?: ReactNode;
    },
    ref,
  ) {
    const markerElementRef = useRef<HTMLButtonElement>(null);

    mocks.markerProps(props);
    useImperativeHandle(ref, () => ({ getElement: () => markerElementRef.current }), []);

    return (
      <button
        className="plane-marker-icon"
        onClick={(event) => props.eventHandlers.click({ originalEvent: event.nativeEvent })}
        ref={markerElementRef}
        type="button"
      >
        <span className="plane-marker-visual">
          Plane marker
          <svg />
        </span>
        {props.children}
      </button>
    );
  }),
  Tooltip: ({ children, ...props }: { children?: ReactNode; direction?: string; offset?: [number, number] }) => {
    mocks.tooltipProps(props);
    return <span aria-hidden="true">{children}</span>;
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
  mocks.tooltipProps.mockClear();
});

describe('PlaneMarker', () => {
  it('selects with one click without bubbling the click to the map', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<PlaneMarker markerSize={28} onSelect={onSelect} plane={plane} />);

    expect(mocks.markerProps).toHaveBeenLastCalledWith(expect.objectContaining({ bubblingMouseEvents: false }));

    await user.click(screen.getByRole('button', { name: 'Plane marker' }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('plane-1');
  });

  it('releases pointer focus without removing keyboard focus', async () => {
    const user = userEvent.setup();
    render(<PlaneMarker markerSize={28} onSelect={vi.fn()} plane={plane} />);

    const marker = screen.getByRole('button', { name: 'Plane marker' });

    await user.click(marker);
    expect(marker).not.toHaveFocus();

    marker.focus();
    fireEvent.click(marker, { detail: 0 });
    expect(marker).toHaveFocus();
  });

  it('keeps the DivIcon stable and updates only the existing visual when heading changes', () => {
    const { rerender } = render(
      <PlaneMarker markerSize={23} onSelect={vi.fn()} plane={plane} />,
    );
    const initialIcon = mocks.markerProps.mock.lastCall?.[0].icon;
    const markerVisual = screen.getByText('Plane marker');

    expect(markerVisual).toHaveStyle({ color: '#2563eb', transform: 'rotate(45deg)' });
    expect(markerVisual.querySelector('svg')).toHaveAttribute('width', '23');

    rerender(
      <PlaneMarker
        markerSize={18}
        onSelect={vi.fn()}
        plane={{ ...plane, heading: 180 }}
      />,
    );

    expect(mocks.markerProps.mock.lastCall?.[0].icon).toBe(initialIcon);
    expect(screen.getByText('Plane marker')).toBe(markerVisual);
    expect(markerVisual).toHaveStyle({ color: '#2563eb', transform: 'rotate(135deg)' });
    expect(markerVisual.querySelector('svg')).toHaveAttribute('width', '18');
  });

  it('renders the plane ID in the marker tooltip', () => {
    render(<PlaneMarker markerSize={28} onSelect={vi.fn()} plane={plane} />);

    expect(screen.getByText('plane-1')).toBeInTheDocument();
    expect(mocks.tooltipProps).toHaveBeenLastCalledWith({ direction: 'top', offset: [0, -14] });
  });
});
