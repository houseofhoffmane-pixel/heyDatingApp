import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth';

let sharedSocket: Socket | null = null;

/**
 * Singleton Socket.IO connection to the /rt namespace, authenticated
 * with the current access token. All screens that need realtime share
 * the same connection — one WS per tab.
 *
 * Returned socket is null until the auth token is available. Callers
 * that subscribe to events should useEffect on the returned socket and
 * guard with `if (!sock) return`.
 */
export function useSocket(): Socket | null {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [sock, setSock] = useState<Socket | null>(sharedSocket);

  useEffect(() => {
    if (!accessToken) {
      if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
      }
      setSock(null);
      return;
    }
    if (sharedSocket && sharedSocket.connected) {
      setSock(sharedSocket);
      return;
    }
    if (sharedSocket) sharedSocket.disconnect();

    sharedSocket = io('/rt', {
      auth: { token: accessToken },
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 500,
    });
    setSock(sharedSocket);

    return () => {
      // Deliberately DO NOT disconnect on unmount — a route change
      // shouldn't tear the connection. We disconnect only when the
      // token changes/clears.
    };
  }, [accessToken]);

  return sock;
}

/** Subscribe to an event for the lifetime of a component. */
export function useSocketEvent<T = any>(event: string, handler: (payload: T) => void, deps: unknown[] = []) {
  const sock = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!sock) return;
    const cb = (payload: T) => handlerRef.current(payload);
    sock.on(event, cb);
    return () => { sock.off(event, cb); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sock, event, ...deps]);
}
