import { useEffect, useState } from 'react';
import { analyticsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    Phone,
    PhoneCall,
    Clock,
    TrendingUp,
    Users,
    Target,
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

interface RepStats {
    id: string;
    firstName: string;
    lastName: string;
    calls: number;
    conversions: number;
}

interface DailyTrendData {
    date: string;
    calls: number;
    conversions: number;
}

interface TeamStats {
    overview: {
        totalCalls: number;
        answeredCalls: number;
        connectivityRate: number;
        totalTalkMinutes: number;
        conversions: number;
    };
    reps: RepStats[];
    dailyTrend: DailyTrendData[];
}

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
        );
    }

    const statCards = [
        {
            label: 'Total Calls',
            value: stats?.overview.totalCalls || 0,
            icon: Phone,
            color: 'bg-blue-500',
        },
        {
            label: 'Answered',
            value: stats?.overview.answeredCalls || 0,
            icon: PhoneCall,
            color: 'bg-green-500',
        },
        {
            label: 'Connect Rate',
            value: `${stats?.overview.connectivityRate || 0}%`,
            icon: TrendingUp,
            color: 'bg-purple-500',
        },
        {
            label: 'Talk Time',
            value: `${stats?.overview.totalTalkMinutes || 0}m`,
            icon: Clock,
            color: 'bg-orange-500',
        },
        {
            label: 'Conversions',
            value: stats?.overview.conversions || 0,
            icon: Target,
            color: 'bg-emerald-500',
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    Welcome back, {user?.firstName}! 👋
                </h1>
                <p className="text-slate-600 mt-1">
                    Here's your team's performance for the last 30 days
                </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {statCards.map((stat) => (
                    <div key={stat.label} className="card">
                        <div className="flex items-center gap-4">
                            <div className={`${stat.color} p-3 rounded-lg text-white`}>
                                <stat.icon size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">{stat.label}</p>
                                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Call Trend Chart */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">Call Activity Trend</h2>
                    <span className="text-sm text-slate-500">Last 30 days</span>
                </div>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats?.dailyTrend || []}>
                            <defs>
                                <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                className="text-sm"
                            />
                            <YAxis className="text-sm" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="calls"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fill="url(#callGradient)"
                                name="Calls"
                            />
                            <Area
                                type="monotone"
                                dataKey="answered"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="transparent"
                                name="Answered"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Reps */}
            <div className="card">
                <div className="flex items-center gap-2 mb-6">
                    <Users className="text-indigo-600" size={20} />
                    <h2 className="text-lg font-semibold text-slate-900">Top Performers</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Rep</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Calls</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Answered</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Talk Time</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Conversions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.reps?.slice(0, 5).map((rep: any) => (
                                <tr key={rep.id} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium text-sm">
                                                {rep.first_name?.[0]}{rep.last_name?.[0]}
                                            </div>
                                            <span className="font-medium text-slate-900">
                                                {rep.first_name} {rep.last_name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-right py-3 px-4 text-slate-900">{rep.total_calls}</td>
                                    <td className="text-right py-3 px-4 text-slate-900">{rep.answered_calls}</td>
                                    <td className="text-right py-3 px-4 text-slate-900">
                                        {Math.round(rep.total_talk_seconds / 60)}m
                                    </td>
                                    <td className="text-right py-3 px-4">
                                        <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                                            {rep.conversions}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
