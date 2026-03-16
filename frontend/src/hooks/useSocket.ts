import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const normalizedApiUrl = rawApiUrl?.replace(/\/$/, '');
const apiOrigin = normalizedApiUrl?.replace(/\/api$/, '');
const SOCKET_BASE_URL = apiOrigin || window.location.origin;

export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Reuse existing connection — don't create new socket on every render
    if (!socketInstance) {
      socketInstance = io(`${SOCKET_BASE_URL}/kitchen`, {
        transports:       ['websocket', 'polling'],
        withCredentials:  false,
      });

      socketInstance.on('connect', () => {
        console.log('🔌 Socket connected:', socketInstance?.id);
        socketInstance?.emit('join:kitchen');
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
      });
    }

    socketRef.current = socketInstance;

    return () => {
      // Don't disconnect on unmount — keep connection alive
    };
  }, []);

  return socketRef.current;
}