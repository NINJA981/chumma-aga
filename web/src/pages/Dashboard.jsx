import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, PhoneOff, TrendingUp, Users, Zap, CheckCircle } from 'lucide-react';
import BentoCard from '../components/ui/BentoCard';
import TactileButton from '../components/ui/TactileButton';
import KineticText from '../components/ui/KineticText';
import { mockDashboardStats } from '../utils/mockData';
import JSConfetti from 'js-confetti';

const Dashboard = () => {
    const [stats, setStats] = useState(mockDashboardStats);
    const [jsConfetti] = useState(new JSConfetti());

    const handleCelebrate = () => {
        jsConfetti.addConfetti({
            emojis: ['🎉', '💸', '🚀', '💰'],
            confettiNumber: 50,
        });
    };

    // Simulate real-time stats updates slightly
    useEffect(() => {
        const interval = setInterval(() => {
            // Randomly toggle energy to test animations
            setStats(prev => ({ ...prev }));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const isRevenueLeakageCritical = stats.revenueLeakage.missedCalls > 5;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">
                        Good Morning, <span className="text-indigo-600">Arjun</span>
                    </h1>
                    <p className="text-slate-500 text-lg">Here's your team's pulse for today.</p>
                </div>
                <TactileButton variant="primary" onClick={handleCelebrate} icon={CheckCircle}>
                    Mark Converted (Demo)
                </TactileButton>
            </header>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Team Energy Card */}
                <BentoCard
                    title="Team Energy"
                    subtitle="Total Talk Time"
                    icon={Zap}
                    className="md:col-span-2"
                >
                    <div className="flex items-end space-x-4 mt-4">
                        <div className="text-6xl font-bold text-slate-900 tracking-tighter">
                            <KineticText text={stats.teamEnergy.totalTalkTime} />
                        </div>
                        <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm font-semibold mb-2">
                            <TrendingUp size={16} className="mr-1" />
                            {stats.teamEnergy.trend}
                        </div>
                    </div>
                    <div className="mt-6 flex -space-x-3 overflow-hidden p-2">
                        {stats.activeAgents.map((agent, i) => (
                            <img
                                key={i}
                                className="inline-block h-10 w-10 rounded-full ring-2 ring-white"
                                src={agent.avatar}
                                alt={agent.name}
                            />
                        ))}
                        <div className="flex items-center justify-center h-10 w-10 rounded-full ring-2 ring-white bg-slate-100 text-xs font-medium text-slate-500">
                            +4
                        </div>
                    </div>
                </BentoCard>

                {/* Revenue Leakage Card - Red Alert */}
                <BentoCard
                    title="Missed Opportunities"
                    subtitle="Revenue Leakage"
                    icon={PhoneOff}
                    delay={0.1}
                    className={`border-2 transition-colors duration-500 ${isRevenueLeakageCritical ? 'border-red-200 bg-red-50/30' : 'border-transparent'}`}
                >
                    <div className={`mt-2 ${isRevenueLeakageCritical ? 'animate-pulse' : ''}`}>
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tight">
                            {stats.revenueLeakage.missedCalls} <span className="text-lg text-slate-500 font-normal">Calls</span>
                        </h2>
                        <p className="text-red-600 font-semibold mt-1">
                            Est. Loss: {stats.revenueLeakage.potentialLoss}
                        </p>
                        <p className="text-slate-500 text-sm mt-4">
                            {stats.revenueLeakage.details}
                        </p>
                        {isRevenueLeakageCritical && (
                            <div className="mt-4 flex items-center text-xs font-bold text-red-600 bg-red-100 px-3 py-1.5 rounded-lg w-fit">
                                <Activity size={14} className="mr-2 animate-bounce" />
                                RED ALERT: High Leakage
                            </div>
                        )}
                    </div>
                </BentoCard>

                {/* Third Card for balance or future stats - e.g. Leaderboard preview */}
                <BentoCard
                    title="Top Performer"
                    subtitle="Most Conversions"
                    icon={Users}
                    delay={0.2}
                >
                    <div className="flex items-center mt-4">
                        <img
                            className="h-16 w-16 rounded-full border-4 border-indigo-100"
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"
                            alt="Priya"
                        />
                        <div className="ml-4">
                            <h3 className="text-xl font-bold text-slate-800">Priya Sharma</h3>
                            <p className="text-indigo-600 font-medium">8 Deals Closed</p>
                        </div>
                    </div>
                </BentoCard>
            </div>
        </div>
    );
};

export default Dashboard;
