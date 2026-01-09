import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    LayoutDashboard,
    Users,
    Trophy,
    Swords,
    BarChart3,
    Radio,
} from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
}

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/leads', icon: Users, label: 'Leads' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/war-room', icon: Swords, label: 'War Room' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Layout({ children }: LayoutProps) {
    const { user, logout } = useAuth();
    const { connected } = useSocket();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        VocalPulse
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">Sales Intelligence Platform</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`
                            }
                        >
                            <Icon size={20} />
                            <span className="font-medium">{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-semibold">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 text-sm">
                            <Radio size={14} className={connected ? 'text-green-400' : 'text-red-400'} />
                            <span className="text-slate-400">{connected ? 'Live' : 'Offline'}</span>
                        </div>
                        <button
                            onClick={logout}
                            className="text-xs text-slate-400 hover:text-white transition-colors"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
