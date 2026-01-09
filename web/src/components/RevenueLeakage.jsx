
import { useEffect, useState } from 'react';
import { DollarSign, AlertTriangle } from 'lucide-react';
import { analyticsApi } from '../services/api';

export default function RevenueLeakage() {
    const [leakage, setLeakage] = useState(0);

    useEffect(() => {
        // Fetch stats or use socket for real-time
        // Calculation: (Missed Calls - Followups) * 500
        // Simulating data fetch
        const calculateLeakage = async () => {
            // const stats = await analyticsApi.getStats();
            // const missed = stats.missedCalls;
            // const followups = stats.followups;
            const missed = 12; // Demo
            const followups = 4;
            setLeakage((missed - followups) * 500);
        };
        calculateLeakage();
    }, []);

    return (
        <div className="bg-gradient-to-br from-red-50 to-white rounded-3xl p-6 border border-red-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-xl">
                    <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">Revenue Leakage</h3>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
                <p className="text-sm text-slate-500 mb-1">Estimated Loss Today</p>
                <div className="text-4xl font-bold text-red-600 flex items-center">
                    <DollarSign size={28} />
                    {leakage.toLocaleString()}
                </div>
                <p className="text-xs text-red-400 mt-2 text-center px-4">
                    Based on missed calls vs follow-up actions ($500 avg. deal)
                </p>
            </div>
        </div>
    );
}
