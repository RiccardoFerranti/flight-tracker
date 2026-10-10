import { usePlaneDetailsSocket } from "@/data/planes/usePlaneDetailsSocket";

import { PlaneDetailsPanel } from "./PlaneDetailsPanel";

type SelectedPlaneDetailsProps = {
  onClose: () => void;
  selectedPlaneId: string | null;
};

export function SelectedPlaneDetails({
  onClose,
  selectedPlaneId,
}: SelectedPlaneDetailsProps) {
  const { plane, status, error } = usePlaneDetailsSocket(selectedPlaneId);

  return (
    <PlaneDetailsPanel
      error={error}
      isOpen={selectedPlaneId !== null}
      onClose={onClose}
      plane={plane}
      status={status}
    />
  );
}
