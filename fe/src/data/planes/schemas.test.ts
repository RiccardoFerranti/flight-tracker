import { describe, expect, it } from 'vitest';

import { planeDetailsSocketMessageSchema, planesMessageSchema } from './schemas';

describe('planesMessageSchema', () => {
  it('accepts a valid basic planes payload', () => {
    const payload = {
      type: 'planes',
      data: [
        {
          id: 'plane-1',
          latitude: 13.7563,
          longitude: 100.5018,
          altitude: 10000,
          color: '#2563eb',
        },
      ],
    };

    expect(planesMessageSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects a payload with invalid basic plane data', () => {
    const payload = {
      type: 'planes',
      data: [
        {
          id: 'plane-1',
          latitude: '13.7563',
          longitude: 100.5018,
          altitude: 10000,
          color: '#2563eb',
        },
      ],
    };

    expect(planesMessageSchema.safeParse(payload).success).toBe(false);
  });
});

describe('planeDetailsSocketMessageSchema', () => {
  it('accepts a detailed plane payload and an application error', () => {
    const details = {
      type: 'plane-details',
      data: {
        id: 'plane-1', model: 'Airbus A320', airline: 'Example Air', flightNumber: 'EA123', registration: 'N123EA',
        latitude: 13.7563, longitude: 100.5018, altitude: 10_000, speed: 850, heading: 90, verticalSpeed: 0,
        origin: { airport: 'BKK', city: 'Bangkok' }, destination: { airport: 'SIN', city: 'Singapore' },
        flightDuration: 5_400_000, estimatedArrival: 1_800_000_000_000, numberOfPassengers: 120, maxPassengers: 180,
        status: 'cruising', color: '#2563eb',
      },
    };

    expect(planeDetailsSocketMessageSchema.safeParse(details).success).toBe(true);
    expect(planeDetailsSocketMessageSchema.safeParse({ type: 'error', message: 'Unknown plane' }).success).toBe(true);
  });

  it('rejects details with an invalid flight status', () => {
    expect(planeDetailsSocketMessageSchema.safeParse({ type: 'plane-details', data: { id: 'plane-1', status: 'delayed' } }).success).toBe(false);
  });
});
