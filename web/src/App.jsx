import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Leaderboard from './pages/Leaderboard';
import WarRoom from './pages/WarRoom';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SocketProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/*"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Routes>
                                            <Route path="/" element={<Dashboard />} />
                                            <Route path="/leads" element={<Leads />} />
                                            <Route path="/leaderboard" element={<Leaderboard />} />
                                            <Route path="/war-room" element={<WarRoom />} />
                                            <Route path="/analytics" element={<Analytics />} />
                                        </Routes>
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </SocketProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
