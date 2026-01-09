import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    LayoutDashboard,
    Users,
    Trophy,
    Swords,
    BarChart3,
    Radio,
    LogOut,
    Settings,
    Bell,
    Search,
    ChevronRight,
} from 'lucide-react';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', description: 'Overview & metrics' },
    { to: '/leads', icon: Users, label: 'Leads', description: 'Manage contacts' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard', description: 'Team rankings' },
    { to: '/war-room', icon: Swords, label: 'War Room', description: 'Live activity' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics', description: 'Deep insights' },
];

const sidebarVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 24,
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

const navItemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
};

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const { connected } = useSocket();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex">
            {/* Premium Sidebar */}
            <motion.aside
                className="w-72 bg-slate-900/95 backdrop-blur-2xl text-white flex flex-col border-r border-slate-800/50 relative overflow-hidden"
                initial="hidden"
                animate="visible"
                variants={sidebarVariants}
            >
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/5 to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

                {/* Logo */}
                <motion.div
                    className="relative p-6 pb-4"
                    variants={navItemVariants}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <span className="text-lg font-bold">V</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                VocalPulse
                            </h1>
                            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Sales Intelligence</p>
                        </div>
                    </div>
                </motion.div>

                {/* Search bar */}
                <motion.div
                    className="relative px-4 mb-2"
                    variants={navItemVariants}
                >
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors">
                        <Search size={14} className="text-slate-500" />
                        <span className="text-sm text-slate-500">Quick search...</span>
                        <span className="ml-auto text-[10px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded font-mono">⌘K</span>
                    </div>
                </motion.div>

                {/* Navigation */}
                <nav className="relative flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(({ to, icon: Icon, label, description }) => {
                        const isActive = location.pathname === to;

                        return (
                            <motion.div key={to} variants={navItemVariants}>
                                <NavLink
                                    to={to}
                                    className="block"
                                >
                                    <motion.div
                                        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                            ? 'bg-gradient-to-r from-indigo-600/90 to-violet-600/90 text-white shadow-lg shadow-indigo-500/20'
                                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                                            }`}
                                        whileHover={{ x: isActive ? 0 : 4 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-sm font-medium">{label}</span>
                                            {isActive && (
                                                <p className="text-[10px] text-indigo-200 mt-0.5">{description}</p>
                                            )}
                                        </div>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeIndicator"
                                                className="absolute right-2 w-1.5 h-8 rounded-full bg-white/30"
                                            />
                                        )}
                                    </motion.div>
                                </NavLink>
                            </motion.div>
                        );
                    })}
                </nav>

                {/* User section */}
                <motion.div
                    className="relative p-4 border-t border-slate-800/50"
                    variants={navItemVariants}
                >
                    {/* Connection status */}
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-2">
                            <motion.div
                                className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`}
                                animate={connected ? { scale: [1, 1.2, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 2 }}
                            />
                            <span className="text-xs text-slate-500 font-medium">
                                {connected ? 'Connected' : 'Offline'}
                            </span>
                        </div>
                        <motion.button
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Bell size={14} />
                        </motion.button>
                    </div>

                    {/* User card */}
                    <motion.div
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 cursor-pointer hover:bg-slate-800/60 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-semibold text-sm shadow-lg">
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-[10px] text-slate-500 capitalize font-medium">{user?.role}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-600" />
                    </motion.div>

                    {/* Logout */}
                    <motion.button
                        onClick={logout}
                        className="flex items-center gap-2 w-full mt-3 px-3 py-2 text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        whileHover={{ x: 4 }}
                    >
                        <LogOut size={12} />
                        <span>Sign out</span>
                    </motion.button>
                </motion.div>
            </motion.aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8 lg:p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
