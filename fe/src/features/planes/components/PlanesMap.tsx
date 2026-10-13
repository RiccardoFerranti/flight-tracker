import { usePlanesSocket } from "@/data/planes/usePlanesSocket";
import { FlightMap } from "@/ui/FlightMap";

import { BasicPlanesConnectionBadge } from "./BasicPlanesConnectionBadge";
import { MapClickHandler } from "./MapClickHandler";
import { PlaneMarkers } from "./PlaneMarkers";

type PlanesMapProps = {
  onMapClick: () => void;
  onPlaneSelect: (planeId: string, selectedWithKeyboard?: boolean) => void;
};

export function PlanesMap({ onMapClick, onPlaneSelect }: PlanesMapProps) {
  const { planes, status } = usePlanesSocket();

  return (
    <div className="relative">
      <FlightMap>
        <MapClickHandler onClick={onMapClick} />
        <PlaneMarkers onPlaneSelect={onPlaneSelect} planes={planes} />
      </FlightMap>
      <BasicPlanesConnectionBadge status={status} />
    </div>
  );
}
