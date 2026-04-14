// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Reusable Button Component
// ============================================

import clsx from 'clsx';

export default function Button({
    children,
    variant = 'primary',
    type = 'button',
    disabled = false,
    onClick,
    className,
    ...props
}) {
    const buttonClass = clsx(
        'relative overflow-hidden transition-all duration-300 transform active:scale-95 font-medium rounded-lg shadow-md',
        {
            // Primary: Rich Red Gradient
            'bg-gradient-to-r from-biyani-red to-biyani-red-dark text-white hover:shadow-lg hover:shadow-red-500/30': variant === 'primary' && !disabled,

            // Secondary: Glass/White
            'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 hover:shadow-md hover:border-gray-300': variant === 'secondary' && !disabled,

            // Outline: Red Border
            'bg-transparent text-biyani-red border-2 border-biyani-red hover:bg-red-50': variant === 'outline' && !disabled,

            // Disabled state
            'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border-gray-200': disabled
        },
        className
    );

    return (
        <button
            type={type}
            className={buttonClass}
            disabled={disabled}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
}
