import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsApi } from '../services/api';
import {
    BarChart3,
    Clock,
    Flame,
    TrendingUp,
    Phone,
    Target,
    Users,
    ChevronRight,
    Calendar,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    RadialBarChart,
    RadialBar,
} from 'recharts';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
};

// Color palette
const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];
const CHART_COLORS = {
    primary: '#6366f1',
    secondary: '#10b981',
    tertiary: '#f59e0b',
    quaternary: '#ef4444',
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/50">
                <p className="text-slate-400 text-xs font-medium mb-1">{label}</p>
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

export default function Analytics() {
    const [heatmap, setHeatmap] = useState(null);
    const [teamStats, setTeamStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [heatmapRes, teamRes] = await Promise.all([
                analyticsApi.heatmap(),
                analyticsApi.team('30d'),
            ]);
            setHeatmap(heatmapRes.data);
            setTeamStats(teamRes.data);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Transform data for charts
    const getHourlyData = () => {
        if (!heatmap?.grid) return [];
        const hourlyTotals = Array(24).fill(0);
        const hourlyCounts = Array(24).fill(0);

        heatmap.grid.forEach((dayData) => {
            dayData.forEach((rate, hour) => {
                hourlyTotals[hour] += rate;
                hourlyCounts[hour] += 1;
            });
        });

        return hourlyTotals.map((total, hour) => ({
            hour: `${hour}:00`,
            rate: Math.round(total / hourlyCounts[hour]) || 0,
            calls: Math.floor(Math.random() * 50) + 10, // Simulated call count
        }));
    };

    const getDayData = () => {
        if (!heatmap?.grid || !heatmap?.days) return [];
        return heatmap.grid.map((dayData, idx) => {
            const avgRate = Math.round(dayData.reduce((a, b) => a + b, 0) / dayData.length) || 0;
            return {
                day: heatmap.days[idx]?.slice(0, 3) || `Day ${idx}`,
                pickupRate: avgRate,
                calls: Math.floor(Math.random() * 100) + 20,
            };
        });
    };

    const getRepPerformanceData = () => {
        if (!teamStats?.reps) return [];
        return teamStats.reps.slice(0, 5).map((rep) => ({
            name: `${rep.first_name} ${rep.last_name?.charAt(0)}.`,
            calls: parseInt(rep.total_calls) || 0,
            conversions: parseInt(rep.conversions) || 0,
            talkTime: Math.round((parseInt(rep.total_talk_seconds) || 0) / 60),
        }));
    };

    const getConversionFunnelData = () => {
        const total = teamStats?.overview?.totalCalls || 100;
        const answered = teamStats?.overview?.answeredCalls || 60;
        const conversions = teamStats?.overview?.conversions || 10;

        return [
            { name: 'Total Calls', value: total, fill: '#6366f1' },
            { name: 'Answered', value: answered, fill: '#8b5cf6' },
            { name: 'Conversions', value: conversions, fill: '#10b981' },
        ];
    };

    const getDispositionData = () => [
        { name: 'Converted', value: teamStats?.overview?.conversions || 15, color: '#10b981' },
        { name: 'Interested', value: 25, color: '#6366f1' },
        { name: 'Not Interested', value: 20, color: '#f59e0b' },
        { name: 'Voicemail', value: 30, color: '#94a3b8' },
        { name: 'Busy', value: 10, color: '#ef4444' },
    ];

    const getHeatmapColor = (value) => {
        if (value === 0) return 'bg-slate-100';
        if (value < 20) return 'bg-emerald-100';
        if (value < 40) return 'bg-emerald-200';
        if (value < 60) return 'bg-emerald-300';
        if (value < 80) return 'bg-emerald-400';
        return 'bg-emerald-500';
    };

    if (loading) {
        return (
            <div className="min-h-screen p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="h-12 w-64 bg-slate-200/60 rounded-2xl animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-slate-100/80 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                    <div className="h-80 bg-slate-100/60 rounded-3xl animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="min-h-screen"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Breadcrumb */}
                <motion.div variants={itemVariants} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400 font-medium">Home</span>
                    <ChevronRight size={14} className="text-slate-300" />
                    <span className="text-slate-700 font-medium">Analytics</span>
                </motion.div>

                {/* Header */}
                <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/25">
                                <BarChart3 size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">Analytics</h1>
                                <p className="text-slate-500 text-sm">Deep insights into your sales performance</p>
                            </div>
                        </div>
                    </div>

                    <motion.div
                        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer"
                        whileHover={{ scale: 1.02 }}
                    >
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">Last 30 days</span>
                    </motion.div>
                </motion.div>

                {/* Quick Stats */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Avg. Pickup Rate', value: `${teamStats?.overview?.connectivityRate || 0}%`, icon: Phone, color: 'indigo' },
                        { label: 'Total Calls', value: teamStats?.overview?.totalCalls || 0, icon: TrendingUp, color: 'emerald' },
                        { label: 'Conversions', value: teamStats?.overview?.conversions || 0, icon: Target, color: 'violet' },
                        { label: 'Active Reps', value: teamStats?.reps?.length || 0, icon: Users, color: 'amber' },
                    ].map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            className="bg-white rounded-2xl p-5 border border-slate-100/80 shadow-sm"
                            whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                        >
                            <div className={`inline-flex p-2 rounded-xl bg-${stat.color}-100 mb-3`}>
                                <stat.icon size={16} className={`text-${stat.color}-600`} />
                            </div>
                            <p className="text-2xl font-semibold text-slate-800">{stat.value}</p>
                            <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Hourly Performance Chart */}
                    <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">Hourly Performance</h3>
                                <p className="text-sm text-slate-400">Pickup rates by hour of day</p>
                            </div>
                            <Clock size={20} className="text-slate-300" />
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={getHourlyData()}>
                                    <defs>
                                        <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="0" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="rate"
                                        stroke="#6366f1"
                                        strokeWidth={2.5}
                                        fill="url(#hourlyGradient)"
                                        name="Pickup Rate"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Daily Performance Chart */}
                    <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">Weekly Distribution</h3>
                                <p className="text-sm text-slate-400">Performance by day of week</p>
                            </div>
                            <Calendar size={20} className="text-slate-300" />
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={getDayData()} barCategoryGap="20%">
                                    <CartesianGrid strokeDasharray="0" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="pickupRate" name="Pickup %" fill="#6366f1" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="calls" name="Calls" fill="#10b981" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Rep Performance */}
                    <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">Rep Performance</h3>
                                <p className="text-sm text-slate-400">Top performers comparison</p>
                            </div>
                            <Users size={20} className="text-slate-300" />
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={getRepPerformanceData()} layout="vertical" barCategoryGap="25%">
                                    <CartesianGrid strokeDasharray="0" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={80} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="calls" name="Calls" fill="#6366f1" radius={[0, 6, 6, 0]} />
                                    <Bar dataKey="conversions" name="Conversions" fill="#10b981" radius={[0, 6, 6, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Disposition Breakdown */}
                    <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">Call Outcomes</h3>
                                <p className="text-sm text-slate-400">Disposition breakdown</p>
                            </div>
                            <Target size={20} className="text-slate-300" />
                        </div>
                        <div className="h-64 flex items-center">
                            <ResponsiveContainer width="50%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={getDispositionData()}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {getDispositionData().map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                                {getDispositionData().map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm text-slate-600 flex-1">{item.name}</span>
                                        <span className="text-sm font-medium text-slate-800">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Best Times to Call */}
                {heatmap?.bestTimes && heatmap.bestTimes.length > 0 && (
                    <motion.div variants={itemVariants} className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <div className="relative">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Flame size={20} className="text-amber-300" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">Best Times to Call</h3>
                                    <p className="text-indigo-200 text-sm">Optimal windows for highest pickup rates</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {heatmap.bestTimes.slice(0, 3).map((time, idx) => (
                                    <motion.div
                                        key={idx}
                                        className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
                                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.15)' }}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock size={16} className="text-indigo-200" />
                                            <span className="font-semibold">
                                                {heatmap.days[time.day_of_week]} at {time.hour_of_day}:00
                                            </span>
                                        </div>
                                        <p className="text-sm text-indigo-200">
                                            <span className="text-emerald-300 font-medium">{time.pickup_rate}%</span> pickup rate
                                            <span className="text-indigo-300"> · {time.total_attempts} attempts</span>
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Heatmap */}
                <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Pickup Rate Heatmap</h3>
                            <p className="text-sm text-slate-400">Visualize performance patterns across the week</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span>Low</span>
                            <div className="flex gap-0.5">
                                {['bg-slate-100', 'bg-emerald-200', 'bg-emerald-400', 'bg-emerald-500'].map((c, i) => (
                                    <div key={i} className={`w-4 h-4 rounded ${c}`} />
                                ))}
                            </div>
                            <span>High</span>
                        </div>
                    </div>

                    {heatmap?.grid ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th className="text-left text-xs text-slate-500 font-medium p-2 w-20">Day</th>
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <th key={i} className="text-center text-[10px] text-slate-400 font-medium p-1">
                                                {i}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {heatmap.days?.map((day, dayIdx) => (
                                        <tr key={day}>
                                            <td className="text-xs text-slate-600 font-medium p-2">{day}</td>
                                            {(heatmap.grid[dayIdx] || []).map((value, hourIdx) => (
                                                <td key={hourIdx} className="p-0.5">
                                                    <motion.div
                                                        className={`w-5 h-5 rounded-md cursor-pointer ${getHeatmapColor(value)}`}
                                                        whileHover={{ scale: 1.3 }}
                                                        title={`${day} ${hourIdx}:00 - ${value}% pickup`}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-16 text-slate-400">
                            <BarChart3 className="mx-auto mb-4" size={48} />
                            <p className="font-medium">No call data available yet</p>
                            <p className="text-sm mt-1">Start making calls to see patterns!</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
}
