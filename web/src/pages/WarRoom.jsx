import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Joyride, { STATUS } from 'react-joyride';
import { Toaster, toast } from 'react-hot-toast';
import {
    Phone,
    PhoneCall,
    PhoneMissed,
    Clock,
    AlertCircle,
    PlayCircle,
    Smile,
    Frown,
    Meh,
    Zap,
    Filter,
    Flag,
    X,
    User,
    Coffee,
    Headphones,
    MessageSquare,
    MoreVertical,
    CheckCircle,
    ArrowRight,
    Play,
    Pause
} from 'lucide-react';
import BentoCard from '../components/ui/BentoCard';
import KineticText from '../components/ui/KineticText';
import { Skeleton } from '../components/ui/Skeleton';
import { warRoomFeed, mockDashboardStats } from '../utils/mockData';

const coachingScenarios = {
    pricing: {
        trigger: 'Pricing Objection',
        script: 'We can offer a 5% discount if you close before EOM...',
        sentiment: 'negative',
    },
    competitor: {
        trigger: 'Competitor Mention',
        script: 'Highlight our superior AI analytics and 24/7 support.',
        sentiment: 'neutral',
    },
    feature: {
        trigger: 'Feature Request',
        script: 'That is on our roadmap for Q3! We can add you to beta.',
        sentiment: 'positive',
    },
    closing: {
        trigger: 'Closing Signal',
        script: "Ask for the sale now! 'Should we send the contract?'",
        sentiment: 'positive',
    },
};

const WarRoom = () => {
    const [loading, setLoading] = useState(true);
    const [calls, setCalls] = useState([]);
    const [activeCoaching, setActiveCoaching] = useState(coachingScenarios.pricing);
    const [activeAgent, setActiveAgent] = useState('Arjun');
    const [agents] = useState(mockDashboardStats.activeAgents);

    // Practical state
    const [filter, setFilter] = useState('all'); // 'all', 'incoming', 'completed', 'missed'
    const [flaggedCalls, setFlaggedCalls] = useState([]);
    const [showAgentPanel, setShowAgentPanel] = useState(false);
    const [selectedCall, setSelectedCall] = useState(null);
    const [demoMode, setDemoMode] = useState(false);

    // Tour State
    const [runTour, setRunTour] = useState(false);
    const tourSteps = [
        {
            target: '.war-room-header',
            content: 'Welcome to the Live War Room! This is your command center for real-time sales operations.',
            disableBeacon: true,
        },
        {
            target: '.live-feed-column',
            content: 'Watch live calls as they happen. Incoming, completed, and missed calls appear here instantly.',
        },
        {
            target: '.stats-sidebar',
            content: 'Track floor status, active agents, and AI coaching insights at a glance.',
        },
        {
            target: '.demo-mode-toggle',
            content: 'Toggle Demo Mode to simulate live traffic and conversions!',
        },
    ];

    useEffect(() => {
        // Simulate initial loading
        const timer = setTimeout(() => {
            setCalls(warRoomFeed);
            setLoading(false);
            // Auto-start tour if first visit (mocked by always starting for demo unless dismissed)
            // setRunTour(true); 
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // Simulate incoming calls and dynamic coaching
    useEffect(() => {
        if (!demoMode) return;

        const interval = setInterval(() => {
            const scenarios = Object.keys(coachingScenarios);
            const randomScenarioKey = scenarios[Math.floor(Math.random() * scenarios.length)];
            const newCoaching = coachingScenarios[randomScenarioKey];

            setActiveCoaching(newCoaching);
            setActiveAgent(Math.random() > 0.5 ? 'Arjun' : 'Priya');

            const statuses = ['Incoming', 'Completed', 'Missed', 'Converted'];
            // Weighted random for 'Converted' to be rare
            let randomStatus = statuses[Math.floor(Math.random() * (statuses.length - 1))];
            if (Math.random() > 0.9) randomStatus = 'Converted';

            const newCall = {
                id: Date.now(),
                agent: Math.random() > 0.5 ? 'Suresh Iyer' : 'Ananya Das',
                lead: Math.random() > 0.5 ? 'Incoming Lead...' : 'Verified Customer',
                status: randomStatus === 'Converted' ? 'Completed' : randomStatus,
                isConverted: randomStatus === 'Converted',
                duration: randomStatus === 'Incoming' ? '00:00' : `${Math.floor(Math.random() * 10)}m ${Math.floor(Math.random() * 60)}s`,
                summary: randomStatus === 'Incoming' ? 'Connecting...' : (randomStatus === 'Converted' ? 'Deal Closed! Contract sent.' : 'Call summary will appear here.'),
                timestamp: randomStatus === 'Incoming' ? 'Live' : 'Just now',
                sentiment: randomStatus === 'Converted' ? 'positive' : ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
            };

            setCalls((prev) => [newCall, ...prev.slice(0, 9)]);

            if (randomStatus === 'Converted') {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                toast.success(`🎉 ${newCall.agent} just closed a deal!`, {
                    duration: 5000,
                    icon: '🚀',
                    style: {
                        borderRadius: '10px',
                        background: '#333',
                        color: '#fff',
                    },
                });
            }

        }, 4000); // Faster updates in demo mode
        return () => clearInterval(interval);
    }, [demoMode]);

    const getSentimentIcon = (sentiment) => {
        if (sentiment === 'positive') return <Smile className="text-emerald-500" size={18} />;
        if (sentiment === 'negative') return <Frown className="text-red-500" size={18} />;
        return <Meh className="text-slate-400" size={18} />;
    };

    const getStatusIcon = (status, isConverted) => {
        if (isConverted) return <Zap className="text-yellow-500 fill-yellow-500" size={20} />;
        if (status === 'Incoming') return <PhoneCall className="text-indigo-500 animate-pulse" size={20} />;
        if (status === 'Missed') return <PhoneMissed className="text-red-500" size={20} />;
        return <Phone className="text-emerald-500" size={20} />;
    };

    const getAgentStatusIcon = (status) => {
        if (status === 'On Call') return <Headphones size={14} className="text-emerald-400" />;
        if (status === 'Break') return <Coffee size={14} className="text-amber-400" />;
        return <CheckCircle size={14} className="text-green-400" />;
    };

    const filteredCalls = calls.filter((call) => {
        if (filter === 'all') return true;
        return call.status.toLowerCase() === filter;
    });

    const handleFlagCall = (callId) => {
        setFlaggedCalls((prev) =>
            prev.includes(callId) ? prev.filter((id) => id !== callId) : [...prev, callId]
        );
        toast('Call status updated', { icon: '🚩' });
    };

    const handleQuickAction = (action, call) => {
        console.log(`Action: ${action} on call:`, call);
        toast.success(`${action} initiated for ${call.lead}`);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous={true}
                showSkipButton={true}
                styles={{
                    options: {
                        primaryColor: '#4f46e5',
                    }
                }}
                callback={(data) => {
                    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(data.status)) {
                        setRunTour(false);
                    }
                }}
            />

            <header className="mb-8 flex justify-between items-end war-room-header">
                <div>
                    <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Live War Room</h1>
                    </div>
                    <p className="text-slate-500">Real-time floor activity and AI insights.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setRunTour(true)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Start Tour
                    </button>
                    <button
                        onClick={() => setDemoMode(!demoMode)}
                        className={`demo-mode-toggle flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${demoMode
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {demoMode ? <Pause size={16} fill="white" /> : <Play size={16} fill="currentColor" />}
                        {demoMode ? 'Live Simulation' : 'Start Simulation'}
                    </button>

                    <button
                        onClick={() => setShowAgentPanel(!showAgentPanel)}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full text-sm font-medium text-slate-700 transition-colors"
                    >
                        <User size={16} />
                        Agents ({agents.filter((a) => a.status === 'On Call').length}/{agents.length})
                    </button>
                    <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-600">
                        <Zap size={14} className="text-yellow-500 fill-yellow-500" />
                        <span>AI Analysis Active</span>
                    </div>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="mb-6 flex items-center gap-3">
                <Filter size={18} className="text-slate-400" />
                <span className="text-sm text-slate-500">Filter:</span>
                {['all', 'incoming', 'completed', 'missed'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 text-sm rounded-full transition-all ${filter === f
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
                {flaggedCalls.length > 0 && (
                    <span className="ml-auto flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
                        <Flag size={14} />
                        {flaggedCalls.length} Flagged
                    </span>
                )}
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
                {/* Live Feed Column */}
                <div className="lg:col-span-2 space-y-4 overflow-y-auto pr-2 pb-20 live-feed-column">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-40 w-full" />
                            ))}
                        </div>
                    ) : (
                        <AnimatePresence initial={false}>
                            {filteredCalls.map((call) => (
                                <motion.div
                                    key={call.id}
                                    initial={{ opacity: 0, x: -20, height: 0 }}
                                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                >
                                    <div
                                        className={`p-5 rounded-2xl border mb-3 shadow-sm transition-all hover:shadow-md ${flaggedCalls.includes(call.id)
                                            ? 'bg-red-50 border-red-200 ring-2 ring-red-200'
                                            : call.isConverted
                                                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                                                : call.status === 'Incoming'
                                                    ? 'bg-indigo-50 border-indigo-100'
                                                    : call.status === 'Missed'
                                                        ? 'bg-red-50 border-red-100'
                                                        : 'bg-white border-slate-100'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-start space-x-4">
                                                <div
                                                    className={`p-3 rounded-xl ${call.isConverted
                                                        ? 'bg-yellow-100 text-yellow-600'
                                                        : call.status === 'Incoming'
                                                            ? 'bg-indigo-100 text-indigo-600'
                                                            : call.status === 'Missed'
                                                                ? 'bg-red-100 text-red-600'
                                                                : 'bg-emerald-100 text-emerald-600'
                                                        }`}
                                                >
                                                    {getStatusIcon(call.status, call.isConverted)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <h3 className="font-bold text-slate-800">{call.agent}</h3>
                                                        <span className="text-slate-400 text-sm">•</span>
                                                        <span className="font-medium text-slate-600">{call.lead}</span>
                                                    </div>

                                                    {/* Kinetic Status */}
                                                    <div
                                                        className={`mt-1 font-semibold flex items-center gap-2 ${call.status === 'Incoming'
                                                            ? 'text-indigo-600'
                                                            : call.status === 'Missed'
                                                                ? 'text-red-600'
                                                                : 'text-emerald-600'
                                                            }`}
                                                    >
                                                        {call.status === 'Incoming' ? (
                                                            <KineticText text="Incoming Call..." />
                                                        ) : (
                                                            call.status
                                                        )}
                                                    </div>

                                                    <p className="text-slate-500 text-sm mt-2 max-w-md">{call.summary}</p>

                                                    {/* Quick Actions */}
                                                    <div className="mt-3 flex items-center gap-2">
                                                        {call.status === 'Missed' && (
                                                            <button
                                                                onClick={() => handleQuickAction('Callback', call)}
                                                                className="flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
                                                            >
                                                                <Phone size={12} /> Callback
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleQuickAction('SMS', call)}
                                                            className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
                                                        >
                                                            <MessageSquare size={12} /> Send SMS
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedCall(call)}
                                                            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-full transition-colors"
                                                        >
                                                            <MoreVertical size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <div className="text-2xl font-mono font-medium text-slate-700">
                                                    {call.duration}
                                                </div>
                                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                                                    {call.timestamp}
                                                </span>
                                                {/* Sentiment Indicator */}
                                                {call.status !== 'Incoming' && (
                                                    <div title="Call Sentiment">{getSentimentIcon(call.sentiment)}</div>
                                                )}
                                                {/* Flag Button */}
                                                <button
                                                    onClick={() => handleFlagCall(call.id)}
                                                    title={flaggedCalls.includes(call.id) ? 'Unflag' : 'Flag for review'}
                                                    className={`p-1.5 rounded-lg transition-colors ${flaggedCalls.includes(call.id)
                                                        ? 'bg-red-100 text-red-500'
                                                        : 'bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50'
                                                        }`}
                                                >
                                                    <Flag size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}

                    {!loading && filteredCalls.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <Phone size={48} className="mx-auto mb-4 opacity-30" />
                            <p>No {filter === 'all' ? '' : filter} calls to display.</p>
                        </div>
                    )}
                </div>

                {/* Sidebar Stats / Active Agents */}
                <div className="space-y-6 stats-sidebar">
                    <BentoCard title="Floor Status" className="bg-slate-900 text-white border-none">
                        {loading ? <Skeleton className="h-32 w-full bg-slate-800" /> : (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="bg-slate-800/50 p-4 rounded-2xl">
                                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                                        Active Calls
                                    </div>
                                    <div className="text-3xl font-bold">
                                        {calls.filter((c) => c.status === 'Incoming').length}
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl">
                                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                                        Missed Today
                                    </div>
                                    <div className="text-3xl font-bold text-red-400">
                                        {calls.filter((c) => c.status === 'Missed').length}
                                    </div>
                                </div>
                            </div>
                        )}
                    </BentoCard>

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={activeCoaching.trigger}
                        className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <Zap size={100} />
                        </div>

                        <h3 className="font-bold text-lg mb-4 flex items-center relative z-10">
                            <PlayCircle className="mr-2" /> Live Coaching
                        </h3>
                        <p className="text-indigo-100 text-sm mb-4 relative z-10">
                            detected{' '}
                            <span className="font-bold text-white bg-white/20 px-1 rounded">
                                {activeCoaching.trigger}
                            </span>{' '}
                            in <span className="font-bold text-white">{activeAgent}'s</span> voice.
                        </p>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-xs font-mono relative z-10">
                            "{activeCoaching.script}"
                        </div>
                        <button className="mt-4 flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors">
                            View Full Script <ArrowRight size={14} />
                        </button>
                    </motion.div>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-3">Today's Performance</h4>
                        {loading ? <Skeleton className="h-24 w-full" /> : (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Total Calls</span>
                                    <span className="font-bold text-slate-800">{calls.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Completed</span>
                                    <span className="font-bold text-emerald-600">
                                        {calls.filter((c) => c.status === 'Completed').length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Flagged</span>
                                    <span className="font-bold text-red-500">{flaggedCalls.length}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Agent Panel Slide-out */}
            <AnimatePresence>
                {showAgentPanel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        onClick={() => setShowAgentPanel(false)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-800">Agent Status</h3>
                                <button
                                    onClick={() => setShowAgentPanel(false)}
                                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {agents.map((agent, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                                    >
                                        <img
                                            src={agent.avatar}
                                            alt={agent.name}
                                            className="w-12 h-12 rounded-full bg-slate-200"
                                        />
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-800">{agent.name}</p>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                {getAgentStatusIcon(agent.status)}
                                                <span>{agent.status}</span>
                                            </div>
                                        </div>
                                        <button className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                            <MessageSquare size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-200">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-800">
                                        {agents.filter((a) => a.status === 'On Call').length}
                                    </p>
                                    <p className="text-sm text-slate-500">Agents on calls right now</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Call Detail Modal */}
            <AnimatePresence>
                {selectedCall && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedCall(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-800">Call Details</h3>
                                <button
                                    onClick={() => setSelectedCall(null)}
                                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Lead</p>
                                    <p className="font-semibold text-slate-800">{selectedCall.lead}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Agent</p>
                                    <p className="font-semibold text-slate-800">{selectedCall.agent}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Duration</p>
                                    <p className="font-mono text-slate-800">{selectedCall.duration}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Summary</p>
                                    <p className="text-slate-600">{selectedCall.summary}</p>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        handleQuickAction('Callback', selectedCall);
                                        setSelectedCall(null);
                                    }}
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                                >
                                    Callback
                                </button>
                                <button
                                    onClick={() => {
                                        handleFlagCall(selectedCall.id);
                                        setSelectedCall(null);
                                    }}
                                    className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                                >
                                    {flaggedCalls.includes(selectedCall.id) ? 'Unflag' : 'Flag'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WarRoom;
