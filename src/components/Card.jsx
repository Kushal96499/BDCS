// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Reusable Card Component
// ============================================

export default function Card({ children, className = '', ...props }) {
    return (
        <div className={`card ${className}`} {...props}>
            {children}
        </div>
    );
}
