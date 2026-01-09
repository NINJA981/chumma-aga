import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Phone,
    PhoneCall,
    Clock,
    TrendingUp,
    Trophy,
    Users,
    Calendar,
    ChevronRight,
    Zap,
    Target,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import { myStatsApi, followupsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import BentoCard from '../components/ui/BentoCard';
import Shimmer from '../components/ui/Shimmer';

const SalespersonDashboard = () => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadStats = useCallback(async () => {
        try {
            const response = await myStatsApi.dashboard();
            setStats(response.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    // Listen for real-time XP updates
    useEffect(() => {
        if (socket && user) {
            socket.on('xp-update', (data) => {
                if (data.repId === user.id) {
                    loadStats();
                }
            });

            return () => {
                socket.off('xp-update');
            };
        }
    }, [socket, user, loadStats]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const formatDuration = (minutes) => {
        if (minutes < 60) return `${minutes}m`;
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto space-y-6">
                <div className="space-y-2">
                    <Shimmer width="300px" height="40px" />
                    <Shimmer width="200px" height="24px" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Shimmer key={i} height="160px" borderRadius="16px" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">
                        {getGreeting()}, <span className="text-indigo-600">{user?.firstName}</span>
                    </h1>
                    <p className="text-slate-500 text-lg">Here's your performance snapshot for today.</p>
                </div>
                <motion.button
                    onClick={() => navigate('/my-leads')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Phone size={18} />
                    Start Calling
                </motion.button>
            </header>

            {/* Today's Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 }}
                >
                    <BentoCard
                        title="Calls Today"
                        subtitle="Your outreach"
                        icon={PhoneCall}
                        className="h-full"
                    >
                        <div className="mt-3">
                            <div className="text-4xl font-bold text-slate-900">
                                {stats?.today?.calls || 0}
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-sm">
                                <span className="text-emerald-600 font-medium">
                                    {stats?.today?.answered || 0} connected
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500">
                                    {stats?.today?.calls > 0
                                        ? Math.round((stats.today.answered / stats.today.calls) * 100)
                                        : 0}% rate
                                </span>
                            </div>
                        </div>
                    </BentoCard>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <BentoCard
                        title="Talk Time"
                        subtitle="Total duration"
                        icon={Clock}
                        className="h-full"
                    >
                        <div className="mt-3">
                            <div className="text-4xl font-bold text-slate-900">
                                {formatDuration(stats?.today?.talkTimeMinutes || 0)}
                            </div>
                            <div className="mt-2 text-sm text-slate-500">
                                Today's total talk time
                            </div>
                        </div>
                    </BentoCard>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <BentoCard
                        title="Conversions"
                        subtitle="This week"
                        icon={Target}
                        className="h-full"
                    >
                        <div className="mt-3">
                            <div className="text-4xl font-bold text-emerald-600">
                                {stats?.week?.conversions || 0}
                            </div>
                            <div className="mt-2 text-sm text-slate-500">
                                {stats?.week?.calls || 0} total calls this week
                            </div>
                        </div>
                    </BentoCard>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <BentoCard
                        title="Leaderboard"
                        subtitle="Your position"
                        icon={Trophy}
                        className="h-full bg-gradient-to-br from-amber-50 to-orange-50/50"
                    >
                        <div className="mt-3">
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-bold text-amber-600">
                                    #{stats?.leaderboard?.rank || '-'}
                                </span>
                                <span className="text-slate-500 text-sm mb-1">
                                    of {stats?.leaderboard?.totalReps || 0}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-sm">
                                <Zap size={14} className="text-amber-500" />
                                <span className="text-amber-600 font-semibold">
                                    {stats?.leaderboard?.xp || 0} XP
                                </span>
                            </div>
                        </div>
                    </BentoCard>
                </motion.div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leads Overview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-1"
                >
                    <BentoCard
                        title="My Leads"
                        subtitle="Assignment breakdown"
                        icon={Users}
                        className="h-full"
                    >
                        <div className="mt-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">Total Assigned</span>
                                <span className="text-xl font-bold text-slate-900">
                                    {stats?.leads?.total || 0}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {Object.entries(stats?.leads?.byStatus || {}).map(([status, count]) => (
                                    <div key={status} className="flex justify-between items-center text-sm">
                                        <span className="capitalize text-slate-500">{status}</span>
                                        <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${status === 'new' ? 'bg-blue-100 text-blue-700' :
                                                status === 'contacted' ? 'bg-amber-100 text-amber-700' :
                                                    status === 'qualified' ? 'bg-purple-100 text-purple-700' :
                                                        status === 'converted' ? 'bg-emerald-100 text-emerald-700' :
                                                            'bg-slate-100 text-slate-600'
                                            }`}>
                                            {count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <motion.button
                                onClick={() => navigate('/my-leads')}
                                className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
                                whileHover={{ x: 4 }}
                            >
                                View All Leads <ChevronRight size={16} />
                            </motion.button>
                        </div>
                    </BentoCard>
                </motion.div>

                {/* Pending Followups */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-1"
                >
                    <BentoCard
                        title="Follow-ups Due"
                        subtitle="Tasks pending"
                        icon={Calendar}
                        className={`h-full ${stats?.followups?.pending > 0 ? 'border-2 border-amber-200 bg-amber-50/30' : ''}`}
                    >
                        <div className="mt-4 flex flex-col items-center justify-center py-4">
                            {stats?.followups?.pending > 0 ? (
                                <>
                                    <div className="text-5xl font-bold text-amber-600">
                                        {stats.followups.pending}
                                    </div>
                                    <p className="text-amber-700 mt-2 font-medium">
                                        follow-ups need attention
                                    </p>
                                    <motion.button
                                        onClick={() => navigate('/followups')}
                                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <AlertCircle size={16} />
                                        View Follow-ups
                                    </motion.button>
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={48} className="text-emerald-400" />
                                    <p className="text-slate-500 mt-2">All caught up!</p>
                                    <p className="text-slate-400 text-sm">No pending follow-ups</p>
                                </>
                            )}
                        </div>
                    </BentoCard>
                </motion.div>

                {/* Recent Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="lg:col-span-1"
                >
                    <BentoCard
                        title="Recent Activity"
                        subtitle="Last 5 calls"
                        icon={TrendingUp}
                        className="h-full"
                    >
                        <div className="mt-4 space-y-3">
                            {stats?.recentCalls?.length > 0 ? (
                                stats.recentCalls.map((call, index) => (
                                    <div
                                        key={call.id}
                                        className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${call.disposition === 'converted' ? 'bg-emerald-500' :
                                                    call.is_answered ? 'bg-blue-500' : 'bg-slate-300'
                                                }`} />
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">
                                                    {call.lead_first_name
                                                        ? `${call.lead_first_name} ${call.lead_last_name || ''}`
                                                        : call.lead_phone || 'Unknown'}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {new Date(call.started_at).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {Math.floor(call.duration_seconds / 60)}:{String(call.duration_seconds % 60).padStart(2, '0')}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-400 text-center py-4">No calls yet today</p>
                            )}
                        </div>
                    </BentoCard>
                </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-wrap gap-4"
            >
                <motion.button
                    onClick={() => navigate('/my-leads')}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Users size={18} />
                    View My Leads
                </motion.button>
                <motion.button
                    onClick={() => navigate('/my-performance')}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <TrendingUp size={18} />
                    View Performance
                </motion.button>
                <motion.button
                    onClick={() => navigate('/leaderboard')}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Trophy size={18} />
                    Leaderboard
                </motion.button>
            </motion.div>
        </div>
    );
};

export default SalespersonDashboard;
