import { describe, expect, it } from 'vitest';

import type { PlaneBasic, TrackedPlane } from './types';
import { calculateInitialBearing, reconcilePlanes } from './utils';

const previousPlane: TrackedPlane = {
  id: 'plane-1',
  latitude: 0,
  longitude: 0,
  altitude: 10_000,
  color: '#2563eb',
  heading: 45,
};

describe('calculateInitialBearing', () => {
  it.each([
    ['North', 1, 0, 0],
    ['East', 0, 1, 90],
    ['South', -1, 0, 180],
    ['West', 0, -1, 270],
  ])('calculates the bearing towards %s', (_direction, latitude, longitude, expectedBearing) => {
    expect(calculateInitialBearing(0, 0, latitude, longitude)).toBeCloseTo(expectedBearing, 6);
  });

  it('normalizes a negative raw bearing to the 0–360 degree range', () => {
    const bearing = calculateInitialBearing(0, 0, 0, -1);

    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeCloseTo(270, 6);
  });
});

describe('reconcilePlanes', () => {
  it('preserves the existing array and plane references for an unchanged snapshot', () => {
    const previousPlanes = [previousPlane];
    const incomingPlanes: PlaneBasic[] = [{ ...previousPlane }];

    const reconciledPlanes = reconcilePlanes(previousPlanes, incomingPlanes);

    expect(reconciledPlanes).toBe(previousPlanes);
    expect(reconciledPlanes[0]).toBe(previousPlane);
  });

  it('assigns null heading to a new plane', () => {
    const incomingPlane: PlaneBasic = { ...previousPlane, id: 'plane-2' };

    expect(reconcilePlanes([], [incomingPlane])[0]).toEqual({ ...incomingPlane, heading: null });
  });

  it('preserves heading when an existing plane remains in the same position', () => {
    const incomingPlane: PlaneBasic = { ...previousPlane, altitude: 11_000 };

    const reconciledPlane = reconcilePlanes([previousPlane], [incomingPlane])[0];

    expect(reconciledPlane).toEqual({ ...incomingPlane, heading: 45 });
    expect(reconciledPlane).not.toBe(previousPlane);
  });

  it('calculates heading when an existing plane moves', () => {
    const incomingPlane: PlaneBasic = { ...previousPlane, latitude: 1 };

    expect(reconcilePlanes([previousPlane], [incomingPlane])[0].heading).toBeCloseTo(0, 6);
  });
});
