import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
    Swords,
    Phone,
    PhoneCall,
    Target,
    Zap,
    Clock,
    TrendingUp,
} from 'lucide-react';

interface Activity {
    id: string;
    type: 'call_made' | 'call_answered' | 'conversion';
    started_at: string;
    duration_seconds: number;
    is_answered: boolean;
    disposition: string;
    rep_first_name: string;
    rep_last_name: string;
    rep_avatar_url?: string;
    lead_first_name?: string;
    lead_last_name?: string;
}

interface Milestone {
    repId: string;
    repName: string;
    type: string;
    value: number;
    message: string;
}

interface Rep {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
}

export default function WarRoom() {
    const [todayCalls, setTodayCalls] = useState(0);
    const [todayConversions, setTodayConversions] = useState(0);
    const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
    const [activeReps, setActiveReps] = useState<Rep[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);
    const { warRoomSocket } = useSocket();

    useEffect(() => {
        loadWarRoomData();
    }, []);

    useEffect(() => {
        if (warRoomSocket) {
            warRoomSocket.on('activity', (activity: Activity) => {
                setRecentActivity((prev) => [activity, ...prev].slice(0, 20));
                if (activity.type === 'call_made' || activity.type === 'call_answered') {
                    setTodayCalls((prev) => prev + 1);
                }
                if (activity.type === 'conversion') {
                    setTodayConversions((prev) => prev + 1);
                }
            });

            warRoomSocket.on('milestone', (milestone: Milestone) => {
                setMilestones((prev) => [milestone, ...prev].slice(0, 5));
                // Auto-remove after 10 seconds
                setTimeout(() => {
                    setMilestones((prev) => prev.filter((m) => m !== milestone));
                }, 10000);
            });

            return () => {
                warRoomSocket.off('activity');
                warRoomSocket.off('milestone');
            };
        }
    }, [warRoomSocket]);

    const loadWarRoomData = async () => {
        try {
            const response = await analyticsApi.warRoom();
            setTodayCalls(response.data.todayCalls);
            setTodayConversions(response.data.todayConversions);
            setRecentActivity(response.data.recentActivity);
            setActiveReps(response.data.activeReps);
        } catch (error) {
            console.error('Failed to load war room data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActivityIcon = (activity: Activity) => {
        if (activity.disposition === 'converted') {
            return <Target className="text-emerald-400" size={18} />;
        }
        if (activity.is_answered) {
            return <PhoneCall className="text-green-400" size={18} />;
        }
        return <Phone className="text-blue-400" size={18} />;
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen -m-8 p-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600/20 rounded-xl">
                        <Swords className="text-indigo-400" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Sales War Room</h1>
                        <p className="text-slate-400">Real-time team activity</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    LIVE
                </div>
            </div>

            {/* Milestone Celebrations */}
            <AnimatePresence>
                {milestones.map((milestone, idx) => (
                    <motion.div
                        key={`${milestone.repId}-${idx}`}
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="celebration mb-4 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl flex items-center gap-4"
                    >
                        <Zap className="text-amber-400" size={24} />
                        <span className="text-lg font-medium">{milestone.message}</span>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="glass-card-dark p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <Phone className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Today's Calls</p>
                            <p className="text-3xl font-bold">{todayCalls}</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card-dark p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-xl">
                            <Target className="text-emerald-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Conversions</p>
                            <p className="text-3xl font-bold">{todayConversions}</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card-dark p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <TrendingUp className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Active Reps</p>
                            <p className="text-3xl font-bold">{activeReps.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="glass-card-dark p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-slate-400" />
                    Live Activity Feed
                </h2>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                        {recentActivity.map((activity, idx) => (
                            <motion.div
                                key={activity.id || idx}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg"
                            >
                                {getActivityIcon(activity)}
                                <div className="flex-1">
                                    <p className="text-sm">
                                        <span className="font-medium text-white">
                                            {activity.rep_first_name} {activity.rep_last_name}
                                        </span>
                                        <span className="text-slate-400">
                                            {activity.is_answered ? ' connected with ' : ' called '}
                                        </span>
                                        <span className="text-slate-300">
                                            {activity.lead_first_name
                                                ? `${activity.lead_first_name} ${activity.lead_last_name}`
                                                : 'Unknown Lead'}
                                        </span>
                                    </p>
                                    {activity.duration_seconds > 0 && (
                                        <p className="text-xs text-slate-500">
                                            Duration: {Math.round(activity.duration_seconds / 60)}m {activity.duration_seconds % 60}s
                                        </p>
                                    )}
                                </div>
                                <span className="text-xs text-slate-500">
                                    {formatTime(activity.started_at)}
                                </span>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {recentActivity.length === 0 && (
                        <p className="text-center text-slate-500 py-8">
                            No activity yet. Make some calls to see them here!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
