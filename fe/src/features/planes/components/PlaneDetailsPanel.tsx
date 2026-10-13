import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import type {
  PlaneDetailed,
  PlaneDetailsSocketStatus,
} from "@/data/planes/types";
import { ScrollArea } from "@/ui/ScrollArea";

import { useEscapeKey } from "../hooks/useEscapeKey";
import { formatFlightStatus } from "../utils/formatters";
import { getPlaneDetailsPanelContentState } from "../utils/planeDetailsPanel";

import { LiveDataStatusIndicator } from "./LiveDataStatusIndicator";
import { PlaneDetailsPanelContent } from "./PlaneDetailsPanelContent";

type PlaneDetailsPanelProps = {
  error: string | null;
  focusRequest?: PlaneDetailsFocusRequest | null;
  isOpen: boolean;
  onClose: () => void;
  plane: PlaneDetailed | null;
  status: PlaneDetailsSocketStatus;
};

export type PlaneDetailsFocusRequest = {
  id: number;
  target: "panel" | "close";
};

export function PlaneDetailsPanel({
  error,
  focusRequest = null,
  isOpen,
  onClose,
  plane,
  status: detailsSocketStatus,
}: PlaneDetailsPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const focusRequestId = focusRequest?.id;
  const focusTarget = focusRequest?.target;

  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (!isOpen || focusTarget === undefined) return;

    // Pointer selection focuses the panel so the next Tab reaches Close.
    // Keyboard selection focuses Close directly.
    if (focusTarget === "panel") panelRef.current?.focus();
    else closeButtonRef.current?.focus();
  }, [focusRequestId, focusTarget, isOpen]);

  const panelContentState = getPlaneDetailsPanelContentState(
    detailsSocketStatus,
    error,
    plane,
  );

  const readyPlane =
    panelContentState.status === "ready" ? panelContentState.plane : null;

  return (
    <aside
      aria-hidden={!isOpen}
      aria-label="Flight details"
      className={clsx(
        "border-border-subtle bg-surface shadow-panel fixed inset-y-0 right-0 z-1100",
        "flex w-full max-w-md flex-col overflow-hidden border-l sm:w-104",
        "transition-transform duration-300 ease-out motion-reduce:transition-none",
        !isOpen && "pointer-events-none",
      )}
      inert={!isOpen}
      ref={panelRef}
      style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}
      tabIndex={-1}
    >
      <div className="border-border-subtle grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 border-b px-6 pt-6 pb-5">
        <p className="text-text-secondary min-w-0 self-center text-sm font-medium">
          {readyPlane?.airline ?? "Aircraft information"}
        </p>
        <button
          aria-label="Close flight details"
          className={clsx(
            "cursor-pointer",
            "justify-self-end rounded-lg p-2",
            "text-text-secondary",
            "transition-colors",
            "hover:bg-surface-elevated hover:text-text-primary",
            "outline-none focus-visible:ring-2 focus-visible:ring-accent",
          )}
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <X aria-hidden="true" size={20} />
        </button>

        <h1 className="text-text-primary min-w-0 self-center text-3xl font-bold tracking-tight">
          {readyPlane?.flightNumber ?? "Flight details"}
        </h1>
        <div className="self-center justify-self-end">
          <LiveDataStatusIndicator status={detailsSocketStatus} />
        </div>

        {readyPlane && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              aria-label={`Flight status: ${formatFlightStatus(readyPlane.status)}`}
              className="bg-status-positive/10 text-status-positive inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
            >
              {formatFlightStatus(readyPlane.status)}
            </span>
          </div>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-6 py-6">
          <PlaneDetailsPanelContent state={panelContentState} />
        </div>
      </ScrollArea>
    </aside>
  );
}
