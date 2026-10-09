import { useEffect, useState } from 'react';

import { planesMessageSchema } from './schemas';
import type { PlanesSocketStatus, TrackedPlane } from './types';
import { reconcilePlanes } from './utils';

const planesBasicSocketUrl = import.meta.env.VITE_PLANES_BASIC_WS_URL;

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
    // Guards the queued constructor-failure callback, not WebSocket event listeners.
    let isActive = true;
    let socket: WebSocket;

    const handleError = (message: string, nextStatus?: PlanesSocketStatus) => {
      if (!isActive) return;

      if (nextStatus) {
        setStatus(nextStatus);
      }

      setError(message);
    };

    try {
      socket = new WebSocket(planesBasicSocketUrl);
    } catch {
      // Synchronous WebSocket construction failure.
      queueMicrotask(() => {
        handleError('Unable to create the planes WebSocket connection.', 'error');
      });

      return () => {
        isActive = false;
      };
    }

    const handleOpen = () => {
      setStatus('connected');
      setError(null);
    };

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (typeof event.data !== 'string') {
        // Unexpected WebSocket message format.
        handleError('Received a non-text planes message.');

        return;
      }

      try {
        const result = planesMessageSchema.safeParse(JSON.parse(event.data));

        if (!result.success) {
          // Valid JSON, but invalid application payload.
          handleError('Received an invalid planes message.');

          return;
        }

        setPlanes((previousPlanes) => reconcilePlanes(previousPlanes, result.data.data));
        setError(null);
      } catch {
        // Malformed JSON received from the WebSocket.
        handleError('Received malformed planes JSON.');
      }
    };

    const handleSocketError = () => {
      // Transport-level WebSocket error, not an application error from the backend.
      handleError('The planes WebSocket connection encountered an error.', 'error');
    };

    const handleClose = () => {
      setStatus((currentStatus) => (currentStatus === 'error' ? 'error' : 'disconnected'));
    };

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('error', handleSocketError);
    socket.addEventListener('close', handleClose);

    return () => {
      isActive = false;

      // Mirror setup before closing the connection.
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('error', handleSocketError);
      socket.removeEventListener('close', handleClose);

      socket.close();
    };
  }, []);

  return { planes, status, error };
}
