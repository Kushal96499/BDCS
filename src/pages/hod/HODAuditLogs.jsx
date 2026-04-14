import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import SharedAuditLogs from '../../components/common/SharedAuditLogs';

export default function HODAuditLogs() {
    const { user } = useAuth();

    return (
        <SharedAuditLogs
            title="Department Audit Logs"
            subtitle={`Monitor activity within ${user?.departmentName || 'your department'}`}
        />
    );
}
