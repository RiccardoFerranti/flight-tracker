import { DivIcon } from 'leaflet';
import { Plane } from 'lucide-react';
import { memo, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Marker } from 'react-leaflet';

import type { TrackedPlane } from '@/data/planes/types';

type PlaneMarkerProps = {
  plane: TrackedPlane;
  onSelect: (planeId: string) => void;
};

export const PlaneMarker = memo(function PlaneMarker({ plane, onSelect }: PlaneMarkerProps) {
  // Lucide's Plane points north-east by default, so a -45° offset aligns its zero rotation with map north.
  const rotation = plane.heading === null ? -45 : plane.heading - 45;

  // Position updates should not recreate the icon when its visual appearance is unchanged.
  const icon = useMemo(
    () =>
      new DivIcon({
        className: 'plane-marker-icon',
        html: renderToStaticMarkup(
          <span style={{ display: 'block', transform: `rotate(${rotation}deg)` }}>
            <Plane aria-hidden="true" color={plane.color} size={28} strokeWidth={2.5} />
          </span>,
        ),
        iconAnchor: [14, 14],
        iconSize: [28, 28],
      }),
    [plane.color, rotation],
  );

  return (
    <Marker
      bubblingMouseEvents={false}
      icon={icon}
      position={[plane.latitude, plane.longitude]}
      eventHandlers={{
        click: (event) => {
          onSelect(plane.id);

          const eventTarget = event.originalEvent.target;

          // Leaflet keeps a pointer-clicked marker focused and restores its native outline on the next keydown.
          // Release pointer focus now; keyboard-focused markers retain their focus indicator.
          if (event.originalEvent.detail > 0 && eventTarget instanceof Element) {
            eventTarget.closest<HTMLElement>('.plane-marker-icon')?.blur();
          }
        },
      }}
    />
  );
});
