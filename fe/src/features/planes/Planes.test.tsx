import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlaneDetailed, TrackedPlane } from '@/data/planes/types';

const mocks = vi.hoisted(() => ({
  detailsSelections: [] as Array<string | null>,
}));

const planes: TrackedPlane[] = [
  { id: 'plane-1', latitude: 1, longitude: 1, altitude: 1_000, color: '#111111', heading: 0 },
  { id: 'plane-2', latitude: 2, longitude: 2, altitude: 2_000, color: '#222222', heading: 90 },
];

function detailedPlane(id: string): PlaneDetailed {
  return {
    id,
    model: 'Airbus A320',
    airline: 'Example Air',
    flightNumber: id === 'plane-1' ? 'EA101' : 'EA202',
    registration: 'N123EA',
    latitude: 1,
    longitude: 1,
    altitude: 10_000,
    speed: 250,
    heading: 90,
    verticalSpeed: 0,
    origin: { airport: 'BKK', city: 'Bangkok' },
    destination: { airport: 'SIN', city: 'Singapore' },
    flightDuration: 120,
    estimatedArrival: 1_800_000_000_000,
    numberOfPassengers: 120,
    maxPassengers: 180,
    status: 'cruising',
    color: '#111111',
  };
}

vi.mock('@/ui/FlightMap', () => ({
  FlightMap: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

vi.mock('@/data/planes/usePlanesSocket', () => ({
  usePlanesSocket: () => ({ planes, status: 'connected', error: null }),
}));

vi.mock('@/data/planes/usePlaneDetailsSocket', () => ({
  usePlaneDetailsSocket: (selectedPlaneId: string | null) => {
    mocks.detailsSelections.push(selectedPlaneId);

    return {
      plane: selectedPlaneId ? detailedPlane(selectedPlaneId) : null,
      status: selectedPlaneId ? 'connected' : 'disconnected',
      error: null,
    };
  },
}));

vi.mock('./components/PlaneMarker', () => ({
  PlaneMarker: ({ onSelect, plane }: { onSelect: (planeId: string) => void; plane: TrackedPlane }) => (
    <button onClick={() => onSelect(plane.id)} type="button">
      Select {plane.id}
    </button>
  ),
}));

vi.mock('./components/PlaneMarkers', () => ({
  PlaneMarkers: ({ onPlaneSelect, planes }: { onPlaneSelect: (planeId: string) => void; planes: TrackedPlane[] }) => (
    <>
      {planes.map((plane) => (
        <button key={plane.id} onClick={() => onPlaneSelect(plane.id)} type="button">
          Select {plane.id}
        </button>
      ))}
    </>
  ),
}));

vi.mock('./components/MapClickHandler', () => ({
  MapClickHandler: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} type="button">
      Empty map
    </button>
  ),
}));

vi.mock('./components/PlaneDetailsPanel', () => ({
  PlaneDetailsPanel: ({ isOpen, plane }: { isOpen: boolean; plane: PlaneDetailed | null }) => (
    <output data-testid="panel-state">{isOpen ? plane?.id : 'closed'}</output>
  ),
}));

import { Planes } from './Planes';

afterEach(() => {
  cleanup();
  mocks.detailsSelections.length = 0;
});

describe('Planes selection', () => {
  it('opens on the first marker click and changes A → B without an intermediate null selection', async () => {
    const user = userEvent.setup();
    render(<Planes />);

    expect(screen.getByTestId('panel-state')).toHaveTextContent('closed');
    expect(screen.getByText('Live data')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Select plane-1' }));
    expect(screen.getByTestId('panel-state')).toHaveTextContent('plane-1');

    const selectionsBeforeSwitch = mocks.detailsSelections.length;
    await user.click(screen.getByRole('button', { name: 'Select plane-2' }));

    expect(screen.getByTestId('panel-state')).toHaveTextContent('plane-2');
    expect(mocks.detailsSelections.slice(selectionsBeforeSwitch)).not.toContain(null);
  });

  it('closes from the map and reopens on another marker with one click', async () => {
    const user = userEvent.setup();
    render(<Planes />);

    await user.click(screen.getByRole('button', { name: 'Select plane-1' }));
    await user.click(screen.getByRole('button', { name: 'Empty map' }));
    expect(screen.getByTestId('panel-state')).toHaveTextContent('closed');

    await user.click(screen.getByRole('button', { name: 'Select plane-2' }));
    expect(screen.getByTestId('panel-state')).toHaveTextContent('plane-2');
  });
});
