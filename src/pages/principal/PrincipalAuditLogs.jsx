import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import SharedAuditLogs from '../../components/common/SharedAuditLogs';

export default function PrincipalAuditLogs() {
    const { user } = useAuth();

    return (
        <SharedAuditLogs
            title="Audit Logs"
            subtitle={`Tracking actions for ${user?.collegeName || 'Your College'}`}
        />
    );
}
