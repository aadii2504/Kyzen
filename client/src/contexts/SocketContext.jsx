import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [emergency, setEmergency] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('request:initialData');
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('emergency:activate', (data) => setEmergency(data));
    socket.on('emergency:deactivate', () => setEmergency(null));
    socket.on('announcement', (data) => {
      setAnnouncement(data);
    });
    socket.on('announcement:clear', () => {
      setAnnouncement(null);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      emergency,
      announcement,
      setEmergency,
      setAnnouncement
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
export default SocketContext;
