import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlaneDetailed } from '@/data/planes/types';

const mocks = vi.hoisted(() => ({
  detailsSocket: vi.fn(),
  panel: vi.fn(),
}));

vi.mock('@/data/planes/usePlaneDetailsSocket', () => ({
  usePlaneDetailsSocket: mocks.detailsSocket,
}));

vi.mock('./PlaneDetailsPanel', () => ({
  PlaneDetailsPanel: (props: unknown) => {
    mocks.panel(props);
    return null;
  },
}));

import { SelectedPlaneDetails } from './SelectedPlaneDetails';

const plane: PlaneDetailed = {
  altitude: 10_000,
  airline: 'Example Air',
  color: '#2563eb',
  destination: { airport: 'SIN', city: 'Singapore' },
  estimatedArrival: 1_800_000_000_000,
  flightDuration: 125,
  flightNumber: 'EA123',
  heading: 90,
  id: 'plane-1',
  latitude: 13.7563,
  longitude: 100.5018,
  maxPassengers: 180,
  model: 'Airbus A320',
  numberOfPassengers: 120,
  origin: { airport: 'BKK', city: 'Bangkok' },
  registration: 'N123EA',
  speed: 250,
  status: 'cruising',
  verticalSpeed: -2,
};

afterEach(() => {
  cleanup();
  mocks.detailsSocket.mockReset();
  mocks.panel.mockClear();
});

describe('SelectedPlaneDetails', () => {
  it('connects the selected plane ID and live details to the open panel', () => {
    const onClose = vi.fn();
    mocks.detailsSocket.mockReturnValue({ error: null, plane, status: 'connected' });

    render(<SelectedPlaneDetails onClose={onClose} selectedPlaneId="plane-1" />);

    expect(mocks.detailsSocket).toHaveBeenCalledWith('plane-1');
    expect(mocks.panel).toHaveBeenCalledWith({
      error: null,
      focusRequest: null,
      isOpen: true,
      onClose,
      plane,
      status: 'connected',
    });
  });

  it('keeps the panel mounted but closed when no plane is selected', () => {
    const onClose = vi.fn();
    mocks.detailsSocket.mockReturnValue({ error: null, plane: null, status: 'disconnected' });

    render(<SelectedPlaneDetails onClose={onClose} selectedPlaneId={null} />);

    expect(mocks.detailsSocket).toHaveBeenCalledWith(null);
    expect(mocks.panel).toHaveBeenCalledWith({
      error: null,
      focusRequest: null,
      isOpen: false,
      onClose,
      plane: null,
      status: 'disconnected',
    });
  });
});
