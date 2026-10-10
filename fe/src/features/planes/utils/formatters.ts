const METERS_TO_FEET = 3.280839895;
const METERS_PER_SECOND_TO_KNOTS = 1.943844492;
const METERS_PER_SECOND_TO_FEET_PER_MINUTE = 196.8503937;

const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

export function metersToFeet(meters: number): number {
  return meters * METERS_TO_FEET;
}

export function metersPerSecondToKnots(metersPerSecond: number): number {
  return metersPerSecond * METERS_PER_SECOND_TO_KNOTS;
}

export function metersPerSecondToFeetPerMinute(metersPerSecond: number): number {
  return metersPerSecond * METERS_PER_SECOND_TO_FEET_PER_MINUTE;
}

export function formatAltitude(meters: number): string {
  return `${integerFormatter.format(Math.round(metersToFeet(meters)))} ft`;
}

export function formatSpeed(metersPerSecond: number): string {
  return `${integerFormatter.format(Math.round(metersPerSecondToKnots(metersPerSecond)))} kt`;
}

export function formatVerticalSpeed(metersPerSecond: number): string {
  const value = Math.round(metersPerSecondToFeetPerMinute(metersPerSecond));
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';

  return `${sign}${integerFormatter.format(Math.abs(value))} ft/min`;
}

export function formatFlightDuration(minutes: number): string {
  const totalMinutes = Math.max(0, Math.round(minutes));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const remainingMinutes = totalMinutes % 60;
  const parts = days > 0 ? [`${days}d`] : [];

  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${remainingMinutes}m`);

  return parts.join(' ');
}

export function formatEstimatedArrival(timestamp: number): string {
  const date = new Date(timestamp);

  if (!Number.isFinite(timestamp) || Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export function formatCoordinate(value: number, axis: 'latitude' | 'longitude'): string {
  const direction = axis === 'latitude' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';

  return `${Math.abs(value).toFixed(4)}° ${direction}`;
}

export function formatFlightStatus(status: string): string {
  return status.replace(/\b\w/g, (character) => character.toUpperCase());
}
