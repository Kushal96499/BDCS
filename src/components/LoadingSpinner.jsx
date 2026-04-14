// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Loading Spinner Component
// ============================================

export default function LoadingSpinner({ message = 'Loading...' }) {
    return (
        <div className="flex flex-column items-center justify-center" style={{ minHeight: '100vh' }}>
            <div className="spinner"></div>
            {message && (
                <p className="text-muted mt-2">{message}</p>
            )}
        </div>
    );
}
