import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const KineticText = ({ text, className = '', type = 'spring' }) => {

    const animations = {
        spring: {
            y: [10, -5, 0],
            opacity: [0, 1],
            transition: { type: "spring", stiffness: 300, damping: 10 }
        },
        bounce: {
            scale: [0.8, 1.1, 1],
            opacity: [0, 1],
            transition: { type: "spring", stiffness: 400, damping: 15 }
        },
        pulse: {
            scale: [1, 1.05, 1],
            opacity: 1,
            transition: { repeat: Infinity, duration: 1.5 }
        }
    };

    return (
        <div className={`inline-block overflow-hidden ${className}`}>
            <AnimatePresence mode='wait'>
                <motion.span
                    key={text} // Triggers animation on text change
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="inline-block"
                >
                    {text}
                </motion.span>
            </AnimatePresence>
        </div>
    );
};

export default KineticText;
