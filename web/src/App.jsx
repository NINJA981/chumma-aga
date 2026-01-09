import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';

// Admin/Manager Pages
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import WarRoom from './pages/WarRoom';
import Analytics from './pages/Analytics';

// Salesperson Pages
import SalespersonDashboard from './pages/SalespersonDashboard';
import MyLeads from './pages/MyLeads';
import MyPerformance from './pages/MyPerformance';
import FollowUps from './pages/FollowUps';

// Shared Pages
import Leaderboard from './pages/Leaderboard';
import Login from './pages/Login';

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

// Role-based home redirect
function HomeRedirect() {
    const { user } = useAuth();

    if (user?.role === 'rep') {
        return <SalespersonDashboard />;
    }
    return <Dashboard />;
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SocketProvider>
                    <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/*"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Routes>
                                            {/* Home - Role-based */}
                                            <Route path="/" element={<HomeRedirect />} />

                                            {/* Salesperson Routes */}
                                            <Route path="/my-leads" element={<MyLeads />} />
                                            <Route path="/my-performance" element={<MyPerformance />} />
                                            <Route path="/followups" element={<FollowUps />} />

                                            {/* Admin/Manager Routes */}
                                            <Route path="/leads" element={<Leads />} />
                                            <Route path="/war-room" element={<WarRoom />} />
                                            <Route path="/analytics" element={<Analytics />} />

                                            {/* Shared Routes */}
                                            <Route path="/leaderboard" element={<Leaderboard />} />
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
