import { useEffect, useState } from "react";

import { planeDetailsSocketMessageSchema } from "./schemas";
import type { PlaneDetailed, PlaneDetailsSocketStatus } from "./types";

const planeDetailsSocketUrl = import.meta.env.VITE_PLANE_DETAILS_WS_URL;

type PlaneDetailsSocketState = {
  plane: PlaneDetailed | null;
  status: PlaneDetailsSocketStatus;
  error: string | null;
};

export function usePlaneDetailsSocket(
  selectedPlaneId: string | null,
): PlaneDetailsSocketState {
  const [plane, setPlane] = useState<PlaneDetailed | null>(null);
  const [connectionStatus, setConnectionStatus] = useState({
    planeId: null as string | null,
    value: "disconnected" as PlaneDetailsSocketStatus,
  });
  const [connectionError, setConnectionError] = useState<{
    planeId: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (selectedPlaneId === null) {
      return;
    }

    // A fresh connection per selection keeps subscription ownership and cleanup explicit.
    let isActive = true;
    let socket: WebSocket;

    const handleError = (
      message: string,
      nextStatus?: PlaneDetailsSocketStatus,
    ) => {
      if (!isActive) return;

      if (nextStatus) {
        setConnectionStatus({ planeId: selectedPlaneId, value: nextStatus });
      }

      setConnectionError({ planeId: selectedPlaneId, message });
    };

    try {
      socket = new WebSocket(planeDetailsSocketUrl);
    } catch {
      // Defer the state update to avoid triggering react-hooks/set-state-in-effect
      // while still reporting a synchronous WebSocket constructor failure immediately after the effect.
      queueMicrotask(() => {
        handleError(
          "Unable to create the plane details WebSocket connection.",
          "error",
        );
      });

      return () => {
        isActive = false;
      };
    }

    const handleOpen = () => {
      if (!isActive) return;

      socket.send(
        JSON.stringify({ type: "subscribe", planeId: selectedPlaneId }),
      );
      setConnectionStatus({ planeId: selectedPlaneId, value: "connected" });
      setConnectionError(null);
    };

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (typeof event.data !== "string") {
        handleError("Received a non-text plane details message.");

        return;
      }

      try {
        const result = planeDetailsSocketMessageSchema.safeParse(
          JSON.parse(event.data),
        );

        if (!result.success) {
          handleError("Received an invalid plane details message.");

          return;
        }

        if (result.data.type === "error") {
          handleError(result.data.message, "error");

          return;
        }

        if (result.data.data.id !== selectedPlaneId) {
          handleError("Received plane details for an unexpected plane.");

          return;
        }

        setPlane(result.data.data);
        setConnectionError(null);
      } catch {
        handleError("Received malformed plane details JSON.");
      }
    };

    const handleSocketError = () => {
      handleError(
        "The plane details WebSocket connection encountered an error.",
        "error",
      );
    };

    const handleClose = () => {
      if (!isActive) return;

      setConnectionStatus((currentStatus) => ({
        planeId: selectedPlaneId,
        value: currentStatus.value === "error" ? "error" : "disconnected",
      }));
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleSocketError);
    socket.addEventListener("close", handleClose);

    return () => {
      isActive = false;

      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleSocketError);
      socket.removeEventListener("close", handleClose);

      socket.close();
    };
  }, [selectedPlaneId]);

  const isSelectedConnection = connectionStatus.planeId === selectedPlaneId;

  // State is tagged with its selection so a render after an ID change never exposes stale details.
  return {
    plane: plane?.id === selectedPlaneId ? plane : null,
    status:
      selectedPlaneId === null
        ? "disconnected"
        : isSelectedConnection
          ? connectionStatus.value
          : "connecting",
    error:
      connectionError?.planeId === selectedPlaneId
        ? connectionError.message
        : null,
  };
}
