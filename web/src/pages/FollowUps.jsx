import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Clock,
    Phone,
    Check,
    Trash2,
    RefreshCw,
    AlertCircle,
    CalendarClock,
    CheckCircle,
    Plus,
    X,
    PhoneCall,
} from 'lucide-react';
import { followupsApi } from '../services/api';
import Shimmer from '../components/ui/Shimmer';

const FollowUps = () => {
    const [followups, setFollowups] = useState([]);
    const [counts, setCounts] = useState({ overdue: 0, today: 0, upcoming: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('today');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newFollowup, setNewFollowup] = useState({ dueDate: '', description: '' });
    const [creating, setCreating] = useState(false);

    // Demo follow-ups data
    const demoFollowups = {
        overdue: [
            {
                id: '1',
                lead_first_name: 'Amit',
                lead_last_name: 'Kumar',
                lead_company: 'DataDriven Co',
                lead_phone: '+91 43210 98765',
                description: 'Discuss enterprise pricing',
                due_date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            },
        ],
        today: [
            {
                id: '2',
                lead_first_name: 'Priya',
                lead_last_name: 'Sharma',
                lead_company: 'TechVentures Pvt Ltd',
                lead_phone: '+91 98765 43210',
                description: 'Follow up on proposal sent last week',
                due_date: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
            },
            {
                id: '3',
                lead_first_name: 'Vikram',
                lead_last_name: 'Singh',
                lead_company: 'StartupHub',
                lead_phone: '+91 65432 10987',
                description: 'Demo scheduled callback',
                due_date: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
            },
        ],
        upcoming: [
            {
                id: '4',
                lead_first_name: 'Neha',
                lead_last_name: 'Gupta',
                lead_company: 'CloudFirst Inc',
                lead_phone: '+91 54321 09876',
                description: 'Final contract discussion',
                due_date: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
            },
            {
                id: '5',
                lead_first_name: 'Rahul',
                lead_last_name: 'Verma',
                lead_company: 'Global Solutions',
                lead_phone: '+91 87654 32109',
                description: 'Check on implementation progress',
                due_date: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
            },
        ],
    };

    const loadFollowups = useCallback(async () => {
        try {
            const response = await followupsApi.list({ filter: activeTab });
            setFollowups(response.data.followups);
            setCounts(response.data.counts);
        } catch (error) {
            console.error('Failed to load followups, using demo data:', error);
            // Use demo data as fallback
            setFollowups(demoFollowups[activeTab] || []);
            setCounts({
                overdue: demoFollowups.overdue.length,
                today: demoFollowups.today.length,
                upcoming: demoFollowups.upcoming.length
            });
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadFollowups();
    }, [loadFollowups]);

    const handleComplete = async (id) => {
        try {
            await followupsApi.complete(id);
            loadFollowups();
        } catch (error) {
            console.error('Failed to complete followup:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this follow-up?')) return;
        try {
            await followupsApi.delete(id);
            loadFollowups();
        } catch (error) {
            console.error('Failed to delete followup:', error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newFollowup.dueDate) return;

        setCreating(true);
        try {
            await followupsApi.create(newFollowup);
            setNewFollowup({ dueDate: '', description: '' });
            setShowCreateModal(false);
            loadFollowups();
        } catch (error) {
            console.error('Failed to create followup:', error);
        } finally {
            setCreating(false);
        }
    };

    const handleCall = (phone) => {
        window.location.href = `tel:${phone}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        if (date.toDateString() === tomorrow.toDateString()) {
            return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const tabs = [
        { id: 'overdue', label: 'Overdue', count: counts.overdue, color: 'text-red-600', bg: 'bg-red-100' },
        { id: 'today', label: 'Today', count: counts.today, color: 'text-amber-600', bg: 'bg-amber-100' },
        { id: 'upcoming', label: 'Upcoming', count: counts.upcoming, color: 'text-blue-600', bg: 'bg-blue-100' },
    ];

    if (loading) {
        return (
            <div className="p-8 max-w-4xl mx-auto space-y-6">
                <Shimmer width="200px" height="40px" />
                <Shimmer width="100%" height="60px" borderRadius="16px" />
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <Shimmer key={i} height="100px" borderRadius="16px" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Follow-ups</h1>
                    <p className="text-slate-500 mt-1">Manage your scheduled callbacks</p>
                </div>
                <motion.button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Plus size={18} />
                    Add Follow-up
                </motion.button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
                {tabs.map((tab) => (
                    <motion.button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${activeTab === tab.id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                        whileTap={{ scale: 0.98 }}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === tab.id ? `${tab.bg} ${tab.color}` : 'bg-slate-200 text-slate-600'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </motion.button>
                ))}
            </div>

            {/* Follow-ups List */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {followups.length > 0 ? (
                        followups.map((followup, index) => (
                            <motion.div
                                key={followup.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-white rounded-2xl border p-5 ${activeTab === 'overdue'
                                    ? 'border-red-200 bg-red-50/30'
                                    : 'border-slate-200'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        {/* Lead Info */}
                                        {followup.lead_first_name && (
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                                    {followup.lead_first_name[0]}{followup.lead_last_name?.[0] || ''}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">
                                                        {followup.lead_first_name} {followup.lead_last_name || ''}
                                                    </h3>
                                                    {followup.lead_company && (
                                                        <p className="text-sm text-slate-500">{followup.lead_company}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Description */}
                                        {followup.description && (
                                            <p className="text-slate-700 mb-3">{followup.description}</p>
                                        )}

                                        {/* Due Date */}
                                        <div className={`flex items-center gap-2 text-sm ${activeTab === 'overdue' ? 'text-red-600' : 'text-slate-500'
                                            }`}>
                                            <Clock size={14} />
                                            {formatDate(followup.due_date)}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {followup.lead_phone && (
                                            <motion.button
                                                onClick={() => handleCall(followup.lead_phone)}
                                                className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 transition-colors"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                title="Call Now"
                                            >
                                                <PhoneCall size={18} />
                                            </motion.button>
                                        )}
                                        <motion.button
                                            onClick={() => handleComplete(followup.id)}
                                            className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            title="Mark Complete"
                                        >
                                            <Check size={18} />
                                        </motion.button>
                                        <motion.button
                                            onClick={() => handleDelete(followup.id)}
                                            className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            {activeTab === 'overdue' ? (
                                <>
                                    <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                                    <h3 className="text-lg font-medium text-slate-600">No overdue follow-ups!</h3>
                                    <p className="text-slate-400 mt-1">You're all caught up</p>
                                </>
                            ) : activeTab === 'today' ? (
                                <>
                                    <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-lg font-medium text-slate-600">No follow-ups for today</h3>
                                    <p className="text-slate-400 mt-1">Schedule some callbacks to stay on top of leads</p>
                                </>
                            ) : (
                                <>
                                    <CalendarClock size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-lg font-medium text-slate-600">No upcoming follow-ups</h3>
                                    <p className="text-slate-400 mt-1">Plan ahead by scheduling future callbacks</p>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-900">New Follow-up</h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Due Date & Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={newFollowup.dueDate}
                                        onChange={(e) => setNewFollowup({ ...newFollowup, dueDate: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={newFollowup.description}
                                        onChange={(e) => setNewFollowup({ ...newFollowup, description: e.target.value })}
                                        placeholder="What do you need to follow up on?"
                                        rows={3}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <motion.button
                                        type="submit"
                                        disabled={creating}
                                        className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {creating ? 'Creating...' : 'Create Follow-up'}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FollowUps;
