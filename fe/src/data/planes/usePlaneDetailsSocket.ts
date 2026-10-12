import { useEffect, useState } from 'react';

import { planeDetailsSocketMessageSchema } from './schemas';
import type { PlaneDetailed, PlaneDetailsSocketStatus } from './types';

const planeDetailsSocketUrl = import.meta.env.VITE_PLANE_DETAILS_WS_URL;
const baseRetryDelay = 1_000;
const maxRetries = 5;
const healthRetryDelay = 10_000;
const staleFeedTimeout = 5_000;
const terminalCloseCode = 1008;
const unavailablePlaneError = 'The selected plane is no longer available.';

type RecoveryPhase = 'fast' | 'health';

type PlaneDetailsSocketState = {
  plane: PlaneDetailed | null;
  status: PlaneDetailsSocketStatus;
  error: string | null;
};

export function usePlaneDetailsSocket(selectedPlaneId: string | null): PlaneDetailsSocketState {
  const [plane, setPlane] = useState<PlaneDetailed | null>(null);
  const [connectionStatus, setConnectionStatus] = useState({
    planeId: null as string | null,
    value: 'disconnected' as PlaneDetailsSocketStatus,
  });
  const [connectionError, setConnectionError] = useState<{
    planeId: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (selectedPlaneId === null) {
      return;
    }

    // Each selection owns its socket and recovery state, so it cannot affect a later selection.
    let isActive = true;
    let currentSocket: WebSocket | null = null;
    let removeCurrentSocketListeners: (() => void) | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let staleTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let recoveryPhase: RecoveryPhase = 'fast';
    let isBrowserOffline = !navigator.onLine;

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const clearStaleTimer = () => {
      if (staleTimer !== null) {
        clearTimeout(staleTimer);
        staleTimer = null;
      }
    };

    const isCurrentSocket = (socket: WebSocket) => isActive && currentSocket === socket;

    const resetStaleTimer = (socket: WebSocket) => {
      clearStaleTimer();

      const timer = setTimeout(() => {
        if (staleTimer === timer) {
          staleTimer = null;
        }

        if (!isCurrentSocket(socket)) return;

        // Closing reuses the normal close handler, which is the sole owner of recovery scheduling.
        socket.close();
      }, staleFeedTimeout);
      staleTimer = timer;
    };

    const handleError = (message: string, nextStatus?: PlaneDetailsSocketStatus) => {
      if (!isActive) return;

      if (nextStatus) {
        setConnectionStatus({ planeId: selectedPlaneId, value: nextStatus });
      }

      setConnectionError({ planeId: selectedPlaneId, message });
    };

    // Retry quickly for short outages, then fall back to slower health probes.
    const scheduleRecovery = () => {
      if (!isActive || isBrowserOffline || reconnectTimer !== null) return;

      if (recoveryPhase === 'fast' && retryCount < maxRetries) {
        const delay = baseRetryDelay * (retryCount + 1);
        retryCount += 1;
        setConnectionStatus({ planeId: selectedPlaneId, value: 'connecting' });
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, delay);

        return;
      }

      recoveryPhase = 'health';
      setConnectionStatus({ planeId: selectedPlaneId, value: 'disconnected' });
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, healthRetryDelay);
    };

    const connect = () => {
      if (!isActive || isBrowserOffline || currentSocket !== null || reconnectTimer !== null) return;

      let socket: WebSocket;

      try {
        socket = new WebSocket(planeDetailsSocketUrl);
      } catch {
        // Constructor failures have no close event, so they enter recovery explicitly.
        queueMicrotask(() => {
          if (!isActive || isBrowserOffline || currentSocket !== null || reconnectTimer !== null) return;

          handleError('Unable to create the plane details WebSocket connection.', 'error');
          scheduleRecovery();
        });

        return;
      }

      currentSocket = socket;
      let hasReceivedPlaneDetails = false;
      let lastApplicationError: string | null = null;

      const handleOpen = () => {
        if (!isCurrentSocket(socket)) return;

        socket.send(JSON.stringify({ type: 'subscribe', planeId: selectedPlaneId }));
        resetStaleTimer(socket);
      };

      const handleMessage = (event: MessageEvent<unknown>) => {
        if (!isCurrentSocket(socket)) return;

        if (typeof event.data !== 'string') {
          handleError('Received a non-text plane details message.');

          return;
        }

        try {
          const result = planeDetailsSocketMessageSchema.safeParse(JSON.parse(event.data));

          if (!result.success) {
            handleError('Received an invalid plane details message.');

            return;
          }

          if (result.data.type === 'error') {
            lastApplicationError = result.data.message;
            handleError(result.data.message, 'error');

            return;
          }

          if (result.data.data.id !== selectedPlaneId) {
            handleError('Received plane details for an unexpected plane.');

            return;
          }

          // Only a validated update for the selected plane proves this feed is still alive.
          resetStaleTimer(socket);
          // Reset recovery only after receiving valid data, not merely when the socket opens.
          if (!hasReceivedPlaneDetails) {
            hasReceivedPlaneDetails = true;
            retryCount = 0;
            recoveryPhase = 'fast';
          }

          setConnectionStatus({ planeId: selectedPlaneId, value: 'connected' });
          setPlane(result.data.data);
          setConnectionError(null);
        } catch {
          handleError('Received malformed plane details JSON.');
        }
      };

      const handleSocketError = () => {
        if (!isCurrentSocket(socket)) return;

        // Transport failures generally emit close next; close is the only recovery owner.
        handleError('The plane details WebSocket connection encountered an error.', 'error');
      };

      const handleClose = (event: CloseEvent) => {
        if (!isCurrentSocket(socket)) return;

        clearStaleTimer();
        currentSocket = null;
        removeCurrentSocketListeners?.();
        removeCurrentSocketListeners = null;

        if (event.code === terminalCloseCode) {
          // Retrying the same rejected subscription cannot make that plane available again.
          clearReconnectTimer();
          setConnectionStatus({ planeId: selectedPlaneId, value: 'error' });
          setConnectionError({
            planeId: selectedPlaneId,
            message: lastApplicationError ?? unavailablePlaneError,
          });

          return;
        }

        scheduleRecovery();
      };

      socket.addEventListener('open', handleOpen);
      socket.addEventListener('message', handleMessage);
      socket.addEventListener('error', handleSocketError);
      socket.addEventListener('close', handleClose);

      removeCurrentSocketListeners = () => {
        socket.removeEventListener('open', handleOpen);
        socket.removeEventListener('message', handleMessage);
        socket.removeEventListener('error', handleSocketError);
        socket.removeEventListener('close', handleClose);
      };
    };

    const handleOnline = () => {
      if (!isActive) return;

      // Preserve retry history: returning online only accelerates the next attempt.
      isBrowserOffline = false;
      clearReconnectTimer();
      if (currentSocket !== null) return;

      // Re-render the initially offline lifecycle without changing its existing status semantics.
      setConnectionStatus((currentStatus) => ({ ...currentStatus }));
      connect();
    };

    const handleOffline = () => {
      if (!isActive) return;

      // Intentional listener removal prevents this close from entering normal recovery.
      isBrowserOffline = true;
      clearReconnectTimer();
      clearStaleTimer();
      setConnectionStatus({ planeId: selectedPlaneId, value: 'disconnected' });

      if (currentSocket !== null) {
        removeCurrentSocketListeners?.();
        removeCurrentSocketListeners = null;
        currentSocket.close();
        currentSocket = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!isBrowserOffline) {
      connect();
    }

    return () => {
      isActive = false;
      clearReconnectTimer();
      clearStaleTimer();

      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      removeCurrentSocketListeners?.();
      removeCurrentSocketListeners = null;

      if (currentSocket !== null) {
        currentSocket.close();
        currentSocket = null;
      }
    };
  }, [selectedPlaneId]);

  const isSelectedConnection = connectionStatus.planeId === selectedPlaneId;

  // State is tagged with its selection so a render after an ID change never exposes stale details.
  return {
    plane: plane?.id === selectedPlaneId ? plane : null,
    status:
      selectedPlaneId === null
        ? 'disconnected'
        : isSelectedConnection
          ? connectionStatus.value
          : navigator.onLine
            ? 'connecting'
            : 'disconnected',
    error: connectionError?.planeId === selectedPlaneId ? connectionError.message : null,
  };
}
