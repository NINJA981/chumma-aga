import { useEffect, useState, useRef, useCallback } from 'react';
import { leadsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import SmartLeadCard from '../components/SmartLeadCard';
import Shimmer from '../components/ui/Shimmer';
import { mockLeads } from '../utils/mockData';
import {
    Users,
    Search,
    Upload,
    Phone,
    Clock,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react';

export default function Leads() {
    const { user } = useAuth();
    // ... existing state ... 
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [showImport, setShowImport] = useState(false);
    const [importMode, setImportMode] = useState('round_robin');
    const [importing, setImporting] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [totalPages, setTotalPages] = useState(1);
    const fileInputRef = useRef(null);

    // Smart Card State
    const [selectedLead, setSelectedLead] = useState(null);

    const isManager = user?.role === 'admin' || user?.role === 'manager';
    const limit = 20;

    // ... loadLeads ...

    // ... useEffects ...

    // ... handleImport, getStatusBadge, handleLeadClick ...

    return (
        <div className="space-y-6 relative">
            {/* ... Header and Search ... */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="text-indigo-600" size={28} />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
                        <p className="text-slate-600">{total} total leads</p>
                    </div>
                </div>
                {/* ... */}
                {isManager && (
                    <button
                        onClick={() => setShowImport(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Upload size={18} />
                        Import CSV
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Search by name, phone, or company..."
                    className="input pl-10"
                />
            </div>

            {/* Leads Table */}
            <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Name</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Contact</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Company</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Calls</th>
                                {isManager && (
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Assigned</th>
                                )}
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Best Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                // Render 5 Shimmer rows
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-4 px-4"><Shimmer className="h-10 w-48 rounded" /></td>
                                        <td className="py-4 px-4"><Shimmer className="h-10 w-32 rounded" /></td>
                                        <td className="py-4 px-4"><Shimmer className="h-6 w-24 rounded" /></td>
                                        <td className="py-4 px-4"><Shimmer className="h-6 w-20 rounded-full" /></td>
                                        <td className="py-4 px-4"><Shimmer className="h-6 w-12 rounded" /></td>
                                        {isManager && <td className="py-4 px-4"><Shimmer className="h-6 w-32 rounded" /></td>}
                                        <td className="py-4 px-4"><Shimmer className="h-6 w-28 rounded" /></td>
                                    </tr>
                                ))
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-500">
                                        No leads found
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr
                                        key={lead.id}
                                        onClick={() => handleLeadClick(lead)}
                                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium text-sm">
                                                    {lead.first_name?.[0]}{lead.last_name?.[0]}
                                                </div>
                                                <span className="font-medium text-slate-900">
                                                    {lead.first_name} {lead.last_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="text-slate-400" />
                                                <span className="text-slate-700">{lead.phone}</span>
                                            </div>
                                            {lead.email && (
                                                <p className="text-sm text-slate-500">{lead.email}</p>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-slate-700">{lead.company || '-'}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(lead.status)}`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-700">{lead.call_count || 0}</td>
                                        {isManager && (
                                            <td className="py-3 px-4 text-slate-700">
                                                {lead.assigned_first_name
                                                    ? `${lead.assigned_first_name} ${lead.assigned_last_name?.charAt(0)}.`
                                                    : '-'}
                                            </td>
                                        )}
                                        <td className="py-3 px-4">
                                            {lead.pickup_probability ? (
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="text-green-500" />
                                                    <span className="text-sm text-green-700">
                                                        {lead.optimal_call_hour}:00 ({lead.pickup_probability}%)
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                        <p className="text-sm text-slate-600">
                            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-sm text-slate-600">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Smart Lead Card Modal */}
            <AnimatePresence>
                {selectedLead && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                            onClick={() => setSelectedLead(null)}
                        />
                        <div className="fixed inset-y-0 right-0 w-full max-w-md z-50 p-4 pointer-events-none flex justify-end">
                            <div className="h-full pointer-events-auto">
                                <SmartLeadCard lead={selectedLead} onClose={() => setSelectedLead(null)} />
                            </div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Import Leads from CSV</h2>
                            <button onClick={() => setShowImport(false)}>
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Assignment Mode
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="mode"
                                            checked={importMode === 'round_robin'}
                                            onChange={() => setImportMode('round_robin')}
                                            className="text-indigo-600"
                                        />
                                        <span className="text-sm">Round Robin</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="mode"
                                            checked={importMode === 'weighted'}
                                            onChange={() => setImportMode('weighted')}
                                            className="text-indigo-600"
                                        />
                                        <span className="text-sm">Weight-based</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    CSV File
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleImport}
                                    disabled={importing}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                            </div>

                            <p className="text-xs text-slate-500">
                                CSV should have columns: first_name, last_name, phone, email (optional), company (optional)
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
