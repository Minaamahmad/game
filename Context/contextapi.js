"use client";
import { createContext, useContext, useEffect } from "react";
import { socket } from "@/lib/socket";

const SocketContext = createContext(socket);

export function SocketProvider({ children }) {
  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect(); // run on disconnecting
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);