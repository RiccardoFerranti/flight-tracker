import type { Marker as LeafletMarker } from "leaflet";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";

const markerAnimationDuration = 850;
const markerSnapAfterGap = 3_000;

export function useInterpolatedMarkerPosition(
  markerRef: RefObject<LeafletMarker | null>,
  latitude: number,
  longitude: number,
) {
  const animationFrameRef = useRef<number | null>(null);
  const hasRenderedInitialPositionRef = useRef(false);
  const lastTargetReceivedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const marker = markerRef.current;

    if (!marker) return;

    // Track when this marker last received a target so long feed gaps can snap
    // directly to the latest position instead of triggering a fast catch-up animation.
    // performance.now() is monotonic and uses the same time origin as requestAnimationFrame timestamps.
    const targetReceivedAt = performance.now();
    const previousTargetReceivedAt = lastTargetReceivedAtRef.current;
    lastTargetReceivedAtRef.current = targetReceivedAt;

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

    const targetArrivedAfterGap =
      previousTargetReceivedAt !== null &&
      targetReceivedAt - previousTargetReceivedAt > markerSnapAfterGap;

    // Handle two different catch-up cases:
    // - a long feed gap means the latest position may be far ahead of the rendered one;
    // - a hidden tab may throttle RAF while WebSocket updates keep arriving.
    // In both cases, snap to the latest position instead of running a misleading catch-up animation.
    if (targetArrivedAfterGap || document.hidden) {
      marker.setLatLng([latitude, longitude]);

      return cancelAnimation;
    }

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
      const progress = Math.min(
        (timestamp - animationStartTime) / markerAnimationDuration,
        1,
      );

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
