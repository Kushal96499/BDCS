import React from 'react';
import { motion } from 'framer-motion';

const Skeleton = ({ className, variant = 'rect', ...props }) => {
    const baseClass = "bg-slate-200 overflow-hidden relative";
    
    // Skeleton shimmer effect
    const shimmer = {
        initial: { x: '-100%' },
        animate: { x: '100%' },
        transition: {
            repeat: Infinity,
            duration: 1.5,
            ease: "linear"
        }
    };

    const variants = {
        rect: "rounded-xl",
        circle: "rounded-full",
        text: "h-4 rounded w-full mb-2 last:mb-0"
    };

    return (
        <div 
            className={`${baseClass} ${variants[variant] || variants.rect} ${className}`} 
            {...props}
        >
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full"
                variants={shimmer}
                initial="initial"
                animate="animate"
                transition={shimmer.transition}
            />
        </div>
    );
};

export const CardSkeleton = () => (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex justify-between items-start">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <div className="text-right space-y-2">
                <Skeleton className="w-16 h-3 rounded ml-auto" />
                <Skeleton className="w-24 h-8 rounded ml-auto" />
            </div>
        </div>
        <div className="space-y-3">
            <Skeleton className="w-2/3 h-6" />
            <Skeleton className="w-full h-4" />
        </div>
        <div className="pt-4 border-t border-slate-50 flex justify-between">
            <Skeleton className="w-20 h-3" />
            <Skeleton className="w-5 h-5 rounded-full" />
        </div>
    </div>
);

export const EventCardSkeleton = () => (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
        <Skeleton className="h-48 sm:h-56 rounded-none" />
        <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
                <Skeleton className="w-3/4 h-8" />
                <Skeleton className="w-1/2 h-4" />
            </div>
            <div className="flex items-center justify-between gap-4 mt-auto">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="w-32 h-4" />
                </div>
                <Skeleton className="w-16 h-3" />
            </div>
        </div>
    </div>
);

export default Skeleton;
