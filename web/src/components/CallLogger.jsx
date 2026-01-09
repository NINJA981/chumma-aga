import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone,
    X,
    Clock,
    MessageSquare,
    Calendar,
    Check,
    Loader2,
} from 'lucide-react';
import { callsApi, followupsApi } from '../services/api';

const dispositions = [
    { value: 'connected', label: 'Connected', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'no_answer', label: 'No Answer', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'busy', label: 'Busy', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'voicemail', label: 'Voicemail', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'wrong_number', label: 'Wrong Number', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { value: 'callback_scheduled', label: 'Callback Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'converted', label: 'Converted! 🎉', color: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-300' },
    { value: 'not_interested', label: 'Not Interested', color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

const CallLogger = ({ isOpen, onClose, lead, onSuccess }) => {
    const [formData, setFormData] = useState({
        phoneNumber: lead?.phone || '',
        durationMinutes: '',
        durationSeconds: '',
        disposition: '',
        notes: '',
        scheduleFollowup: false,
        followupDate: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.phoneNumber) {
            setError('Phone number is required');
            return;
        }
        if (!formData.disposition) {
            setError('Please select a disposition');
            return;
        }

        const durationSeconds =
            (parseInt(formData.durationMinutes) || 0) * 60 +
            (parseInt(formData.durationSeconds) || 0);

        setSubmitting(true);
        try {
            // Log the call
            await callsApi.log({
                leadId: lead?.id,
                phoneNumber: formData.phoneNumber,
                callType: 'outbound',
                callSource: 'manual',
                startedAt: new Date().toISOString(),
                endedAt: new Date().toISOString(),
                durationSeconds,
                disposition: formData.disposition,
                isAnswered: formData.disposition === 'connected' || formData.disposition === 'converted',
                notes: formData.notes,
            });

            // Schedule follow-up if requested
            if (formData.scheduleFollowup && formData.followupDate) {
                await followupsApi.create({
                    leadId: lead?.id,
                    dueDate: formData.followupDate,
                    description: `Follow up on call: ${formData.notes || formData.disposition}`,
                });
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Failed to log call:', err);
            setError('Failed to log call. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <Phone size={20} className="text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Log Call</h2>
                                {lead && (
                                    <p className="text-sm text-slate-500">
                                        {lead.first_name} {lead.last_name}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-5 space-y-5">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Phone Number */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                placeholder="Enter phone number"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <Clock size={14} className="inline mr-1" />
                                Call Duration
                            </label>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={formData.durationMinutes}
                                        onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs text-slate-500 mt-1 block">Minutes</span>
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={formData.durationSeconds}
                                        onChange={(e) => setFormData({ ...formData, durationSeconds: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs text-slate-500 mt-1 block">Seconds</span>
                                </div>
                            </div>
                        </div>

                        {/* Disposition */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Call Outcome
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {dispositions.map((d) => (
                                    <motion.button
                                        key={d.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, disposition: d.value })}
                                        className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${formData.disposition === d.value
                                                ? `${d.color} border-current ring-2 ring-offset-1`
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {d.label}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <MessageSquare size={14} className="inline mr-1" />
                                Notes (optional)
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Add any notes about the call..."
                                rows={3}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                        </div>

                        {/* Schedule Follow-up */}
                        <div className="bg-slate-50 rounded-xl p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.scheduleFollowup}
                                    onChange={(e) => setFormData({ ...formData, scheduleFollowup: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                    <span className="font-medium text-slate-700">Schedule Follow-up</span>
                                    <p className="text-xs text-slate-500">Set a reminder for your next call</p>
                                </div>
                            </label>

                            {formData.scheduleFollowup && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-4"
                                >
                                    <input
                                        type="datetime-local"
                                        value={formData.followupDate}
                                        onChange={(e) => setFormData({ ...formData, followupDate: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    />
                                </motion.div>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <motion.button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                whileTap={{ scale: 0.98 }}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check size={18} />
                                        Log Call
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CallLogger;
