// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Placement Officer Dashboard
// ============================================

import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Card from '../../components/Card';

export default function PlacementDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (confirm('Are you sure you want to logout?')) {
            await signOut(auth);
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b-4 border-biyani-red">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-biyani-red text-white flex items-center justify-center rounded-lg text-2xl font-bold">
                                B
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">Placement Officer</h1>
                                <p className="text-sm text-gray-600">Biyani Digital Campus System</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">
                    <Card>
                        <div>
                            <h2 className="text-xl font-semibold text-biyani-red mb-4">
                                Welcome, {user?.name || user?.email}!
                            </h2>
                            <div className="space-y-2">
                                <p className="text-gray-700">
                                    <strong className="text-gray-900">Role:</strong> Placement Officer
                                </p>
                                <p className="text-gray-700">
                                    <strong className="text-gray-900">Email:</strong> {user?.email}
                                </p>
                                {user?.campus && (
                                    <p className="text-gray-700">
                                        <strong className="text-gray-900">Campus:</strong> {user.campus}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-lg font-semibold mb-3">🚧 Coming Soon</h3>
                        <p className="text-gray-700">
                            Placement modules are currently under development.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
