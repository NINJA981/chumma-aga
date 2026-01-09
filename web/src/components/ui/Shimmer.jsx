import React from 'react';

const Shimmer = ({ className = '', width, height, borderRadius }) => {
    const style = {
        width: width || '100%',
        height: height || '20px',
        borderRadius: borderRadius || '8px',
    };

    return (
        <div
            className={`relative overflow-hidden bg-slate-200 ${className}`}
            style={style}
        >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
    );
};

export default Shimmer;

