import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Phone,
    Clock,
    Target,
    Zap,
    Calendar,
    BarChart3,
    ArrowUp,
    ArrowDown,
    Minus,
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { myStatsApi } from '../services/api';
import BentoCard from '../components/ui/BentoCard';
import Shimmer from '../components/ui/Shimmer';

const DISPOSITION_COLORS = {
    connected: '#10b981',
    converted: '#6366f1',
    no_answer: '#f59e0b',
    busy: '#ef4444',
    voicemail: '#8b5cf6',
    callback_scheduled: '#14b8a6',
    not_interested: '#64748b',
    unknown: '#cbd5e1',
};

const MyPerformance = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');

    // Demo data for demonstration
    const generateDemoData = () => {
        const days = period === 'today' ? 1 : period === '7d' ? 7 : 30;
        const dailyStats = [];
        const xpHistory = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const calls = Math.floor(Math.random() * 20) + 15;
            const answered = Math.floor(calls * (0.6 + Math.random() * 0.3));
            dailyStats.push({
                date: date.toISOString().split('T')[0],
                calls,
                answered,
            });
            xpHistory.push({
                date: date.toISOString().split('T')[0],
                xp: Math.floor(Math.random() * 200) + 100,
            });
        }

        const hourlyStats = [];
        for (let h = 9; h <= 18; h++) {
            const calls = Math.floor(Math.random() * 15) + 5;
            hourlyStats.push({
                hour: h,
                calls,
                connect_rate: Math.floor(50 + Math.random() * 40),
            });
        }

        return {
            comparison: {
                myCalls: 156,
                teamAvgCalls: 120,
                myTalkTime: 245,
                teamAvgTalkTime: 180,
                myConversions: 8,
                teamAvgConversions: 5,
            },
            dailyStats,
            dispositions: [
                { disposition: 'connected', count: 65 },
                { disposition: 'no_answer', count: 35 },
                { disposition: 'converted', count: 8 },
                { disposition: 'callback_scheduled', count: 22 },
                { disposition: 'busy', count: 15 },
                { disposition: 'voicemail', count: 11 },
            ],
            totalXp: 2450,
            xpHistory,
            hourlyStats,
        };
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await myStatsApi.performance(period);
            setData(response.data);
        } catch (error) {
            console.error('Failed to load performance data, using demo data:', error);
            setData(generateDemoData());
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getComparisonIndicator = (myValue, teamAvg) => {
        if (myValue === teamAvg) return { icon: Minus, color: 'text-slate-400', label: 'At team avg' };
        if (myValue > teamAvg) {
            const diff = Math.round(((myValue - teamAvg) / (teamAvg || 1)) * 100);
            return { icon: ArrowUp, color: 'text-emerald-600', label: `${diff}% above avg` };
        }
        const diff = Math.round(((teamAvg - myValue) / (teamAvg || 1)) * 100);
        return { icon: ArrowDown, color: 'text-red-500', label: `${diff}% below avg` };
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto space-y-6">
                <Shimmer width="300px" height="40px" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Shimmer key={i} height="120px" borderRadius="16px" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Shimmer height="300px" borderRadius="16px" />
                    <Shimmer height="300px" borderRadius="16px" />
                </div>
            </div>
        );
    }

    const comparison = data?.comparison || {};

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Performance</h1>
                    <p className="text-slate-500 mt-1">Track your progress and compare with team averages</p>
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    {[
                        { value: 'today', label: 'Today' },
                        { value: '7d', label: '7 Days' },
                        { value: '30d', label: '30 Days' },
                    ].map((opt) => (
                        <motion.button
                            key={opt.value}
                            onClick={() => setPeriod(opt.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === opt.value
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                            whileTap={{ scale: 0.98 }}
                        >
                            {opt.label}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Calls */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <BentoCard title="Total Calls" subtitle="Your activity" icon={Phone}>
                        <div className="mt-3">
                            <div className="text-4xl font-bold text-slate-900">
                                {comparison.myCalls || 0}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                {(() => {
                                    const indicator = getComparisonIndicator(comparison.myCalls, comparison.teamAvgCalls);
                                    const Icon = indicator.icon;
                                    return (
                                        <>
                                            <Icon size={14} className={indicator.color} />
                                            <span className={`text-sm ${indicator.color}`}>{indicator.label}</span>
                                        </>
                                    );
                                })()}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                Team avg: {comparison.teamAvgCalls || 0}
                            </p>
                        </div>
                    </BentoCard>
                </motion.div>

                {/* Talk Time */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <BentoCard title="Talk Time" subtitle="Total minutes" icon={Clock}>
                        <div className="mt-3">
                            <div className="text-4xl font-bold text-slate-900">
                                {comparison.myTalkTime || 0}m
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                {(() => {
                                    const indicator = getComparisonIndicator(comparison.myTalkTime, comparison.teamAvgTalkTime);
                                    const Icon = indicator.icon;
                                    return (
                                        <>
                                            <Icon size={14} className={indicator.color} />
                                            <span className={`text-sm ${indicator.color}`}>{indicator.label}</span>
                                        </>
                                    );
                                })()}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                Team avg: {comparison.teamAvgTalkTime || 0}m
                            </p>
                        </div>
                    </BentoCard>
                </motion.div>

                {/* Conversions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <BentoCard title="Conversions" subtitle="Deals closed" icon={Target} className="bg-gradient-to-br from-emerald-50 to-teal-50/50">
                        <div className="mt-3">
                            <div className="text-4xl font-bold text-emerald-600">
                                {comparison.myConversions || 0}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                {(() => {
                                    const indicator = getComparisonIndicator(comparison.myConversions, comparison.teamAvgConversions);
                                    const Icon = indicator.icon;
                                    return (
                                        <>
                                            <Icon size={14} className={indicator.color} />
                                            <span className={`text-sm ${indicator.color}`}>{indicator.label}</span>
                                        </>
                                    );
                                })()}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                Team avg: {comparison.teamAvgConversions || 0}
                            </p>
                        </div>
                    </BentoCard>
                </motion.div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Calls Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <BentoCard title="Daily Activity" subtitle="Call trend" icon={TrendingUp} className="h-full">
                        <div className="mt-4 h-64">
                            {data?.dailyStats?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.dailyStats}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                        />
                                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="calls"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            dot={{ fill: '#6366f1', r: 4 }}
                                            name="Calls"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="answered"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            dot={{ fill: '#10b981', r: 4 }}
                                            name="Connected"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400">
                                    No data available for this period
                                </div>
                            )}
                        </div>
                    </BentoCard>
                </motion.div>

                {/* Disposition Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <BentoCard title="Call Outcomes" subtitle="Disposition breakdown" icon={BarChart3} className="h-full">
                        <div className="mt-4 h-64">
                            {data?.dispositions?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.dispositions}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            dataKey="count"
                                            nameKey="disposition"
                                            paddingAngle={2}
                                        >
                                            {data.dispositions.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={DISPOSITION_COLORS[entry.disposition] || DISPOSITION_COLORS.unknown}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value, name) => [value, name.replace('_', ' ')]}
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400">
                                    No data available for this period
                                </div>
                            )}
                        </div>
                        {/* Legend */}
                        {data?.dispositions?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {data.dispositions.slice(0, 5).map((d) => (
                                    <span
                                        key={d.disposition}
                                        className="flex items-center gap-1 text-xs text-slate-600"
                                    >
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: DISPOSITION_COLORS[d.disposition] || DISPOSITION_COLORS.unknown }}
                                        />
                                        {d.disposition.replace('_', ' ')} ({d.count})
                                    </span>
                                ))}
                            </div>
                        )}
                    </BentoCard>
                </motion.div>
            </div>

            {/* XP & Hourly Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* XP Progress */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <BentoCard
                        title="XP Progress"
                        subtitle="Your experience points"
                        icon={Zap}
                        className="h-full bg-gradient-to-br from-amber-50 to-orange-50/50"
                    >
                        <div className="mt-4">
                            <div className="flex items-end gap-2 mb-4">
                                <span className="text-5xl font-bold text-amber-600">
                                    {data?.totalXp || 0}
                                </span>
                                <span className="text-amber-600/60 mb-1">XP</span>
                            </div>

                            {data?.xpHistory?.length > 0 ? (
                                <div className="h-40">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.xpHistory}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                                                tick={{ fontSize: 12, fill: '#92400e' }}
                                            />
                                            <YAxis tick={{ fontSize: 12, fill: '#92400e' }} />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                    background: '#fffbeb',
                                                }}
                                            />
                                            <Bar dataKey="xp" fill="#f59e0b" radius={[4, 4, 0, 0]} name="XP Earned" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="text-amber-600/60 text-sm">No XP earned in this period</p>
                            )}
                        </div>
                    </BentoCard>
                </motion.div>

                {/* Best Hours */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <BentoCard title="Your Best Hours" subtitle="When you connect most" icon={Calendar} className="h-full">
                        <div className="mt-4">
                            {data?.hourlyStats?.length > 0 ? (
                                <>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data.hourlyStats}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis
                                                    dataKey="hour"
                                                    tickFormatter={(h) => `${h}:00`}
                                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                                />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                                                <Tooltip
                                                    formatter={(value, name) => [
                                                        name === 'connect_rate' ? `${value}%` : value,
                                                        name === 'connect_rate' ? 'Connect Rate' : 'Calls',
                                                    ]}
                                                    contentStyle={{
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                    }}
                                                />
                                                <Bar dataKey="connect_rate" fill="#6366f1" radius={[4, 4, 0, 0]} name="Connect Rate" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {/* Top 3 hours */}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {data.hourlyStats
                                            .filter(h => h.calls >= 3)
                                            .sort((a, b) => (b.connect_rate || 0) - (a.connect_rate || 0))
                                            .slice(0, 3)
                                            .map((h, i) => (
                                                <span
                                                    key={h.hour}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${i === 0
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                        }`}
                                                >
                                                    {h.hour}:00 - {h.connect_rate}% connect
                                                </span>
                                            ))}
                                    </div>
                                </>
                            ) : (
                                <div className="h-48 flex items-center justify-center text-slate-400">
                                    Need more data to analyze patterns
                                </div>
                            )}
                        </div>
                    </BentoCard>
                </motion.div>
            </div>
        </div>
    );
};

export default MyPerformance;
