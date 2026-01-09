import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const storedToken = localStorage.getItem('token');
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

        // Auto-login with demo credentials
        try {
            await login('admin@demo.com', 'password');
        } catch (error) {
            console.error('Auto-login failed:', error);
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        setLoading(true);
        try {
            const response = await authApi.login(email, password);
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
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
