import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(undefined);

export function SocketProvider({ children }) {
    const { user, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState(null);
    const [leaderboardSocket, setLeaderboardSocket] = useState(null);
    const [warRoomSocket, setWarRoomSocket] = useState(null);
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
