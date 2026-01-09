import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
    leaderboardSocket: Socket | null;
    warRoomSocket: Socket | null;
    connected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [leaderboardSocket, setLeaderboardSocket] = useState<Socket | null>(null);
    const [warRoomSocket, setWarRoomSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user) {
            // Main socket
            const mainSocket = io('/', {
                withCredentials: true,
            });

            mainSocket.on('connect', () => {
                setConnected(true);
                mainSocket.emit('join_org', user.orgId);
            });

            mainSocket.on('disconnect', () => setConnected(false));
            setSocket(mainSocket);

            // Leaderboard namespace
            const lbSocket = io('/leaderboard', { withCredentials: true });
            lbSocket.on('connect', () => lbSocket.emit('join_org', user.orgId));

            // Heartbeat
            const heartbeatInterval = setInterval(() => {
                lbSocket.emit('heartbeat');
            }, 30000);

            setLeaderboardSocket(lbSocket);

            // War Room namespace
            const wrSocket = io('/warroom', { withCredentials: true });
            wrSocket.on('connect', () => wrSocket.emit('join_org', user.orgId));
            setWarRoomSocket(wrSocket);

            return () => {
                clearInterval(heartbeatInterval);
                mainSocket.disconnect();
                lbSocket.disconnect();
                wrSocket.disconnect();
            };
        }
    }, [isAuthenticated, user]);

    return (
        <SocketContext.Provider value={{ socket, leaderboardSocket, warRoomSocket, connected }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}
