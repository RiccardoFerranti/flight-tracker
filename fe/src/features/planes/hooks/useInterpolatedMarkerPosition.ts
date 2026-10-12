import type { Marker as LeafletMarker } from 'leaflet';
import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

const markerAnimationDuration = 850;

export function useInterpolatedMarkerPosition(markerRef: RefObject<LeafletMarker | null>, latitude: number, longitude: number) {
  const animationFrameRef = useRef<number | null>(null);
  const hasRenderedInitialPositionRef = useRef(false);

  useEffect(() => {
    const marker = markerRef.current;

    if (!marker) return;

    const cancelAnimation = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    // The initial Marker position is rendered directly; only later snapshots need interpolation.
    if (!hasRenderedInitialPositionRef.current) {
      hasRenderedInitialPositionRef.current = true;

      return cancelAnimation;
    }

    cancelAnimation();

    const startPosition = marker.getLatLng();

    if (startPosition.lat === latitude && startPosition.lng === longitude) {
      return cancelAnimation;
    }

    let animationStartTime: number | null = null;
    const animatePosition = (timestamp: number) => {
      // Move the marker from its current position to the latest backend position over a fixed duration.
      // Each animation frame calculates where the marker should be based on the elapsed time.
      if (animationStartTime === null) {
        animationStartTime = timestamp;
      }

      // Convert elapsed animation time into progress from 0 to 1:
      // 0 = start position, 0.5 = halfway, 1 = target position.
      const progress = Math.min((timestamp - animationStartTime) / markerAnimationDuration, 1);

      // Interpolate latitude and longitude between the start and target positions.
      marker.setLatLng([
        startPosition.lat + (latitude - startPosition.lat) * progress,
        startPosition.lng + (longitude - startPosition.lng) * progress,
      ]);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animatePosition);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animatePosition);

    return cancelAnimation;
  }, [latitude, longitude, markerRef]);
}
