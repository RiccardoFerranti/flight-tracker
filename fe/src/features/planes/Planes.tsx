import { FlightMap } from '@/components/FlightMap';
import { usePlanesSocket } from '@/data/planes/usePlanesSocket';

import { PlaneMarker } from './components/PlaneMarker';

export function Planes() {
  const { planes } = usePlanesSocket();

  return (
    <FlightMap>
      {planes.map((plane) => (
        <PlaneMarker key={plane.id} plane={plane} />
      ))}
    </FlightMap>
  );
}
