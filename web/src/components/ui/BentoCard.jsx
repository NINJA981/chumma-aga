import React from 'react';
import { motion } from 'framer-motion';

const BentoCard = ({ children, className = '', title, subtitle, icon: Icon, delay = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
            className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl transition-all duration-300 ${className}`}
        >
            <div className="relative z-10 flex flex-col h-full">
                {(title || Icon) && (
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            {title && <h3 className="text-lg font-semibold text-slate-800 tracking-tight">{title}</h3>}
                            {subtitle && <p className="text-sm text-slate-500 font-medium mt-1">{subtitle}</p>}
                        </div>
                        {Icon && (
                            <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300">
                                <Icon size={24} />
                            </div>
                        )}
                    </div>
                )}
                <div className="flex-1">
                    {children}
                </div>
            </div>

            {/* Subtle Gradient Glow on Hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white via-transparent to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </motion.div>
    );
};

export default BentoCard;
