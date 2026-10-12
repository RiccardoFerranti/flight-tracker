import clsx from "clsx";
import { RadioTower } from "lucide-react";
import { memo } from "react";

import type { PlanesSocketStatus } from "@/data/planes/types";

type BasicPlanesConnectionBadgeProps = {
  status: PlanesSocketStatus;
};

type BadgeStatus = Exclude<PlanesSocketStatus, "error">;

const statusLabels: Record<BadgeStatus, string> = {
  connected: "Live data",
  connecting: "Connecting...",
  disconnected: "Disconnected",
};

export const BasicPlanesConnectionBadge = memo(
  ({ status }: BasicPlanesConnectionBadgeProps) => {
    // The map only exposes the three recoverable connection states. Should a future caller provide
    // `error`, present it as disconnected instead of introducing an alert-like fourth badge state.
    const badgeStatus: BadgeStatus =
      status === "error" ? "disconnected" : status;

    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-1000 flex justify-center">
        <span
          className="border-border-subtle bg-surface/95 text-text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm"
          role="status"
        >
          <RadioTower
            aria-hidden="true"
            className={clsx(
              "shrink-0",
              badgeStatus === "connected" && "text-status-positive",
              badgeStatus === "connecting" &&
                "text-status-pending animate-pulse motion-reduce:animate-none",
              badgeStatus === "disconnected" && "text-text-muted",
            )}
            size={14}
            strokeWidth={2}
          />
          {statusLabels[badgeStatus]}
        </span>
      </div>
    );
  },
);
