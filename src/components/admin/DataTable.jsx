// ============================================
// BDCS - Premium Data Table Component
// Desktop: Sleek Table | Mobile: Card View
// ============================================

import React, { memo } from 'react';
import Button from '../Button';
import { motion, AnimatePresence } from 'framer-motion';

const DataTable = ({
    columns,
    data,
    onEdit,
    onDelete,
    onStatusToggle,
    actions = true,
    emptyMessage = 'No data found',
    loading = false
}) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-premium-slide">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-red-50" />
                    <div className="absolute inset-0 rounded-full border-4 border-[#E31E24] border-t-transparent animate-spin" />
                </div>
                <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fetching Data...</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white shadow-xl shadow-gray-100/30 border border-dashed border-gray-100 rounded-[2rem] animate-premium-slide">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3zM9 12h6M9 16h3" />
                    </svg>
                </div>
                <p className="text-sm font-semibold text-gray-400">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* ── UNIFIED SCROLLABLE TABLE VIEW ───────────────────────── */}
            <div className="overflow-x-auto bg-white shadow-xl shadow-gray-100/20 rounded-[2rem] border border-gray-100 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                <table className="min-w-full divide-y divide-gray-100 table-auto">
                    <thead>
                        <tr className="bg-gray-50/20">
                            {columns.map((column, index) => (
                                <th
                                    key={index}
                                    className={`px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap ${column.headerClassName || ''}`}
                                >
                                    {column.header}
                                </th>
                            ))}
                            {actions && (
                                <th className="px-8 py-5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">
                                    Operations
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {data.map((row, rowIndex) => (
                                <motion.tr
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    key={row.id || row._id || rowIndex}
                                    className="hover:bg-red-50/10 transition-all group"
                                >
                                    {columns.map((column, colIndex) => (
                                        <td key={colIndex} className={`px-8 py-4.5 text-sm font-medium text-gray-700 whitespace-nowrap ${column.className || ''}`}>
                                            {column.render ? column.render(row) : row[column.field]}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-8 py-4.5 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5 lg:opacity-0 lg:group-hover:opacity-100 transition-all transform lg:group-hover:-translate-x-1">
                                                {onEdit && (
                                                    <Button 
                                                        variant="secondary" 
                                                        onClick={() => onEdit(row)} 
                                                        data-tooltip="Edit Record"
                                                        className="px-3 py-2 rounded-xl text-xs shadow-sm bg-white hover:bg-gray-900 hover:text-white border border-gray-100 transition-all active:scale-90"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </Button>
                                                )}
                                                {onStatusToggle && (
                                                    <Button 
                                                        variant={row.status === 'active' ? 'outline' : 'secondary'} 
                                                        onClick={() => onStatusToggle(row)} 
                                                        data-tooltip={row.status === 'active' ? "Deactivate Account" : "Activate Account"}
                                                        className="px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest whitespace-nowrap shadow-sm bg-white hover:bg-gray-50 active:scale-95"
                                                    >
                                                        {row.status === 'active' ? 'Off' : 'On'}
                                                    </Button>
                                                )}
                                                {onDelete && (
                                                    <Button 
                                                        variant="danger" 
                                                        onClick={() => onDelete(row)} 
                                                        data-tooltip="Permanent Deletion"
                                                        className="px-3 py-2 rounded-xl text-xs shadow-sm shadow-red-50 hover:bg-red-600 transition-all active:scale-90"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default memo(DataTable);
