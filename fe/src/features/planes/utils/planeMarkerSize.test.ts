import { describe, expect, it } from 'vitest';

import { getPlaneMarkerSize } from './planeMarkerSize';

describe('getPlaneMarkerSize', () => {
  it.each([
    [3.9, 18],
    [4, 23],
    [6.9, 23],
    [7, 28],
  ] as const)('returns %ipx at zoom %i', (zoom, expectedSize) => {
    expect(getPlaneMarkerSize(zoom)).toBe(expectedSize);
  });
});
