import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TrackedPlane } from '@/data/planes/types';

const mocks = vi.hoisted(() => ({
  markerProps: vi.fn(),
  tooltipProps: vi.fn(),
  markerApis: [] as Array<{
    getElement: () => HTMLElement | null;
    getLatLng: () => { lat: number; lng: number };
    setLatLng: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('react-leaflet', () => ({
  Marker: forwardRef(function Marker(
    props: {
      bubblingMouseEvents?: boolean;
      eventHandlers: {
        click: (event: { originalEvent: MouseEvent }) => void;
        keydown?: (event: { originalEvent: KeyboardEvent }) => void;
      };
      children?: ReactNode;
      position: [number, number];
    },
    ref,
  ) {
    const markerElementRef = useRef<HTMLDivElement>(null);
    const markerPositionRef = useRef({ lat: props.position[0], lng: props.position[1] });
    const markerApiRef = useRef({
      getElement: () => markerElementRef.current,
      getLatLng: () => markerPositionRef.current,
      setLatLng: vi.fn((position: [number, number]) => {
        markerPositionRef.current = { lat: position[0], lng: position[1] };
      }),
    });

    mocks.markerProps(props);
    if (!mocks.markerApis.includes(markerApiRef.current)) {
      mocks.markerApis.push(markerApiRef.current);
    }
    useImperativeHandle(ref, () => markerApiRef.current, []);

    return (
      <div
        className="plane-marker-icon"
        onClick={(event) => props.eventHandlers.click({ originalEvent: event.nativeEvent })}
        onKeyDown={(event) => props.eventHandlers.keydown?.({ originalEvent: event.nativeEvent })}
        ref={markerElementRef}
        role="button"
        tabIndex={0}
      >
        <span className="plane-marker-visual">
          Plane marker
          <svg />
        </span>
        {props.children}
      </div>
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
  mocks.markerApis.length = 0;
  vi.unstubAllGlobals();
});

describe('PlaneMarker', () => {
  it('selects with one click without bubbling the click to the map', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<PlaneMarker isSelected={false} markerSize={28} onSelect={onSelect} plane={plane} />);

    expect(mocks.markerProps).toHaveBeenLastCalledWith(expect.objectContaining({ bubblingMouseEvents: false }));

    await user.click(screen.getByRole('button', { name: 'Select flight plane-1' }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('plane-1');
  });

  it('releases pointer focus without removing keyboard focus', async () => {
    const user = userEvent.setup();
    render(<PlaneMarker isSelected={false} markerSize={28} onSelect={vi.fn()} plane={plane} />);

    const marker = screen.getByRole('button', { name: 'Select flight plane-1' });

    await user.click(marker);
    expect(marker).not.toHaveFocus();

    marker.focus();
    fireEvent.click(marker, { detail: 0 });
    expect(marker).toHaveFocus();
  });

  it('selects from keyboard with Enter or Space and prevents Space scrolling', () => {
    const onSelect = vi.fn();
    render(<PlaneMarker isSelected={false} markerSize={28} onSelect={onSelect} plane={plane} />);

    const marker = screen.getByRole('button', { name: 'Select flight plane-1' });

    expect(fireEvent.keyDown(marker, { key: 'Enter' })).toBe(false);
    expect(fireEvent.keyDown(marker, { key: ' ' })).toBe(false);
    expect(onSelect).toHaveBeenNthCalledWith(1, 'plane-1', true);
    expect(onSelect).toHaveBeenNthCalledWith(2, 'plane-1', true);
  });

  it('keeps the DivIcon stable and updates only the existing visual when heading changes', () => {
    const { rerender } = render(<PlaneMarker isSelected={false} markerSize={23} onSelect={vi.fn()} plane={plane} />);
    const initialIcon = mocks.markerProps.mock.lastCall?.[0].icon;
    const markerVisual = screen.getByText('Plane marker');

    expect(markerVisual).toHaveStyle({ color: '#2563eb', transform: 'rotate(45deg)' });
    expect(markerVisual.querySelector('svg')).toHaveAttribute('width', '23');

    rerender(<PlaneMarker isSelected={false} markerSize={18} onSelect={vi.fn()} plane={{ ...plane, heading: 180 }} />);

    expect(mocks.markerProps.mock.lastCall?.[0].icon).toBe(initialIcon);
    expect(screen.getByText('Plane marker')).toBe(markerVisual);
    expect(markerVisual).toHaveStyle({ color: '#2563eb', transform: 'rotate(135deg)' });
    expect(markerVisual.querySelector('svg')).toHaveAttribute('width', '18');
  });

  it('toggles the selected class on the existing Leaflet marker element', () => {
    const { rerender } = render(<PlaneMarker isSelected={false} markerSize={28} onSelect={vi.fn()} plane={plane} />);
    const marker = screen.getByRole('button', { name: 'Select flight plane-1' });
    const initialIcon = mocks.markerProps.mock.lastCall?.[0].icon;

    expect(marker).not.toHaveClass('plane-marker-icon-selected');

    rerender(<PlaneMarker isSelected markerSize={28} onSelect={vi.fn()} plane={plane} />);

    expect(marker).toHaveClass('plane-marker-icon-selected');
    expect(mocks.markerProps.mock.lastCall?.[0].icon).toBe(initialIcon);

    rerender(<PlaneMarker isSelected={false} markerSize={28} onSelect={vi.fn()} plane={plane} />);

    expect(marker).not.toHaveClass('plane-marker-icon-selected');
  });

  it('interpolates a new position with Leaflet without animating the initial render', () => {
    let nextAnimationFrame = 0;
    const animationFrames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        nextAnimationFrame += 1;
        animationFrames.set(nextAnimationFrame, callback);

        return nextAnimationFrame;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((frame: number) => animationFrames.delete(frame)),
    );

    const { rerender } = render(<PlaneMarker isSelected={false} markerSize={28} onSelect={vi.fn()} plane={plane} />);
    const marker = mocks.markerApis[0];
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    rerender(<PlaneMarker isSelected={false} markerSize={28} onSelect={vi.fn()} plane={{ ...plane, latitude: 14, longitude: 101 }} />);

    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    animationFrames.get(1)?.(0);
    animationFrames.get(2)?.(425);

    expect(marker.setLatLng).toHaveBeenCalledTimes(2);
    expect(marker.getLatLng().lat).toBeGreaterThan(plane.latitude);
    expect(marker.getLatLng().lat).toBeLessThan(14);
  });

  it('cancels a pending frame when the target changes or the marker unmounts', () => {
    let nextAnimationFrame = 0;
    const animationFrames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        nextAnimationFrame += 1;
        animationFrames.set(nextAnimationFrame, callback);

        return nextAnimationFrame;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((frame: number) => animationFrames.delete(frame)),
    );

    const { rerender, unmount } = render(<PlaneMarker isSelected={false} markerSize={28} onSelect={vi.fn()} plane={plane} />);
    rerender(<PlaneMarker isSelected={false} markerSize={28} onSelect={vi.fn()} plane={{ ...plane, latitude: 14, longitude: 101 }} />);

    rerender(<PlaneMarker isSelected={false} markerSize={28} onSelect={vi.fn()} plane={{ ...plane, latitude: 15, longitude: 102 }} />);

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(2);
  });

  it('renders the plane ID in the marker tooltip', () => {
    render(<PlaneMarker isSelected={false} markerSize={28} onSelect={vi.fn()} plane={plane} />);

    expect(screen.getByText('plane-1')).toBeInTheDocument();
    expect(mocks.tooltipProps).toHaveBeenLastCalledWith({ direction: 'top', offset: [0, -14] });
  });
});
