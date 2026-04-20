// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Admin Dashboard with Tailwind Layout
// ============================================

import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import QuickStatCard from '../../components/common/QuickStatCard';

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Stats (Mock or Global)
    const stats = {
        users: 1250,
        requests: 5,
        settings: 12
    };

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            await signOut(auth);
            navigate('/login');
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Admin Console</h1>
                        <p className="text-sm text-gray-500 font-medium">Biyani Digital Campus System</p>
                    </div>
                    <Button variant="outline" onClick={handleLogout}>
                        Logout
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <QuickStatCard
                        title="Active Users"
                        value={stats.users}
                        icon="👥"
                        color="bg-blue-500"
                        onClick={() => navigate('/admin/users')}
                    />
                    <QuickStatCard
                        title="Academic Settings"
                        value={stats.settings}
                        icon="⚙️"
                        color="bg-gray-600"
                        onClick={() => navigate('/admin/rules')}
                    />
                    <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 blur-[40px] rounded-full"></div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Super User</p>
                        <h3 className="text-2xl font-black leading-tight mb-2">{user?.name}</h3>
                        <p className="text-sm font-medium opacity-90">{user?.email}</p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Coming Soon / Panels */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                            <div className="w-16 h-16 bg-yellow-50 text-yellow-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🚧</div>
                            <h2 className="text-xl font-bold text-gray-900">Development In Progress</h2>
                            <p className="text-gray-500 max-w-md mx-auto mt-2">
                                The Global Administrator panels are currently being built. Full control over Roles, Permissions, and System Configuration will be available here.
                            </p>
                        </div>
                    </div>

                    {/* Quick Access */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900">System Modules</h2>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-2">
                            <button onClick={() => navigate('/admin/users')} className="w-full text-left p-3 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-3 font-medium text-gray-700">
                                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">👥</span>
                                User Management
                            </button>
                            <button onClick={() => navigate('/admin/rules')} className="w-full text-left p-3 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-3 font-medium text-gray-700">
                                <span className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">🛡️</span>
                                Access Control
                            </button>
                            <button onClick={() => navigate('/admin/audit')} className="w-full text-left p-3 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-3 font-medium text-gray-700">
                                <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">📜</span>
                                System Logs
                            </button>
                            <button onClick={() => navigate('/admin/settings')} className="w-full text-left p-3 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-3 font-medium text-gray-700">
                                <span className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">⚙️</span>
                                Settings
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
