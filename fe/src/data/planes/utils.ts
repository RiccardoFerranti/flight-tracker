import type { PlaneBasic, TrackedPlane } from "./types";

function arePlaneBasicsEqual(
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

// JavaScript trigonometric functions (Math.sin, Math.cos, etc.) expect angles in radians rather than degrees.
// Since 180° equals π radians, multiplying degrees by π / 180 converts the angle to the unit required by those functions.
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Math.atan2 returns angles in radians. Since π radians equals 180°,
// multiplying radians by 180 / π converts the result back to degrees for the plane heading.
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

// Calculates the direction of movement between consecutive geographic coordinates. Latitude and longitude lie on
// the Earth's surface rather than a Cartesian plane, so the bearing formula uses radians for trigonometry and then
// normalizes the degree result to 0–360°, where 0° is North, 90° East, 180° South, and 270° West.
export function calculateInitialBearing(
  previousLatitude: number,
  previousLongitude: number,
  incomingLatitude: number,
  incomingLongitude: number,
): number {
  const previousLatitudeRadians = toRadians(previousLatitude);
  const incomingLatitudeRadians = toRadians(incomingLatitude);
  const longitudeDifferenceRadians = toRadians(
    incomingLongitude - previousLongitude,
  );

  // Calculate the two components used by atan2 to determine the bearing
  // while preserving the correct geographic quadrant.
  const x =
    Math.sin(longitudeDifferenceRadians) * Math.cos(incomingLatitudeRadians);
  const y =
    Math.cos(previousLatitudeRadians) * Math.sin(incomingLatitudeRadians) -
    Math.sin(previousLatitudeRadians) *
      Math.cos(incomingLatitudeRadians) *
      Math.cos(longitudeDifferenceRadians);

  // atan2 returns radians in a signed range; convert to degrees and normalize
  // to 0–360°, where 0° is North, 90° East, 180° South and 270° West.
  return (toDegrees(Math.atan2(x, y)) + 360) % 360;
}

function hasSamePosition(
  previousPlane: TrackedPlane,
  incomingPlane: PlaneBasic,
): boolean {
  return (
    previousPlane.latitude === incomingPlane.latitude &&
    previousPlane.longitude === incomingPlane.longitude
  );
}

export function reconcilePlanes(
  previousPlanes: TrackedPlane[],
  incomingPlanes: PlaneBasic[],
): TrackedPlane[] {
  const previousPlanesById = new Map(
    previousPlanes.map((plane) => [plane.id, plane]),
  );
  const reconciledPlanes = incomingPlanes.map((incomingPlane) => {
    const previousPlane = previousPlanesById.get(incomingPlane.id);

    // No previous position is available yet, so a movement heading cannot be calculated.
    if (!previousPlane) {
      return { ...incomingPlane, heading: null };
    }

    // Nothing from the basic feed changed: preserve the existing object and heading.
    if (arePlaneBasicsEqual(previousPlane, incomingPlane)) {
      return previousPlane;
    }

    // Basic data changed but the plane did not move horizontally, so preserve its last known heading.
    if (hasSamePosition(previousPlane, incomingPlane)) {
      return { ...incomingPlane, heading: previousPlane.heading };
    }

    // The geographic position changed: derive a new heading from the movement between both snapshots.
    return {
      ...incomingPlane,
      heading: calculateInitialBearing(
        previousPlane.latitude,
        previousPlane.longitude,
        incomingPlane.latitude,
        incomingPlane.longitude,
      ),
    };
  });

  const isUnchanged =
    previousPlanes.length === reconciledPlanes.length &&
    reconciledPlanes.every((plane, index) => plane === previousPlanes[index]);

  return isUnchanged ? previousPlanes : reconciledPlanes;
}
