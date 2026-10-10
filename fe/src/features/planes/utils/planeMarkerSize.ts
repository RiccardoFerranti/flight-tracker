export type PlaneMarkerSize = 18 | 23 | 28;

export function getPlaneMarkerSize(zoom: number): PlaneMarkerSize {
  if (zoom < 4) return 18;
  if (zoom < 7) return 23;
  return 28;
}
