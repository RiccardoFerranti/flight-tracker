import { useCallback, useEffect, useRef } from 'react';
import { useMap, useMapEvent } from 'react-leaflet';

export function MapViewportMinZoom() {
  const map = useMap();
  const baseMinZoom = useRef(map.getMinZoom());

  const updateMinZoom = useCallback(() => {
    const viewportSize = map.getSize();
    const worldSize = map.getPixelWorldBounds(0).getSize();
    const verticalCoverage = viewportSize.y / worldSize.y;
    const twoWorldsCoverage = viewportSize.x / (worldSize.x * 2);

    // Cover the viewport height and never allow enough horizontal space for three full worlds.
    map.setMinZoom(baseMinZoom.current);
    map.setMinZoom(
      map.getScaleZoom(Math.max(verticalCoverage, twoWorldsCoverage), 0),
    );
  }, [map]);

  useEffect(() => {
    updateMinZoom();
  }, [updateMinZoom]);

  useMapEvent('resize', updateMinZoom);

  return null;
}
