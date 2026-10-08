import { DivIcon } from "leaflet";
import { Plane } from "lucide-react";
import { memo, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Marker } from "react-leaflet";

import type { PlaneBasic } from "@/data/planes/types";

type PlaneMarkerProps = {
  plane: PlaneBasic;
};

export const PlaneMarker = memo(function PlaneMarker({
  plane,
}: PlaneMarkerProps) {
  // Position updates should not recreate the icon when its color is unchanged.
  const icon = useMemo(
    () =>
      new DivIcon({
        className: "plane-marker-icon",
        html: renderToStaticMarkup(
          <Plane
            aria-hidden="true"
            color={plane.color}
            size={28}
            strokeWidth={2.5}
          />,
        ),
        iconAnchor: [14, 14],
        iconSize: [28, 28],
      }),
    [plane.color],
  );

  return <Marker icon={icon} position={[plane.latitude, plane.longitude]} />;
});
