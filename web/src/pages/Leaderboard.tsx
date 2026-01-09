import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { leaderboardApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Trophy, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';

interface RepRanking {
    repId: string;
    xp: number;
    rank: number;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
}

interface RepDetails {
    xp: number;
    rank: number;
    totalCalls: number;
    answeredCalls: number;
    talkMinutes: number;
    conversions: number;
    conversionRatio: number;
    aiCoachingTip?: string;
}

export default function Leaderboard() {
    const [rankings, setRankings] = useState<RepRanking[]>([]);
    const [selectedRep, setSelectedRep] = useState<string | null>(null);
    const [repDetails, setRepDetails] = useState<RepDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const { leaderboardSocket } = useSocket();

    useEffect(() => {
        loadRankings();
    }, []);

    useEffect(() => {
        if (leaderboardSocket) {
            leaderboardSocket.on('rank_update', (newRankings: RepRanking[]) => {
                setRankings(newRankings);
            });

            return () => {
                leaderboardSocket.off('rank_update');
            };
        }
    }, [leaderboardSocket]);

    const loadRankings = async () => {
        try {
            const response = await leaderboardApi.top(10);
            setRankings(response.data.rankings);
        } catch (error) {
            console.error('Failed to load rankings:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRepDetails = async (repId: string) => {
        try {
            const response = await leaderboardApi.rep(repId);
            setRepDetails(response.data);
        } catch (error) {
            console.error('Failed to load rep details:', error);
        }
    };

    const handleRepClick = (repId: string) => {
        if (selectedRep === repId) {
            setSelectedRep(null);
            setRepDetails(null);
        } else {
            setSelectedRep(repId);
            loadRepDetails(repId);
        }
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) return <span className="rank-badge rank-gold">🥇</span>;
        if (rank === 2) return <span className="rank-badge rank-silver">🥈</span>;
        if (rank === 3) return <span className="rank-badge rank-bronze">🥉</span>;
        return (
            <span className="rank-badge bg-slate-100 text-slate-600">{rank}</span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Trophy className="text-amber-500" size={28} />
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Leaderboard</h1>
                    <p className="text-slate-600">Real-time performance rankings</p>
                </div>
            </div>

            {/* Leaderboard List */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {rankings.map((rep) => (
                        <motion.div
                            key={rep.repId}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={() => handleRepClick(rep.repId)}
                            className={`glass-card p-4 cursor-pointer transition-all duration-200 ${selectedRep === rep.repId ? 'ring-2 ring-indigo-500' : ''
                                } ${rep.rank <= 3 ? 'bg-gradient-to-r from-white/20 to-white/5' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Rank Badge */}
                                {getRankBadge(rep.rank)}

                                {/* Avatar */}
                                <div className={`relative ${rep.rank <= 3 ? 'live-pulse' : ''}`}>
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                        {rep.firstName?.[0]}{rep.lastName?.[0]}
                                    </div>
                                </div>

                                {/* Name & XP */}
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-900">
                                        {rep.firstName} {rep.lastName}
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <TrendingUp size={14} className="text-green-500" />
                                        <span>{Math.round(rep.xp).toLocaleString()} XP</span>
                                    </div>
                                </div>

                                {/* Expand indicator */}
                                <ChevronRight
                                    className={`text-slate-400 transition-transform ${selectedRep === rep.repId ? 'rotate-90' : ''
                                        }`}
                                    size={20}
                                />
                            </div>

                            {/* Expanded Details */}
                            <AnimatePresence>
                                {selectedRep === rep.repId && repDetails && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 pt-4 border-t border-white/10"
                                    >
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-slate-900">{repDetails.totalCalls}</p>
                                                <p className="text-sm text-slate-600">Calls</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-slate-900">{repDetails.answeredCalls}</p>
                                                <p className="text-sm text-slate-600">Answered</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-slate-900">{repDetails.talkMinutes}m</p>
                                                <p className="text-sm text-slate-600">Talk Time</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-emerald-600">{repDetails.conversionRatio}%</p>
                                                <p className="text-sm text-slate-600">Conversion</p>
                                            </div>
                                        </div>

                                        {/* AI Coaching Tip */}
                                        {repDetails.aiCoachingTip && (
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-start gap-2">
                                                <Sparkles className="text-indigo-600 mt-0.5 flex-shrink-0" size={16} />
                                                <p className="text-sm text-indigo-800">{repDetails.aiCoachingTip}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {rankings.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <Trophy className="mx-auto mb-4" size={48} />
                    <p>No rankings yet. Start making calls to climb the leaderboard!</p>
                </div>
            )}
        </div>
    );
}
