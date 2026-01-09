import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(undefined);

// Demo users for offline/demo access
const DEMO_USERS = {
    admin: {
        id: 'demo-admin-1',
        orgId: 'demo-org-1',
        firstName: 'Alex',
        lastName: 'Manager',
        email: 'admin@demo.com',
        role: 'admin',
    },
    rep: {
        id: 'demo-rep-1',
        orgId: 'demo-org-1',
        firstName: 'Sam',
        lastName: 'Sales',
        email: 'rep@demo.com',
        role: 'rep',
    },
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('demoUser');

        // Check for demo user first
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
                setLoading(false);
                return;
            } catch (e) {
                localStorage.removeItem('demoUser');
            }
        }

        if (storedToken) {
            try {
                // Verify token and get user details
                const response = await authApi.me();
                setUser(response.data.user);
                setLoading(false);
                return;
            } catch (error) {
                console.error('Auth verification failed:', error);
                localStorage.removeItem('token');
            }
        }

        // No auto-login - let user choose demo or credentials
        setLoading(false);
    };

    const login = async (email, password) => {
        setLoading(true);
        try {
            const response = await authApi.login(email, password);
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.removeItem('demoUser');
            setToken(token);
            setUser(user);
        } finally {
            setLoading(false);
        }
    };

    // Demo login - works without backend
    const demoLogin = async (role = 'admin') => {
        setLoading(true);
        try {
            const demoUser = DEMO_USERS[role] || DEMO_USERS.admin;
            localStorage.setItem('demoUser', JSON.stringify(demoUser));
            localStorage.setItem('token', 'demo-token');
            setToken('demo-token');
            setUser(demoUser);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('demoUser');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!user,
                loading,
                login,
                demoLogin,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

