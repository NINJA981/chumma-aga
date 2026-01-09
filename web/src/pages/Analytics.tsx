import { useEffect, useState } from 'react';
import { analyticsApi } from '../services/api';
import { BarChart3, Clock, Flame } from 'lucide-react';

interface HeatmapData {
    grid: number[][];
    attempts: number[][];
    bestTimes: any[];
    days: string[];
    hours: string[];
}

export default function Analytics() {
    const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHeatmap();
    }, []);

    const loadHeatmap = async () => {
        try {
            const response = await analyticsApi.heatmap();
            setHeatmap(response.data);
        } catch (error) {
            console.error('Failed to load heatmap:', error);
        } finally {
            setLoading(false);
        }
    };

    const getHeatmapColor = (value: number): string => {
        if (value === 0) return 'bg-slate-100';
        if (value < 20) return 'bg-green-100';
        if (value < 40) return 'bg-green-200';
        if (value < 60) return 'bg-green-300';
        if (value < 80) return 'bg-green-400';
        return 'bg-green-500';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <BarChart3 className="text-indigo-600" size={28} />
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
                    <p className="text-slate-600">Call patterns and optimization insights</p>
                </div>
            </div>

            {/* Best Times Summary */}
            {heatmap?.bestTimes && heatmap.bestTimes.length > 0 && (
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <Flame className="text-orange-500" size={20} />
                        <h2 className="text-lg font-semibold text-slate-900">Best Times to Call</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {heatmap.bestTimes.slice(0, 3).map((time: any, idx: number) => (
                            <div key={idx} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="text-indigo-600" size={16} />
                                    <span className="font-semibold text-slate-900">
                                        {heatmap.days[time.day_of_week]} at {time.hour_of_day}:00
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600">
                                    <span className="text-green-600 font-medium">{time.pickup_rate}%</span> pickup rate
                                    <span className="text-slate-400"> · {time.total_attempts} attempts</span>
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Heatmap */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">Call Pickup Heatmap</h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>Low</span>
                        <div className="flex gap-1">
                            <div className="w-4 h-4 rounded bg-slate-100" />
                            <div className="w-4 h-4 rounded bg-green-200" />
                            <div className="w-4 h-4 rounded bg-green-400" />
                            <div className="w-4 h-4 rounded bg-green-500" />
                        </div>
                        <span>High</span>
                    </div>
                </div>

                {heatmap?.grid ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="text-left text-sm text-slate-500 font-medium p-2">Day</th>
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <th key={i} className="text-center text-xs text-slate-500 font-medium p-1">
                                            {i}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {heatmap.days.map((day, dayIdx) => (
                                    <tr key={day}>
                                        <td className="text-sm text-slate-700 font-medium p-2">{day}</td>
                                        {heatmap.grid[dayIdx]?.map((value, hourIdx) => (
                                            <td key={hourIdx} className="p-1">
                                                <div
                                                    className={`w-6 h-6 rounded cursor-pointer transition-all hover:scale-110 ${getHeatmapColor(
                                                        value
                                                    )}`}
                                                    title={`${day} ${hourIdx}:00 - ${value}% pickup rate (${heatmap.attempts[dayIdx]?.[hourIdx] || 0
                                                        } attempts)`}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-500">
                        <BarChart3 className="mx-auto mb-4" size={48} />
                        <p>No call data available yet. Start making calls to see patterns!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
