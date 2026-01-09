import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    Phone,
    PhoneCall,
    Clock,
    TrendingUp,
    Users,
    Target,
    Sparkles,
    ChevronRight,
    Calendar,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

// Animation variants for staggered entrance
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 24,
        },
    },
};

const cardHoverVariants = {
    rest: { scale: 1, y: 0 },
    hover: {
        scale: 1.02,
        y: -4,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 17,
        },
    },
};

// Custom tooltip for chart
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/50">
                <p className="text-slate-400 text-xs font-medium mb-1">
                    {new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm">
                        <span className="font-medium" style={{ color: entry.color }}>{entry.value}</span>
                        <span className="text-slate-500 ml-1">{entry.name}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        loadStats();
        updateGreeting();
    }, []);

    const updateGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 17) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    };

    const loadStats = async () => {
        try {
            const response = await analyticsApi.team('30d');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Loading skeleton with subtle pulse
    if (loading) {
        return (
            <div className="min-h-screen p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="h-12 w-80 bg-slate-200/60 rounded-2xl animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-28 bg-slate-100/80 rounded-3xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                        ))}
                    </div>
                    <div className="h-80 bg-slate-100/60 rounded-3xl animate-pulse" />
                </div>
            </div>
        );
    }

    const statCards = [
        {
            label: 'Total Calls',
            value: stats?.overview?.totalCalls || 0,
            icon: Phone,
            gradient: 'from-blue-500 to-indigo-600',
            bgGlow: 'bg-blue-500/10',
            trend: '+12%',
            trendUp: true,
        },
        {
            label: 'Answered',
            value: stats?.overview?.answeredCalls || 0,
            icon: PhoneCall,
            gradient: 'from-emerald-500 to-teal-600',
            bgGlow: 'bg-emerald-500/10',
            trend: '+8%',
            trendUp: true,
        },
        {
            label: 'Connect Rate',
            value: `${stats?.overview?.connectivityRate || 0}%`,
            icon: TrendingUp,
            gradient: 'from-violet-500 to-purple-600',
            bgGlow: 'bg-violet-500/10',
            trend: '+3%',
            trendUp: true,
        },
        {
            label: 'Talk Time',
            value: `${stats?.overview?.totalTalkMinutes || 0}m`,
            icon: Clock,
            gradient: 'from-amber-500 to-orange-600',
            bgGlow: 'bg-amber-500/10',
            trend: '+15%',
            trendUp: true,
        },
        {
            label: 'Conversions',
            value: stats?.overview?.conversions || 0,
            icon: Target,
            gradient: 'from-rose-500 to-pink-600',
            bgGlow: 'bg-rose-500/10',
            trend: '+5%',
            trendUp: true,
        },
    ];

    return (
        <motion.div
            className="min-h-screen"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className="max-w-7xl mx-auto space-y-10">

                {/* Breadcrumb */}
                <motion.div variants={itemVariants} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400 font-medium">Home</span>
                    <ChevronRight size={14} className="text-slate-300" />
                    <span className="text-slate-700 font-medium">Dashboard</span>
                </motion.div>

                {/* Header with personalized greeting */}
                <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <motion.div
                                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-full border border-indigo-100/50"
                                whileHover={{ scale: 1.02 }}
                            >
                                <Sparkles size={14} className="text-indigo-500" />
                                <span className="text-xs font-medium text-indigo-600">Live Dashboard</span>
                            </motion.div>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-semibold text-slate-800 tracking-tight">
                            {greeting}, <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{user?.firstName}</span> 👋
                        </h1>
                        <p className="text-slate-500 mt-2 text-lg font-light">
                            Here's how your team is performing this month.
                        </p>
                    </div>

                    {/* Date range selector */}
                    <motion.div
                        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer"
                        whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">Last 30 days</span>
                        <ChevronRight size={14} className="text-slate-400 rotate-90" />
                    </motion.div>
                </motion.div>

                {/* Stat Cards - Asymmetrical grid */}
                <motion.div
                    variants={itemVariants}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-5"
                >
                    {statCards.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            variants={cardHoverVariants}
                            initial="rest"
                            whileHover="hover"
                            className={`relative overflow-hidden bg-white rounded-3xl p-5 lg:p-6 border border-slate-100/80 shadow-sm cursor-default ${index === 0 ? 'col-span-2 md:col-span-1' : ''
                                }`}
                        >
                            {/* Subtle glow background */}
                            <div className={`absolute -top-10 -right-10 w-32 h-32 ${stat.bgGlow} rounded-full blur-3xl opacity-60`} />

                            <div className="relative">
                                <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg mb-4`}>
                                    <stat.icon size={18} className="text-white" />
                                </div>

                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                                        <p className="text-2xl lg:text-3xl font-semibold text-slate-800">{stat.value}</p>
                                    </div>

                                    {stat.trend && (
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${stat.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            <TrendingUp size={12} className={!stat.trendUp ? 'rotate-180' : ''} />
                                            <span className="text-xs font-medium">{stat.trend}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Main content grid - Asymmetrical layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Chart - Takes 2 columns */}
                    <motion.div
                        variants={itemVariants}
                        className="lg:col-span-2 bg-white rounded-3xl p-6 lg:p-8 border border-slate-100/80 shadow-sm"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-800">Call Activity</h2>
                                <p className="text-slate-400 text-sm mt-1">Daily performance trend</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                    <span className="text-xs text-slate-500 font-medium">Calls</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="text-xs text-slate-500 font-medium">Answered</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats?.dailyTrend || []}>
                                    <defs>
                                        <linearGradient id="callGradientPremium" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="answeredGradientPremium" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="0" stroke="#f1f5f9" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { day: 'numeric' })}
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        width={40}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="calls"
                                        stroke="#6366f1"
                                        strokeWidth={2.5}
                                        fill="url(#callGradientPremium)"
                                        name="Calls"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="answered"
                                        stroke="#10b981"
                                        strokeWidth={2.5}
                                        fill="url(#answeredGradientPremium)"
                                        name="Answered"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Top Performers - Sidebar style */}
                    <motion.div
                        variants={itemVariants}
                        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden"
                    >
                        {/* Glassmorphism overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />

                        <div className="relative">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                                    <Users size={18} className="text-indigo-300" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">Top Performers</h2>
                                    <p className="text-slate-400 text-xs">This month</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <AnimatePresence>
                                    {stats?.reps?.slice(0, 5).map((rep, index) => (
                                        <motion.div
                                            key={rep.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1, type: 'spring', stiffness: 300 }}
                                            whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                                            className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors"
                                        >
                                            {/* Rank badge */}
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' :
                                                    index === 1 ? 'bg-slate-300 text-slate-700' :
                                                        index === 2 ? 'bg-amber-700 text-amber-100' :
                                                            'bg-slate-700 text-slate-300'
                                                }`}>
                                                {index + 1}
                                            </div>

                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-semibold">
                                                {rep.first_name?.[0]}{rep.last_name?.[0]}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {rep.first_name} {rep.last_name}
                                                </p>
                                                <p className="text-slate-400 text-xs">{rep.total_calls} calls</p>
                                            </div>

                                            {/* Conversions */}
                                            <div className="text-right">
                                                <p className="text-emerald-400 font-semibold text-sm">{rep.conversions}</p>
                                                <p className="text-slate-500 text-xs">conv.</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {(!stats?.reps || stats.reps.length === 0) && (
                                    <div className="text-center py-8">
                                        <Users className="mx-auto mb-3 text-slate-600" size={32} />
                                        <p className="text-slate-400 text-sm">No activity yet</p>
                                        <p className="text-slate-500 text-xs mt-1">Start making calls to see rankings!</p>
                                    </div>
                                )}
                            </div>

                            {/* View all link */}
                            {stats?.reps?.length > 0 && (
                                <motion.button
                                    whileHover={{ x: 4 }}
                                    className="flex items-center gap-2 mt-6 text-sm text-indigo-300 font-medium"
                                >
                                    View full leaderboard
                                    <ChevronRight size={16} />
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
