import { usePlaneDetailsSocket } from "@/data/planes/usePlaneDetailsSocket";

import {
  type PlaneDetailsFocusRequest,
  PlaneDetailsPanel,
} from "./PlaneDetailsPanel";

type SelectedPlaneDetailsProps = {
  focusRequest?: PlaneDetailsFocusRequest | null;
  onClose: () => void;
  selectedPlaneId: string | null;
};

export function SelectedPlaneDetails({
  focusRequest = null,
  onClose,
  selectedPlaneId,
}: SelectedPlaneDetailsProps) {
  const { plane, status, error } = usePlaneDetailsSocket(selectedPlaneId);

  return (
    <PlaneDetailsPanel
      error={error}
      focusRequest={focusRequest}
      isOpen={selectedPlaneId !== null}
      onClose={onClose}
      plane={plane}
      status={status}
    />
  );
}
