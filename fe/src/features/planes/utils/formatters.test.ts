import { describe, expect, it } from 'vitest';

import {
  formatCoordinate,
  formatEstimatedArrival,
  formatFlightDuration,
  formatVerticalSpeed,
  metersPerSecondToFeetPerMinute,
  metersPerSecondToKnots,
  metersToFeet,
} from './formatters';

describe('flight detail formatters', () => {
  it('converts aviation units correctly', () => {
    expect(metersToFeet(1)).toBeCloseTo(3.28084, 5);
    expect(metersPerSecondToKnots(1)).toBeCloseTo(1.94384, 5);
    expect(metersPerSecondToFeetPerMinute(1)).toBeCloseTo(196.85039, 5);
  });

  it('formats positive, negative, and zero vertical speed', () => {
    expect(formatVerticalSpeed(1)).toBe('+197 ft/min');
    expect(formatVerticalSpeed(-1)).toBe('−197 ft/min');
    expect(formatVerticalSpeed(0)).toBe('0 ft/min');
  });

  it('formats durations including durations over a day', () => {
    expect(formatFlightDuration(0)).toBe('0m');
    expect(formatFlightDuration(125)).toBe('2h 5m');
    expect(formatFlightDuration(1_565)).toBe('1d 2h 5m');
    expect(formatFlightDuration(-10)).toBe('0m');
  });

  it('formats coordinates with appropriate hemispheres', () => {
    expect(formatCoordinate(13.7563, 'latitude')).toBe('13.7563° N');
    expect(formatCoordinate(-100.5018, 'longitude')).toBe('100.5018° W');
  });

  it('formats valid arrival timestamps and handles invalid timestamps', () => {
    expect(formatEstimatedArrival(0)).not.toBe('Unavailable');
    expect(formatEstimatedArrival(Number.NaN)).toBe('Unavailable');
  });
});
