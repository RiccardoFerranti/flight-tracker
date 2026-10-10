import { Plane } from 'lucide-react';

import type { PlaneDetailed } from '@/data/planes/types';
import { Card } from '@/ui/Card';

import {
  formatAltitude,
  formatCoordinate,
  formatEstimatedArrival,
  formatFlightDuration,
  formatSpeed,
  formatVerticalSpeed,
} from '../utils/formatters';

import { PlaneDetailRow } from './PlaneDetailRow';

export function PlaneDetailsContent({ plane }: { plane: PlaneDetailed }) {
  return (
    <div className="space-y-7">
      <section aria-labelledby="route-heading">
        <h2 className="text-text-muted text-xs font-semibold tracking-[0.14em] uppercase" id="route-heading">
          Route
        </h2>
        <Card className="bg-surface-elevated mt-3 p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <p className="text-text-primary text-xl font-bold">{plane.origin.airport}</p>
              <p className="text-text-secondary mt-1 text-sm">{plane.origin.city}</p>
            </div>
            <div className="border-border-subtle bg-surface flex size-10 shrink-0 items-center justify-center rounded-full border">
              <Plane aria-hidden="true" className="text-accent rotate-45" size={20} />
            </div>
            <div className="text-right">
              <p className="text-text-primary text-xl font-bold">{plane.destination.airport}</p>
              <p className="text-text-secondary mt-1 text-sm">{plane.destination.city}</p>
            </div>
          </div>
          <dl className="divide-border-subtle border-border-subtle mt-4 divide-y border-t">
            <PlaneDetailRow label="Estimated arrival" value={formatEstimatedArrival(plane.estimatedArrival)} />
            <PlaneDetailRow label="Flight duration" value={formatFlightDuration(plane.flightDuration)} />
          </dl>
        </Card>
      </section>

      <section aria-labelledby="aircraft-heading">
        <h2 className="text-text-muted text-xs font-semibold tracking-[0.14em] uppercase" id="aircraft-heading">
          Aircraft
        </h2>
        <Card className="mt-3 px-4">
          <dl className="divide-border-subtle divide-y">
            <PlaneDetailRow label="Model" value={plane.model} />
            <PlaneDetailRow label="Registration" value={plane.registration} />
            <PlaneDetailRow label="Passengers" value={`${plane.numberOfPassengers} / ${plane.maxPassengers} passengers`} />
          </dl>
        </Card>
      </section>

      <section aria-labelledby="live-data-heading">
        <h2 className="text-text-muted text-xs font-semibold tracking-[0.14em] uppercase" id="live-data-heading">
          Live data
        </h2>
        <Card className="mt-3 px-4">
          <dl className="divide-border-subtle divide-y">
            <PlaneDetailRow label="Altitude" value={formatAltitude(plane.altitude)} />
            <PlaneDetailRow label="Speed" value={formatSpeed(plane.speed)} />
            <PlaneDetailRow label="Vertical speed" value={formatVerticalSpeed(plane.verticalSpeed)} />
            <PlaneDetailRow label="Latitude" value={formatCoordinate(plane.latitude, 'latitude')} />
            <PlaneDetailRow label="Longitude" value={formatCoordinate(plane.longitude, 'longitude')} />
          </dl>
        </Card>
      </section>
    </div>
  );
}
