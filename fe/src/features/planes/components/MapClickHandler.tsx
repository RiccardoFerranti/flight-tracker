import type { LeafletMouseEvent } from 'leaflet';
import { useMapEvents } from 'react-leaflet';

type MapClickHandlerProps = {
  onClick: () => void;
};

export function MapClickHandler({ onClick }: MapClickHandlerProps) {
  useMapEvents({
    click: (event: LeafletMouseEvent) => {
      const eventTarget = event.originalEvent.target;

      // Only the map background owns deselection. A marker-originated DOM event must not race its selection update.
      if (eventTarget instanceof Element && eventTarget.closest('.plane-marker-icon')) return;

      onClick();
    },
  });

  return null;
}
