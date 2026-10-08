import type { PlaneBasic } from "./types";

function arePlanesEqual(
  previousPlane: PlaneBasic,
  incomingPlane: PlaneBasic,
): boolean {
  return (
    previousPlane.id === incomingPlane.id &&
    previousPlane.latitude === incomingPlane.latitude &&
    previousPlane.longitude === incomingPlane.longitude &&
    previousPlane.altitude === incomingPlane.altitude &&
    previousPlane.color === incomingPlane.color
  );
}

export function reconcilePlanes(
  previousPlanes: PlaneBasic[],
  incomingPlanes: PlaneBasic[],
): PlaneBasic[] {
  // Index the previous snapshot by id to keep reconciliation O(n)
  // instead of searching the previous array for every incoming plane.
  const previousPlanesById = new Map(
    previousPlanes.map((plane) => [plane.id, plane]),
  );

  // Preserve object references for unchanged planes so memoized consumers
  // can bail out, while changed/new planes use the incoming snapshot object.
  const reconciledPlanes = incomingPlanes.map((incomingPlane) => {
    const previousPlane = previousPlanesById.get(incomingPlane.id);

    return previousPlane && arePlanesEqual(previousPlane, incomingPlane)
      ? previousPlane
      : incomingPlane;
  });

  // map() always creates a new array. If every plane reference and its order
  // are unchanged, reuse the previous array so React can bail out at state level too.
  const isUnchanged =
    previousPlanes.length === reconciledPlanes.length &&
    reconciledPlanes.every((plane, index) => plane === previousPlanes[index]);

  return isUnchanged ? previousPlanes : reconciledPlanes;
}
