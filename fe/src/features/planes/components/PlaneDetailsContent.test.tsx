import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { PlaneDetailed } from '@/data/planes/types';

import { PlaneDetailsContent } from './PlaneDetailsContent';

const plane: PlaneDetailed = {
  altitude: 10_000,
  airline: 'Example Air',
  color: '#2563eb',
  destination: { airport: 'SIN', city: 'Singapore' },
  estimatedArrival: Number.NaN,
  flightDuration: 125,
  flightNumber: 'EA123',
  heading: 90,
  id: 'plane-1',
  latitude: -13.7563,
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

describe('PlaneDetailsContent', () => {
  it('presents route, aircraft, and live values in accessible sections', () => {
    render(<PlaneDetailsContent plane={plane} />);

    expect(screen.getByRole('heading', { name: 'Route' })).toBeInTheDocument();
    expect(screen.getByText('BKK')).toBeInTheDocument();
    expect(screen.getByText('Bangkok')).toBeInTheDocument();
    expect(screen.getByText('SIN')).toBeInTheDocument();
    expect(screen.getByText('Singapore')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText('2h 5m')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Aircraft' })).toBeInTheDocument();
    expect(screen.getByText('Airbus A320')).toBeInTheDocument();
    expect(screen.getByText('N123EA')).toBeInTheDocument();
    expect(screen.getByText('120 / 180 passengers')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Live data' })).toBeInTheDocument();
    expect(screen.getByText('32,808 ft')).toBeInTheDocument();
    expect(screen.getByText('486 kt')).toBeInTheDocument();
    expect(screen.getByText('−394 ft/min')).toBeInTheDocument();
    expect(screen.getByText('13.7563° S')).toBeInTheDocument();
    expect(screen.getByText('100.5018° E')).toBeInTheDocument();
  });
});
