import { useCallback, useState } from "react";

import type { PlaneDetailsFocusRequest } from "./components/PlaneDetailsPanel";
import { PlanesMap } from "./components/PlanesMap";
import { SelectedPlaneDetails } from "./components/SelectedPlaneDetails";

export function Planes() {
  const [selectedPlaneId, setSelectedPlaneId] = useState<string | null>(null);
  const [detailsFocusRequest, setDetailsFocusRequest] =
    useState<PlaneDetailsFocusRequest | null>(null);

  const closePanel = useCallback(() => {
    setSelectedPlaneId(null);
    setDetailsFocusRequest(null);
  }, []);

  const selectPlane = useCallback(
    (planeId: string, selectedWithKeyboard = false) => {
      setSelectedPlaneId(planeId);
      setDetailsFocusRequest((currentRequest) => ({
        // A new request ID retriggers focus even when consecutive selections have the same target.
        id: (currentRequest?.id ?? 0) + 1,
        target: selectedWithKeyboard ? "close" : "panel",
      }));
    },
    [],
  );

  return (
    <>
      <PlanesMap onMapClick={closePanel} onPlaneSelect={selectPlane} />
      <SelectedPlaneDetails
        focusRequest={detailsFocusRequest}
        onClose={closePanel}
        selectedPlaneId={selectedPlaneId}
      />
    </>
  );
}
