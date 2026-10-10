import type {
  PlaneDetailed,
  PlaneDetailsSocketStatus,
} from "@/data/planes/types";

export type PlaneDetailsPanelContentState =
  | { status: "loading" }
  | { status: "ready"; plane: PlaneDetailed }
  | { status: "error" }
  | { status: "disconnected" };

export function getPlaneDetailsPanelContentState(
  detailsSocketStatus: PlaneDetailsSocketStatus,
  error: string | null,
  plane: PlaneDetailed | null,
): PlaneDetailsPanelContentState {
  if (detailsSocketStatus === "error") return { status: "error" };
  if (detailsSocketStatus === "disconnected") return { status: "disconnected" };
  if (error !== null && plane === null) return { status: "error" };
  if (detailsSocketStatus === "connected" && plane !== null)
    return { status: "ready", plane };

  return { status: "loading" };
}
