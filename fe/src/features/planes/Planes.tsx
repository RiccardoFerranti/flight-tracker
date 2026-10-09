import { useEffect, useState } from "react";

import { FlightMap } from "@/components/FlightMap";
import { usePlaneDetailsSocket } from "@/data/planes/usePlaneDetailsSocket";
import { usePlanesSocket } from "@/data/planes/usePlanesSocket";

import { PlaneMarker } from "./components/PlaneMarker";

export function Planes() {
  const {
    planes,
    status: planesStatus,
    error: planesError,
  } = usePlanesSocket();

  const [selectedPlaneId, setSelectedPlaneId] = useState<string | null>(null);

  const {
    plane: selectedPlane,
    status: detailsStatus,
    error: detailsError,
  } = usePlaneDetailsSocket(selectedPlaneId);

  useEffect(() => {
    // Temporary manual verification while the details UI has not been built yet.
    console.log("Selected plane details:", {
      selectedPlaneId,
      status: detailsStatus,
      plane: selectedPlane,
      error: detailsError,
    });
  }, [detailsError, selectedPlane, selectedPlaneId, detailsStatus]);

  return (
    <FlightMap>
      {planes.map((plane) => (
        <PlaneMarker
          key={plane.id}
          onSelect={setSelectedPlaneId}
          plane={plane}
        />
      ))}
    </FlightMap>
  );
}
