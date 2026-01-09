import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone,
    Search,
    Filter,
    Clock,
    User,
    Building,
    ChevronDown,
    PhoneCall,
    CheckCircle,
    XCircle,
    MessageSquare,
    RefreshCw,
} from 'lucide-react';
import { leadsApi, callsApi } from '../services/api';
import Shimmer from '../components/ui/Shimmer';

const statusColors = {
    new: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    contacted: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    qualified: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    converted: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    lost: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

const MyLeads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [filterOpen, setFilterOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadLeads = useCallback(async () => {
        try {
            const params = { limit: 100 };
            if (searchQuery) params.search = searchQuery;
            if (statusFilter !== 'all') params.status = statusFilter;

            const response = await leadsApi.list(params);
            setLeads(response.data.leads);
        } catch (error) {
            console.error('Failed to load leads:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadLeads();
    };

    const handleCall = (phone) => {
        window.location.href = `tel:${phone}`;
    };

    const handleWhatsApp = (phone) => {
        const formattedPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${formattedPhone}`, '_blank');
    };

    const getOptimalTimeIndicator = (lead) => {
        if (!lead.optimal_call_hour) return null;
        const currentHour = new Date().getHours();
        const isOptimalNow = Math.abs(currentHour - lead.optimal_call_hour) <= 1;

        if (isOptimalNow) {
            return (
                <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    <Clock size={12} />
                    Best time now!
                </span>
            );
        }
        return (
            <span className="text-xs text-slate-500">
                Best at {lead.optimal_call_hour}:00
            </span>
        );
    };

    if (loading) {
        return (
            <div className="p-8 max-w-6xl mx-auto space-y-6">
                <Shimmer width="200px" height="40px" />
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <Shimmer key={i} height="120px" borderRadius="16px" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Leads</h1>
                    <p className="text-slate-500 mt-1">
                        {leads.length} leads assigned to you
                    </p>
                </div>

                <motion.button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                    whileTap={{ scale: 0.98 }}
                >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </motion.button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, phone, or company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                </div>

                <div className="relative">
                    <motion.button
                        onClick={() => setFilterOpen(!filterOpen)}
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors min-w-[150px]"
                        whileTap={{ scale: 0.98 }}
                    >
                        <Filter size={16} className="text-slate-500" />
                        <span className="capitalize">
                            {statusFilter === 'all' ? 'All Status' : statusFilter}
                        </span>
                        <ChevronDown size={16} className="text-slate-400 ml-auto" />
                    </motion.button>

                    <AnimatePresence>
                        {filterOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full mt-2 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden min-w-[150px]"
                            >
                                {['all', 'new', 'contacted', 'qualified', 'converted', 'lost'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            setStatusFilter(status);
                                            setFilterOpen(false);
                                        }}
                                        className={`w-full px-4 py-2 text-left hover:bg-slate-50 capitalize transition-colors ${statusFilter === status ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700'
                                            }`}
                                    >
                                        {status === 'all' ? 'All Status' : status}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Leads List */}
            <div className="space-y-4">
                <AnimatePresence>
                    {leads.length > 0 ? (
                        leads.map((lead, index) => (
                            <motion.div
                                key={lead.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Lead Info */}
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shrink-0">
                                            {lead.first_name?.[0]}{lead.last_name?.[0] || ''}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="text-lg font-semibold text-slate-900">
                                                    {lead.first_name} {lead.last_name || ''}
                                                </h3>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[lead.status]?.bg
                                                    } ${statusColors[lead.status]?.text}`}>
                                                    {lead.status}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                                {lead.company && (
                                                    <span className="flex items-center gap-1">
                                                        <Building size={14} />
                                                        {lead.company}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Phone size={14} />
                                                    {lead.phone}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 mt-3">
                                                {getOptimalTimeIndicator(lead)}
                                                {lead.call_count > 0 && (
                                                    <span className="text-xs text-slate-500">
                                                        {lead.call_count} calls made
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <motion.button
                                            onClick={() => handleCall(lead.phone)}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <PhoneCall size={16} />
                                            Call
                                        </motion.button>

                                        <motion.button
                                            onClick={() => handleWhatsApp(lead.phone)}
                                            className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            title="WhatsApp"
                                        >
                                            <MessageSquare size={18} />
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Lead Notes/Tags if available */}
                                {lead.notes && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-sm text-slate-600 line-clamp-2">{lead.notes}</p>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <User size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-600">No leads found</h3>
                            <p className="text-slate-400 mt-1">
                                {searchQuery || statusFilter !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'No leads have been assigned to you yet'}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default MyLeads;
