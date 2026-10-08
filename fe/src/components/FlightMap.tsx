import { MapContainer, TileLayer } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

const initialMapCenter: [number, number] = [51.505, -0.09];
const initialMapZoom = 5;

export function FlightMap() {
  return (
    <MapContainer center={initialMapCenter} className="h-dvh w-full" zoom={initialMapZoom}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
}
