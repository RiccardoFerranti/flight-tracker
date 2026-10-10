import { useCallback, useState } from 'react';

import { FlightMap } from '@/components/FlightMap';
import { usePlaneDetailsSocket } from '@/data/planes/usePlaneDetailsSocket';
import { usePlanesSocket } from '@/data/planes/usePlanesSocket';

import { MapClickHandler } from './components/MapClickHandler';
import { PlaneDetailsPanel } from './components/PlaneDetailsPanel';
import { PlaneMarker } from './components/PlaneMarker';

export function Planes() {
  const { planes } = usePlanesSocket();

  const [selectedPlaneId, setSelectedPlaneId] = useState<string | null>(null);

  const { plane: selectedPlane, status: detailsStatus, error: detailsError } = usePlaneDetailsSocket(selectedPlaneId);

  const closePanel = useCallback(() => setSelectedPlaneId(null), []);

  return (
    <>
      <FlightMap>
        <MapClickHandler onClick={closePanel} />
        {planes.map((plane) => (
          <PlaneMarker key={plane.id} onSelect={setSelectedPlaneId} plane={plane} />
        ))}
      </FlightMap>
      <PlaneDetailsPanel
        error={detailsError}
        isOpen={selectedPlaneId !== null}
        onClose={closePanel}
        plane={selectedPlane}
        status={detailsStatus}
      />
    </>
  );
}
