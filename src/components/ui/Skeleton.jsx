import React from 'react';

/**
 * Premium Skeleton Loader for BDCS
 * Provides a clean, modern pulse effect for loading states
 */
export default function Skeleton({ className, variant = 'rectangular' }) {
    const baseClass = "animate-pulse bg-gray-200";

    let variantClass = "";
    switch (variant) {
        case 'circle':
            variantClass = "rounded-full";
            break;
        case 'rounded':
            variantClass = "rounded-2xl";
            break;
        case 'text':
            variantClass = "rounded h-4 w-full mb-2";
            break;
        default:
            variantClass = "rounded-3xl";
    }

    return <div className={`${baseClass} ${variantClass} ${className}`}></div>;
}
