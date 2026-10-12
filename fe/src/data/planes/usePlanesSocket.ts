import { useEffect, useState } from 'react';

import { planesMessageSchema } from './schemas';
import type { PlanesSocketStatus, TrackedPlane } from './types';
import { reconcilePlanes } from './utils';

const planesBasicSocketUrl = import.meta.env.VITE_PLANES_BASIC_WS_URL;
const baseRetryDelay = 1_000;
const maxRetries = 5;
const healthRetryDelay = 10_000;
const staleFeedTimeout = 5_000;

type RecoveryPhase = 'fast' | 'health';

type PlanesSocketState = {
  planes: TrackedPlane[];
  status: PlanesSocketStatus;
  error: string | null;
};

export function usePlanesSocket(): PlanesSocketState {
  const [planes, setPlanes] = useState<TrackedPlane[]>([]);
  const [status, setStatus] = useState<PlanesSocketStatus>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent delayed async callbacks from reconnecting after the hook has been unmounted.
    let isMounted = true;
    // The current socket is the source of truth. Event handlers from an older socket are ignored.
    let currentSocket: WebSocket | null = null;
    let removeCurrentSocketListeners: (() => void) | null = null;
    // At most one timer may create the next socket, whether it represents a fast retry or health probe.
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    // A valid planes snapshot proves the feed is alive; malformed messages must not postpone this watchdog.
    let staleTimer: ReturnType<typeof setTimeout> | null = null;
    // A successful open resets recovery; a later close then starts a fresh fast-retry sequence.
    let retryCount = 0;
    let recoveryPhase: RecoveryPhase = 'fast';

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

    const isCurrentSocket = (socket: WebSocket) => isMounted && currentSocket === socket;

    const resetStaleTimer = (socket: WebSocket) => {
      clearStaleTimer();

      const timer = setTimeout(() => {
        // Only clear the reference if this is still the active stale timer.
        if (staleTimer === timer) {
          staleTimer = null;
        }

        if (!isCurrentSocket(socket)) return;

        // Let the regular close handler own recovery scheduling so stale detection cannot duplicate retries.
        socket.close();
      }, staleFeedTimeout);
      staleTimer = timer;
    };

    const scheduleRecovery = () => {
      if (!isMounted || reconnectTimer !== null) return;

      if (recoveryPhase === 'fast' && retryCount < maxRetries) {
        // Fast recovery is intentionally linear: 1s, 2s, 3s, 4s, then 5s.
        const delay = baseRetryDelay * (retryCount + 1);
        retryCount += 1;
        setStatus('connecting');
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, delay);

        return;
      }

      // Once rapid recovery is exhausted, keep the UI stably disconnected while probing less often.
      recoveryPhase = 'health';
      setStatus('disconnected');
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, healthRetryDelay);
    };

    const connect = () => {
      // This is the only place that creates a socket. The guards make timer callbacks and `online`
      // harmless when another connection attempt is already active.
      if (!isMounted || currentSocket !== null || reconnectTimer !== null) return;

      let socket: WebSocket;

      try {
        socket = new WebSocket(planesBasicSocketUrl);
      } catch {
        // Defer state updates to avoid triggering React's synchronous setState-in-effect lint rule.
        queueMicrotask(() => {
          // State may have changed while this callback was deferred; avoid scheduling recovery
          // if the hook was unmounted or another socket/reconnect has already taken ownership.
          if (!isMounted || currentSocket !== null || reconnectTimer !== null) return;

          setError('Unable to create the planes WebSocket connection.');
          scheduleRecovery();
        });

        return;
      }

      currentSocket = socket;
      let hasReceivedPlanesSnapshot = false;

      const handleOpen = () => {
        if (!isCurrentSocket(socket)) return;

        // Opening the WebSocket only proves the transport is available. The feed becomes live after
        // the first valid planes snapshot, while this timer also catches a server that sends nothing.
        clearReconnectTimer();
        resetStaleTimer(socket);
      };

      const handleMessage = (event: MessageEvent<unknown>) => {
        if (!isCurrentSocket(socket)) return;

        if (typeof event.data !== 'string') {
          // Unexpected WebSocket message format.
          setError('Received a non-text planes message.');

          return;
        }

        try {
          const result = planesMessageSchema.safeParse(JSON.parse(event.data));

          if (!result.success) {
            // Valid JSON, but invalid application payload.
            setError('Received an invalid planes message.');

            return;
          }

          // Only a schema-valid planes snapshot is proof that the basic feed is still making progress.
          resetStaleTimer(socket);
          if (!hasReceivedPlanesSnapshot) {
            hasReceivedPlanesSnapshot = true;
            // Recovery only succeeds once the new connection has actually delivered live data.
            retryCount = 0;
            recoveryPhase = 'fast';
          }
          setStatus('connected');
          setPlanes((previousPlanes) => reconcilePlanes(previousPlanes, result.data.data));
          setError(null);
        } catch {
          // Malformed JSON received from the WebSocket.
          setError('Received malformed planes JSON.');
        }
      };

      const handleSocketError = () => {
        if (!isCurrentSocket(socket)) return;

        // A transport error is normally followed by close, which owns recovery scheduling.
        setError('The planes WebSocket connection encountered an error.');
      };

      const handleClose = () => {
        if (!isCurrentSocket(socket)) return;

        // Drop ownership before scheduling so the timer is allowed to create the replacement socket.
        clearStaleTimer();
        currentSocket = null;
        removeCurrentSocketListeners?.();
        removeCurrentSocketListeners = null;
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
      if (!isMounted || currentSocket !== null) return;

      // Preserve the active phase: an online event accelerates recovery but never resets it.
      // In health mode, a failed immediate attempt therefore returns to 10-second probes, not fast retries.
      clearReconnectTimer();
      connect();
    };

    // While the browser is offline, stop the current connection and pause recovery.
    // The `online` event will start a fresh connection when network access returns.
    const handleOffline = () => {
      if (!isMounted) return;

      clearReconnectTimer();
      clearStaleTimer();
      setStatus('disconnected');

      if (currentSocket !== null) {
        removeCurrentSocketListeners?.();
        removeCurrentSocketListeners = null;
        currentSocket.close();
        currentSocket = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection attempt is made immediately on mount.
    connect();

    return () => {
      // Mark the hook inactive first so closing the socket cannot schedule a reconnect through a late close event.
      isMounted = false;
      clearReconnectTimer();
      clearStaleTimer();

      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (currentSocket !== null) {
        removeCurrentSocketListeners?.();
        removeCurrentSocketListeners = null;
        currentSocket.close();
        currentSocket = null;
      }
    };
  }, []);

  return { planes, status, error };
}
