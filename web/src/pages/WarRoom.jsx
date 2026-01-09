import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Clock, AlertCircle, PlayCircle, Smile, Frown, Meh, Zap } from 'lucide-react';
import BentoCard from '../components/ui/BentoCard';
import KineticText from '../components/ui/KineticText';
import { warRoomFeed } from '../utils/mockData';

const coachingScenarios = {
    pricing: {
        trigger: "Pricing Objection",
        script: "We can offer a 5% discount if you close before EOM...",
        sentiment: 'negative'
    },
    competito: {
        trigger: "Competitor Mention",
        script: "Highlight our superior AI analytics and 24/7 support.",
        sentiment: 'neutral'
    },
    feature: {
        trigger: "Feature Request",
        script: "That is on our roadmap for Q3! We can add you to beta.",
        sentiment: 'positive'
    },
    closing: {
        trigger: "Closing Signal",
        script: "Ask for the sale now! 'Should we send the contract?'",
        sentiment: 'positive'
    }
};

const WarRoom = () => {
    const [calls, setCalls] = useState(warRoomFeed);
    const [activeCoaching, setActiveCoaching] = useState(coachingScenarios.pricing);
    const [activeAgent, setActiveAgent] = useState('Arjun');

    // Simulate incoming calls and dynamic coaching
    useEffect(() => {
        const interval = setInterval(() => {
            const scenarios = Object.keys(coachingScenarios);
            const randomScenarioKey = scenarios[Math.floor(Math.random() * scenarios.length)];
            const newCoaching = coachingScenarios[randomScenarioKey];

            setActiveCoaching(newCoaching);
            setActiveAgent(Math.random() > 0.5 ? 'Arjun' : 'Priya');

            const newCall = {
                id: Date.now(),
                agent: Math.random() > 0.5 ? 'Suresh Iyer' : 'Ananya Das',
                lead: Math.random() > 0.5 ? 'Incoming Lead...' : 'Verified Customer',
                status: 'Incoming',
                duration: '00:00',
                summary: 'Connecting...',
                timestamp: 'Live',
                sentiment: 'neutral'
            };
            setCalls(prev => [newCall, ...prev.slice(0, 5)]); // Keep waiting list short
        }, 6000); // Faster updates for energy
        return () => clearInterval(interval);
    }, []);

    const getSentimentIcon = (sentiment) => {
        if (sentiment === 'positive') return <Smile className="text-emerald-500" size={18} />;
        if (sentiment === 'negative') return <Frown className="text-red-500" size={18} />;
        return <Meh className="text-slate-400" size={18} />;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Live War Room</h1>
                    </div>
                    <p className="text-slate-500">Real-time floor activty and AI insights.</p>
                </div>
                <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-600">
                    <Zap size={14} className="text-yellow-500 fill-yellow-500" />
                    <span>AI Analysis Active</span>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
                {/* Live Feed Column */}
                <div className="lg:col-span-2 space-y-4 overflow-y-auto pr-2 pb-20">
                    <AnimatePresence initial={false}>
                        {calls.map((call) => (
                            <motion.div
                                key={call.id}
                                initial={{ opacity: 0, x: -20, height: 0 }}
                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            >
                                <div className={`p-5 rounded-2xl border mb-3 shadow-sm transition-all hover:shadow-md ${call.status === 'Incoming' ? 'bg-indigo-50 border-indigo-100' :
                                        call.status === 'Missed' ? 'bg-red-50 border-red-100' :
                                            'bg-white border-slate-100'
                                    }`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start space-x-4">
                                            <div className={`p-3 rounded-xl ${call.status === 'Incoming' ? 'bg-indigo-100 text-indigo-600 animate-bounce' :
                                                    call.status === 'Missed' ? 'bg-red-100 text-red-600' :
                                                        'bg-slate-100 text-slate-600'
                                                }`}>
                                                <Phone size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <h3 className="font-bold text-slate-800">{call.agent}</h3>
                                                    <span className="text-slate-400 text-sm">•</span>
                                                    <span className="font-medium text-slate-600">{call.lead}</span>
                                                </div>

                                                {/* Kinetic Status */}
                                                <div className={`mt-1 font-semibold flex items-center gap-2 ${call.status === 'Incoming' ? 'text-indigo-600' :
                                                        call.status === 'Missed' ? 'text-red-600' :
                                                            'text-emerald-600'
                                                    }`}>
                                                    {call.status === 'Incoming' ? (
                                                        <KineticText text="Incoming Call..." />
                                                    ) : call.status}
                                                </div>

                                                <p className="text-slate-500 text-sm mt-2 max-w-md">
                                                    {call.summary}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <div className="text-2xl font-mono font-medium text-slate-700">
                                                {call.duration}
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">{call.timestamp}</span>
                                            {/* Sentiment Indicator */}
                                            {call.status !== 'Incoming' && (
                                                <div title="Call Sentiment">
                                                    {getSentimentIcon(Math.random() > 0.6 ? 'positive' : Math.random() > 0.3 ? 'neutral' : 'negative')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Sidebar Stats / Active Agents */}
                <div className="space-y-6">
                    <BentoCard title="Floor Status" className="bg-slate-900 text-white border-none">
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="bg-slate-800/50 p-4 rounded-2xl">
                                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Calls</div>
                                <div className="text-3xl font-bold">12</div>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-2xl">
                                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Waiting</div>
                                <div className="text-3xl font-bold text-emerald-400">0</div>
                            </div>
                        </div>
                    </BentoCard>

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={activeCoaching.trigger} // Re-animate on change
                        className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <Zap size={100} />
                        </div>

                        <h3 className="font-bold text-lg mb-4 flex items-center relative z-10">
                            <PlayCircle className="mr-2" /> Live Coaching
                        </h3>
                        <p className="text-indigo-100 text-sm mb-4 relative z-10">
                            detected <span className="font-bold text-white bg-white/20 px-1 rounded">{activeCoaching.trigger}</span> in <span className="font-bold text-white">{activeAgent}'s</span> voice.
                        </p>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-xs font-mono relative z-10">
                            "{activeCoaching.script}"
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default WarRoom;
