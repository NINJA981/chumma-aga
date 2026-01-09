
import { useState } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BulkUpload() {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, uploading, success, error

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const uploadFile = async () => {
        if (!file) return;
        setStatus('uploading');

        // Simulate upload delay
        await new Promise(r => setTimeout(r, 2000));

        // Mock success
        setStatus('success');
        setFile(null);
        setTimeout(() => setStatus('idle'), 3000);
    };

    return (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-xl">
                    <Upload size={20} className="text-indigo-600" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Bulk Import Leads</h3>
                    <p className="text-sm text-slate-400">Sync CSV to Agent Phones</p>
                </div>
            </div>

            <div
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors
                    ${dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200'}
                    ${status === 'success' ? 'border-emerald-500 bg-emerald-50' : ''}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".csv"
                    onChange={handleChange}
                />

                {status === 'success' ? (
                    <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                        <div className="bg-emerald-100 p-3 rounded-full mb-3">
                            <Check size={24} className="text-emerald-600" />
                        </div>
                        <p className="text-emerald-800 font-medium">Leads Synced Successfully!</p>
                        <p className="text-xs text-emerald-600 mt-1">Pushed to 5 agents</p>
                    </motion.div>
                ) : status === 'uploading' ? (
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                        <p className="text-slate-600">Syncing with Callyzer...</p>
                    </div>
                ) : !file ? (
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <FileText size={32} className="text-slate-300 mb-3" />
                        <p className="text-slate-600 font-medium">Drag & Drop CSV here</p>
                        <p className="text-sm text-slate-400 mt-1">or click to browse</p>
                    </label>
                ) : (
                    <div className="flex flex-col items-center">
                        <FileText size={32} className="text-indigo-500 mb-3" />
                        <p className="text-slate-700 font-medium">{file.name}</p>
                        <button
                            onClick={uploadFile}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Upload & Sync
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
