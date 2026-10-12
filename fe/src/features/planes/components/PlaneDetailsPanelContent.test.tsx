import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { PlaneDetailed } from '@/data/planes/types';

import { PlaneDetailsPanelContent } from './PlaneDetailsPanelContent';

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

afterEach(cleanup);

describe('PlaneDetailsPanelContent', () => {
  it('renders the flight details when data is ready', () => {
    render(<PlaneDetailsPanelContent state={{ plane, status: 'ready' }} />);

    expect(screen.getByRole('heading', { name: 'Route' })).toBeInTheDocument();
    expect(screen.getByText('BKK')).toBeInTheDocument();
    expect(screen.getByText('SIN')).toBeInTheDocument();
  });

  it('renders loading placeholders while details are being fetched', () => {
    render(<PlaneDetailsPanelContent state={{ status: 'loading' }} />);

    expect(screen.getByRole('status', { name: 'Loading flight details' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Loading route' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Route' })).not.toBeInTheDocument();
  });

  it('renders the recoverable error state', () => {
    render(<PlaneDetailsPanelContent state={{ status: 'error' }} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load flight details');
    expect(screen.getByRole('alert')).toHaveTextContent('Select the aircraft again to retry.');
  });

  it('renders the reconnect guidance after disconnection', () => {
    render(<PlaneDetailsPanelContent state={{ status: 'disconnected' }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Flight details disconnected');
    expect(screen.getByRole('status')).toHaveTextContent('Select the aircraft again to reconnect.');
  });
});
