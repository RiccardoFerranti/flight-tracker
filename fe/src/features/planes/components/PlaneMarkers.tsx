import { useCallback, useState } from 'react';
import { useMap, useMapEvent } from 'react-leaflet';

import type { TrackedPlane } from '@/data/planes/types';

import { getPlaneMarkerSize } from '../utils/planeMarkerSize';

import { PlaneMarker } from './PlaneMarker';

type PlaneMarkersProps = {
  onPlaneSelect: (planeId: string, selectedWithKeyboard?: boolean) => void;
  planes: TrackedPlane[];
  selectedPlaneId: string | null;
};

export function PlaneMarkers({ onPlaneSelect, planes, selectedPlaneId }: PlaneMarkersProps) {
  const map = useMap();
  const [markerSize, setMarkerSize] = useState(() =>
    getPlaneMarkerSize(map.getZoom()),
  );

  const updateMarkerSize = useCallback(() => {
    const nextMarkerSize = getPlaneMarkerSize(map.getZoom());
    setMarkerSize((currentMarkerSize) =>
      currentMarkerSize === nextMarkerSize
        ? currentMarkerSize
        : nextMarkerSize,
    );
  }, [map]);

  useMapEvent('zoomend', updateMarkerSize);

  return planes.map((plane) => (
    <PlaneMarker
      key={plane.id}
      isSelected={plane.id === selectedPlaneId}
      markerSize={markerSize}
      onSelect={onPlaneSelect}
      plane={plane}
    />
  ));
}
