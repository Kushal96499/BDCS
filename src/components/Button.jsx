// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Premium Reusable Button Component
// ============================================

import clsx from 'clsx';
import { motion } from 'framer-motion';

export default function Button({
    children,
    variant = 'primary',
    type = 'button',
    disabled = false,
    onClick,
    className,
    ...props
}) {
    const variants = {
        primary: 'bg-gradient-to-br from-[#E31E24] to-[#C6181D] text-white shadow-[0_4px_15px_rgba(227,30,36,0.25)] hover:shadow-[0_8px_25px_rgba(227,30,36,0.35)]',
        secondary: 'bg-white text-gray-900 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200',
        outline: 'bg-transparent text-[#E31E24] border-2 border-[#E31E24]/20 hover:border-[#E31E24] hover:bg-red-50',
        ghost: 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900',
        danger: 'bg-red-50 text-red-600 hover:bg-red-100'
    };

    const buttonClass = clsx(
        'relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm tracking-tight transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        variants[variant],
        className
    );

    return (
        <motion.button
            whileTap={{ scale: 0.96 }}
            type={type}
            className={buttonClass}
            disabled={disabled}
            onClick={onClick}
            {...props}
        >
            {children}
        </motion.button>
    );
}
