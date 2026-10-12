import { DivIcon, Marker as LeafletMarker } from 'leaflet';
import { Plane } from 'lucide-react';
import { memo, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Marker, Tooltip } from 'react-leaflet';

import type { TrackedPlane } from '@/data/planes/types';

import { useInterpolatedMarkerPosition } from '../hooks/useInterpolatedMarkerPosition';
import type { PlaneMarkerSize } from '../utils/planeMarkerSize';

type PlaneMarkerProps = {
  markerSize: PlaneMarkerSize;
  plane: TrackedPlane;
  onSelect: (planeId: string) => void;
};

export const PlaneMarker = memo(function PlaneMarker({ markerSize, plane, onSelect }: PlaneMarkerProps) {
  // Lucide's Plane points north-east by default, so a -45° offset aligns its zero rotation with map north.
  const rotation = plane.heading === null ? -45 : plane.heading - 45;
  const markerRef = useRef<LeafletMarker>(null);
  const iconRef = useRef<DivIcon>(null);
  const initialPositionRef = useRef<[number, number] | null>(null);

  if (initialPositionRef.current === null) {
    initialPositionRef.current = [plane.latitude, plane.longitude];
  }

  if (iconRef.current === null) {
    // Keep the DivIcon instance stable so Leaflet does not replace the marker DOM during realtime updates.
    iconRef.current = new DivIcon({
      className: 'plane-marker-icon',
      html: renderToStaticMarkup(
        <span
          className="plane-marker-visual"
          style={{
            alignItems: 'center',
            color: plane.color,
            display: 'flex',
            height: '28px',
            justifyContent: 'center',
            transform: `rotate(${rotation}deg)`,
            width: '28px',
          }}
        >
          <Plane aria-hidden="true" color="currentColor" size={markerSize} strokeWidth={2.5} />
        </span>,
      ),
      iconAnchor: [14, 14],
      iconSize: [28, 28],
    });
  }

  useEffect(() => {
    // The DivIcon HTML is owned by Leaflet, so access its DOM element directly to update the visual without recreating the icon.
    const planeVisual = markerRef.current?.getElement()?.querySelector<HTMLElement>('.plane-marker-visual');

    if (!planeVisual) return;

    planeVisual.style.color = plane.color;
    planeVisual.style.transform = `rotate(${rotation}deg)`;
    const planeIcon = planeVisual.querySelector('svg');

    planeIcon?.setAttribute('height', String(markerSize));
    planeIcon?.setAttribute('width', String(markerSize));
  }, [markerSize, plane.color, rotation]);

  useInterpolatedMarkerPosition(markerRef, plane.latitude, plane.longitude);

  return (
    <Marker
      bubblingMouseEvents={false}
      icon={iconRef.current}
      // React Leaflet receives a stable initial position. Leaflet owns all subsequent visual movement.
      position={initialPositionRef.current}
      ref={markerRef}
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
    >
      <Tooltip direction="top" offset={[0, -14]}>
        {plane.id}
      </Tooltip>
    </Marker>
  );
});
