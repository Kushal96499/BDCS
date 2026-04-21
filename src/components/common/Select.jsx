// ============================================
// BDCS - Premium Select Component
// Stylized standard select for consistent aesthetics
// ============================================

import React from 'react';
import PremiumSelect from './PremiumSelect';

export default function Select({ 
    label, 
    value, 
    onChange, 
    options = [], 
    className = "", 
    placeholder,
    containerClassName = "",
    id,
    name
}) {
    return (
        <PremiumSelect
            label={label}
            value={value}
            onChange={onChange}
            options={options}
            placeholder={placeholder}
            className={containerClassName}
            id={id || name}
        />
    );
}
