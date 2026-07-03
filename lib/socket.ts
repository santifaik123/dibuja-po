"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 6,
      reconnectionDelay: 600,
    });
  }

  return socket;
}
