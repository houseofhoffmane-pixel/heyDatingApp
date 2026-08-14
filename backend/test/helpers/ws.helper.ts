import { io, Socket } from 'socket.io-client';
import type { TestApp } from '../setup/test-app';

/**
 * Connect a Socket.IO client to /rt with the given access token.
 * Returns the live socket — caller is responsible for disconnect().
 */
export async function connectWs(t: TestApp, token: string): Promise<Socket> {
  const sock = io(t.wsUrl, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
  await new Promise<void>((resolve, reject) => {
    sock.once('connect', () => resolve());
    sock.once('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error('ws connect timeout')), 5000);
  });
  return sock;
}

/** Resolve when `event` fires (or reject after `timeoutMs`). */
export function waitFor<T = any>(sock: Socket, event: string, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      sock.off(event, onEvent);
      reject(new Error(`timed out waiting for ${event}`));
    }, timeoutMs);
    const onEvent = (payload: T) => {
      clearTimeout(timer);
      sock.off(event, onEvent);
      resolve(payload);
    };
    sock.on(event, onEvent);
  });
}

/** Emit with an ack callback. */
export function emit<T = any>(sock: Socket, event: string, payload: any, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ack of ${event}`)), timeoutMs);
    sock.emit(event, payload, (ack: T) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}
