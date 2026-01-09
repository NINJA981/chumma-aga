import React from 'react';
import { motion } from 'framer-motion';

const TactileButton = ({ children, onClick, className = '', variant = 'primary', icon: Icon, disabled = false }) => {
    const baseStyles = "relative inline-flex items-center justify-center font-medium rounded-xl transition-colors select-none cursor-pointer active:cursor-grabbing";

    const variants = {
        primary: "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500",
        secondary: "bg-white text-slate-700 border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50",
        danger: "bg-red-50 text-red-600 hover:bg-red-100",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
    };

    const sizeStyles = "px-6 py-3.5 text-base";

    return (
        <motion.button
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={`${baseStyles} ${variants[variant]} ${sizeStyles} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
        >
            {Icon && <Icon className="w-5 h-5 mr-2" />}
            {children}
        </motion.button>
    );
};

export default TactileButton;
