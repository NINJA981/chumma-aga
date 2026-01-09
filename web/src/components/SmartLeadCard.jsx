import React from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle, MoreVertical, X, Clock, CheckCheck, PhoneCall, Zap, Send } from 'lucide-react';
import TactileButton from './ui/TactileButton';

const getQuickActions = (status) => {
    switch (status) {
        case 'New':
            return [
                { label: 'Intro Template', icon: Zap, text: "Hi, I'm Arjun from SalesPulse. Saw your inquiry!" },
                { label: 'Schedule Call', icon: Clock, text: "When is a good time to connect?" }
            ];
        case 'Interested':
            return [
                { label: 'Send Pricing', icon: Zap, text: "Here is our standard pricing deck..." },
                { label: 'Book Demo', icon: Clock, text: "Let's book a full demo for your team." }
            ];
        case 'Follow Up':
            return [
                { label: 'Nudge', icon: Zap, text: "Just checking in on our last conversation." },
                { label: 'Share Case Study', icon: Send, text: "Thought this case study might be relevant." }
            ];
        default:
            return [{ label: 'Custom Message', icon: MessageCircle, text: "" }];
    }
};

const SmartLeadCard = ({ lead, onClose }) => {
    if (!lead) return null;

    // Quick Actions based on status
    const quickActions = getQuickActions(lead.status);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col h-full max-h-[800px]"
        >
            {/* Header */}
            <div className="bg-indigo-600 p-6 flex justify-between items-start text-white">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{lead.name}</h2>
                    <p className="text-indigo-100 mt-1 flex items-center">
                        {lead.phone} • {lead.location}
                    </p>
                    <div className="mt-3 inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-medium">
                        Status: {lead.status}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Quick Actions Bar - Contextual Utility */}
            <div className="bg-indigo-50 px-6 py-3 border-b border-indigo-100 flex gap-2 overflow-x-auto">
                {quickActions.map((action, i) => (
                    <button
                        key={i}
                        className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-colors whitespace-nowrap"
                        onClick={() => alert(`Sent: ${action.text}`)}
                    >
                        <action.icon size={12} />
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-[#e5ded8] p-6 relative">
                {/* WhatsApp-style Background Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}></div>

                {/* Timeline / Chat Interface */}
                <div className="space-y-6 relative z-10">
                    <div className="flex justify-center">
                        <span className="bg-white/80 px-3 py-1 rounded-lg text-xs font-medium text-slate-500 shadow-sm">
                            Today
                        </span>
                    </div>

                    {lead.timeline && lead.timeline.map((item, index) => (
                        <div key={index} className={`flex ${item.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[80%] rounded-2xl p-4 shadow-sm relative ${item.direction === 'outgoing'
                                    ? 'bg-[#d9fdd3] rounded-tr-none text-slate-900'
                                    : 'bg-white rounded-tl-none text-slate-900 conversation-bubble'
                                    }`}
                            >
                                <div className="flex items-center mb-1 space-x-2">
                                    {item.type === 'call' && <PhoneCall size={14} className={item.direction === 'outgoing' ? "text-emerald-600" : "text-indigo-600"} />}
                                    {item.type === 'message' && <MessageCircle size={14} className="text-blue-500" />}
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide opacity-70">{item.type}</span>
                                </div>

                                <p className="text-[15px] leading-relaxed">
                                    {item.summary || item.content}
                                </p>

                                <div className="mt-2 flex items-center justify-end space-x-1 opacity-60">
                                    <span className="text-[10px]">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {item.direction === 'outgoing' && <CheckCheck size={12} className="text-blue-500" />}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Live Simulation of 'Typing' or Activity if needed */}
                </div>
            </div>

            {/* Action Bar */}
            <div className="bg-white p-4 border-t border-slate-100 flex items-center space-x-3">
                <input
                    type="text"
                    placeholder="Type a note or message..."
                    className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20"
                />
                <TactileButton variant="primary" className="!px-4 !py-3 rounded-xl">
                    <MessageCircle size={20} />
                </TactileButton>
                <TactileButton variant="secondary" className="!px-4 !py-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100">
                    <Phone size={20} />
                </TactileButton>
            </div>
        </motion.div>
    );
};

export default SmartLeadCard;
