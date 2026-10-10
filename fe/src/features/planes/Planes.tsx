import { useCallback, useState } from 'react';

import { PlanesMap } from './components/PlanesMap';
import { SelectedPlaneDetails } from './components/SelectedPlaneDetails';

export function Planes() {
  const [selectedPlaneId, setSelectedPlaneId] = useState<string | null>(null);
  const closePanel = useCallback(() => setSelectedPlaneId(null), []);

  return (
    <>
      <PlanesMap onMapClick={closePanel} onPlaneSelect={setSelectedPlaneId} />
      <SelectedPlaneDetails onClose={closePanel} selectedPlaneId={selectedPlaneId} />
    </>
  );
}
