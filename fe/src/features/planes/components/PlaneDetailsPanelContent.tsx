import { Card } from "@/components/Card";

import type { PlaneDetailsPanelContentState } from "../utils/planeDetailsPanel";

import { PlaneDetailsContent } from "./PlaneDetailsContent";
import { PlaneDetailsSkeleton } from "./PlaneDetailsSkeleton";

type PlaneDetailsPanelContentProps = {
  state: PlaneDetailsPanelContentState;
};

export function PlaneDetailsPanelContent({
  state,
}: PlaneDetailsPanelContentProps) {
  switch (state.status) {
    case "loading":
      return <PlaneDetailsSkeleton />;
    case "ready":
      return <PlaneDetailsContent plane={state.plane} />;
    case "error":
      return (
        <div
          className="border-status-warning/25 bg-status-warning/10 rounded-xl border p-4"
          role="alert"
        >
          <p className="text-text-primary font-semibold">
            Unable to load flight details
          </p>
          <p className="text-text-secondary mt-1 text-sm">
            Flight information is currently unavailable.
          </p>
          <p className="text-text-secondary mt-1 text-sm">
            Select the aircraft again to retry.
          </p>
        </div>
      );
    case "disconnected":
      return (
        <Card className="bg-surface-elevated p-4" role="status">
          <p className="text-text-primary font-semibold">
            Flight details disconnected
          </p>
          <p className="text-text-secondary mt-1 text-sm">
            The live data connection was interrupted.
          </p>
          <p className="text-text-secondary mt-1 text-sm">
            Select the aircraft again to reconnect.
          </p>
        </Card>
      );
  }
}
