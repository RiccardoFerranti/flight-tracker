import { usePlanesSocket } from '@/data/planes/usePlanesSocket';
import { FlightMap } from '@/ui/FlightMap';

import { MapClickHandler } from './MapClickHandler';
import { PlaneMarker } from './PlaneMarker';

type PlanesMapProps = {
  onMapClick: () => void;
  onPlaneSelect: (planeId: string) => void;
};

export function PlanesMap({ onMapClick, onPlaneSelect }: PlanesMapProps) {
  const { planes } = usePlanesSocket();

  return (
    <FlightMap>
      <MapClickHandler onClick={onMapClick} />
      {planes.map((plane) => (
        <PlaneMarker key={plane.id} onSelect={onPlaneSelect} plane={plane} />
      ))}
    </FlightMap>
  );
}
