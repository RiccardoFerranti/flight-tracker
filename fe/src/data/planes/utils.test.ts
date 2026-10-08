import { describe, expect, it } from 'vitest';

import type { PlaneBasic } from './types';
import { reconcilePlanes } from './utils';

const previousPlane: PlaneBasic = {
  id: 'plane-1',
  latitude: 13.7563,
  longitude: 100.5018,
  altitude: 10_000,
  color: '#2563eb',
};

describe('reconcilePlanes', () => {
  it('preserves the existing array and plane references for an unchanged snapshot', () => {
    const previousPlanes = [previousPlane];
    const incomingPlanes = [{ ...previousPlane }];

    const reconciledPlanes = reconcilePlanes(previousPlanes, incomingPlanes);

    expect(reconciledPlanes).toBe(previousPlanes);
    expect(reconciledPlanes[0]).toBe(previousPlane);
  });

  it('reuses only unchanged planes and accepts new planes', () => {
    const changedPlane = { ...previousPlane, id: 'plane-2', altitude: 11_000 };
    const newPlane: PlaneBasic = { ...previousPlane, id: 'plane-3' };

    const reconciledPlanes = reconcilePlanes([previousPlane, changedPlane], [{ ...previousPlane }, newPlane]);

    expect(reconciledPlanes).toEqual([previousPlane, newPlane]);
    expect(reconciledPlanes[0]).toBe(previousPlane);
    expect(reconciledPlanes[1]).toBe(newPlane);
  });

  it('uses the incoming object when an existing plane changes', () => {
    const incomingPlane = { ...previousPlane, color: '#dc2626' };

    const reconciledPlanes = reconcilePlanes([previousPlane], [incomingPlane]);

    expect(reconciledPlanes[0]).toBe(incomingPlane);
  });
});
