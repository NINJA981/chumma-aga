
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Phone, CheckCircle, Brain, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const socket = io('http://localhost:3000'); // Ensure this matches backend URL

export default function CallFeed() {
    const [calls, setCalls] = useState([]);
    const [missedCalls, setMissedCalls] = useState([]);

    useEffect(() => {
        // Mock data for demo
        setCalls([
            { id: '1', leadName: 'John Doe', repName: 'Alice', duration: 120, status: 'completed', sentiment: 'Positive', summary: 'Interested in premium plan.' },
            { id: '2', leadName: 'Jane Smith', repName: 'Bob', duration: 45, status: 'processing', sentiment: null, summary: null },
        ]);

        socket.on('call_analyzed', (data) => {
            // Update call with AI result
            setCalls(prev => prev.map(c =>
                c.id === data.callId
                    ? { ...c, status: 'completed', summary: data.summary, sentiment: data.sentiment }
                    : c
            ));
        });

        socket.on('missed_call_alert', (data) => {
            setMissedCalls(prev => [data, ...prev]);
        });

        // Listen for new calls if implemented
        // socket.on('new_call', (call) => setCalls(prev => [call, ...prev]));

        return () => socket.disconnect();
    }, []);

    return (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-96 flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Phone size={20} className="text-indigo-500" />
                Live Call Feed
            </h3>

            {/* Missed Call Alerts */}
            <AnimatePresence>
                {missedCalls.map((alert, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-50 border border-red-100 rounded-xl p-3 mb-2 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2 text-red-700">
                            <Phone size={16} />
                            <span className="font-medium">Missed Call: {alert.phone}</span>
                        </div>
                        <span className="text-xs text-red-500">Just now</span>
                    </motion.div>
                ))}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {calls.map((call) => (
                    <motion.div
                        key={call.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-md transition-all"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="font-semibold text-slate-800">{call.leadName}</p>
                                <p className="text-xs text-slate-500">Agent: {call.repName}</p>
                            </div>
                            <span className="text-xs font-mono text-slate-400 bg-slate-200 px-2 py-1 rounded-md">
                                {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                            </span>
                        </div>

                        {call.status === 'processing' ? (
                            <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 p-2 rounded-lg">
                                <Brain size={14} className="animate-pulse" />
                                <span>Processing AI Analysis...</span>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className={`px-2 py-0.5 rounded-full ${call.sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-700' :
                                            call.sentiment === 'Negative' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {call.sentiment || 'Neutral'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-2">{call.summary}</p>
                            </div>
                        )}

                        <button className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            <Clock size={12} />
                            Listen Recording
                        </button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
