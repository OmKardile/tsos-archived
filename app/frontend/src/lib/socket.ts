import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

export function createSocket(): Socket {
  return io(SOCKET_URL, { path: '/socket.io' });
}
