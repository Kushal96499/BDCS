// ============================================
// BDCS - Enhanced Audit Logs Viewer
// Human-readable audit trail with entity metadata
// ============================================

import React from 'react';
import SharedAuditLogs from '../../../components/common/SharedAuditLogs';

export default function AuditLogs() {
    return (
        <SharedAuditLogs 
            title="Institutional Audit Registry" 
            subtitle="System activity and change history" 
        />
    );
}
