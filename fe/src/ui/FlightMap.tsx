import type { LatLngBoundsLiteral } from "leaflet";
import type { PropsWithChildren } from "react";
import { MapContainer, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { MapViewportMinZoom } from "./MapViewportMinZoom";

const initialMapCenter: [number, number] = [51.505, -0.09];
const initialMapZoom = 5;
const mercatorMaxLatitude = 85.0511287798;
// Three world widths leave worldCopyJump's horizontal wrapping unconstrained in practice.
const verticalPanBounds: LatLngBoundsLiteral = [
  [-mercatorMaxLatitude, -540],
  [mercatorMaxLatitude, 540],
];

export function FlightMap({ children }: PropsWithChildren) {
  return (
    <MapContainer
      center={initialMapCenter}
      className="h-dvh w-full"
      maxBounds={verticalPanBounds}
      maxBoundsViscosity={1}
      worldCopyJump
      zoom={initialMapZoom}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewportMinZoom />
      {children}
    </MapContainer>
  );
}
