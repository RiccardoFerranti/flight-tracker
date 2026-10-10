import { usePlanesSocket } from '@/data/planes/usePlanesSocket';
import { FlightMap } from '@/ui/FlightMap';

import { MapClickHandler } from './MapClickHandler';
import { PlaneMarkers } from './PlaneMarkers';

type PlanesMapProps = {
  onMapClick: () => void;
  onPlaneSelect: (planeId: string) => void;
};

export function PlanesMap({ onMapClick, onPlaneSelect }: PlanesMapProps) {
  const { planes } = usePlanesSocket();

  return (
    <FlightMap>
      <MapClickHandler onClick={onMapClick} />
      <PlaneMarkers onPlaneSelect={onPlaneSelect} planes={planes} />
    </FlightMap>
  );
}
