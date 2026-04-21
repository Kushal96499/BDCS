import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { createHODUser, assignHOD, getCollegeDepartments } from '../../services/principalService';
import { toast } from '../../components/admin/Toast';
import UserDetailPanel from '../../components/admin/UserDetailPanel';
import StatusPill from '../../components/common/StatusPill';
import { demoteHODToTeacher } from '../../services/promotionService';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export default function CollegeUserManagement() {
    const { user } = useAuth();
    const [showForm, setShowForm] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [hods, setHods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);


    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        employeeId: '',
        departmentId: '',
        joiningDate: new Date().toISOString().split('T')[0]
    });

    const [selectedHOD, setSelectedHOD] = useState(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user?.collegeId) {
            loadData();
        }
    }, [user?.collegeId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [depts, hodsData] = await Promise.all([
                getCollegeDepartments(user.collegeId),
                loadHODs()
            ]);
            setDepartments(depts);

            // Filter out current user (Principal) from HOD list to prevent "Ghost HOD"
            const filteredHods = hodsData.filter(h => h.id !== user.uid);
            setHods(filteredHods);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadHODs = async () => {
        try {
            if (!user?.collegeId) return [];

            // Query for multi-role format (roles array contains 'hod') - ALL HODs in college
            const multiRoleQuery = query(
                collection(db, 'users'),
                where('collegeId', '==', user.collegeId),
                where('roles', 'array-contains', 'hod'),
                where('status', '==', 'active')
            );

            // Query for single-role format (role === 'hod') - ALL HODs in college
            const singleRoleQuery = query(
                collection(db, 'users'),
                where('collegeId', '==', user.collegeId),
                where('role', '==', 'hod'),
                where('status', '==', 'active')
            );

            // Fetch both and combine
            const [multiRoleSnapshot, singleRoleSnapshot] = await Promise.all([
                getDocs(multiRoleQuery),
                getDocs(singleRoleQuery)
            ]);

            const multiRoleHODs = multiRoleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const singleRoleHODs = singleRoleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Combine and deduplicate by ID
            const allHODs = [...multiRoleHODs, ...singleRoleHODs];
            const uniqueHODs = Array.from(new Map(allHODs.map(hod => [hod.id, hod])).values());

            return uniqueHODs;
        } catch (error) {
            console.error('Error loading HODs:', error);
            return [];
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.departmentId) {
            toast.error('Please select a department');
            return;
        }

        setSubmitting(true);
        try {
            // Create New User
            if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.employeeId) {
                toast.error('All fields including Employee ID are required');
                setSubmitting(false);
                return;
            }
            if (formData.phone.length < 10) {
                toast.error('Phone number must be at least 10 digits');
                setSubmitting(false);
                return;
            }

            const result = await createHODUser(formData, formData.departmentId, user);
            toast.success(`✅ HOD account created! Initial password: firstname + last 4 of phone. They must reset on first login.`);

            setShowForm(false);
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                employeeId: '',
                departmentId: '',
                joiningDate: new Date().toISOString().split('T')[0]
            });
            loadData(); // Reload data
        } catch (error) {
            console.error('Error in HOD operation:', error);
            toast.error(error.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">HOD Management</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                         {user?.collegeName || 'Institutional'} • HOD List
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`w-full md:w-auto px-6 py-3 rounded-xl flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 border ${showForm ? 'bg-white text-gray-900 border-gray-100 hover:bg-gray-50' : 'bg-gray-900 text-white border-white/10 hover:bg-[#E31E24]'}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
                    </svg>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{showForm ? 'Cancel Operation' : 'Create / Assign HOD'}</span>
                </button>
            </div>

            {/* Creation Form */}
            {showForm && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8 animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Create New HOD</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="hod-firstName" className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                                <input
                                    id="hod-firstName"
                                    name="firstName"
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="hod-lastName" className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                                <input
                                    id="hod-lastName"
                                    name="lastName"
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="hod-email" className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                <input
                                    id="hod-email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="hod-phone" className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                                <input
                                    id="hod-phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label htmlFor="hod-emp-id" className="block text-sm font-medium text-gray-700 mb-2">Faculty ID (EMP) *</label>
                                <input
                                    id="hod-emp-id"
                                    name="employeeId"
                                    type="text"
                                    placeholder="institutional ID"
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="hod-department" className="block text-sm font-medium text-gray-700 mb-2">Assign to Department *</label>
                                <select
                                    id="hod-department"
                                    name="departmentId"
                                    value={formData.departmentId}
                                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                    required
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="hod-joining-date" className="block text-sm font-medium text-gray-700 mb-2">Joining Date *</label>
                                <input
                                    id="hod-joining-date"
                                    name="joiningDate"
                                    type="date"
                                    value={formData.joiningDate}
                                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-900 flex items-start gap-2">
                                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span>Password will be auto-generated: <strong>firstname + last 4 digits of phone</strong>. User must reset on first login.</span>
                            </p>
                        </div>

                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2.5 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Processing...' : 'Create HOD'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Existing HODs List - PREMIUM TABLE */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
                <div className="p-5 md:p-6 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Active HODs</h3>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{hods.length} Total HODs Found</p>
                    </div>
                    
                    <div className="relative w-full md:w-96 group">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-biyani-red transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth={3}/></svg>
                        </span>
                        <label htmlFor="hod-search" className="sr-only">Search HODs</label>
                        <input 
                            id="hod-search"
                            name="hod-search"
                            type="text" 
                            placeholder="Search by name or department..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-xl focus:border-biyani-red focus:ring-4 focus:ring-red-500/5 outline-none text-xs font-bold text-gray-900 transition-all placeholder:text-gray-300"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-gray-100 border-t-biyani-red rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Loading HODs...</p>
                    </div>
                ) : hods.length === 0 ? (
                    <div className="py-32 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeWidth={2}/></svg>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">No HODs Found</h3>
                        <p className="text-sm text-gray-400 max-w-xs mx-auto font-medium leading-relaxed">No Head of Departments have been appointed yet for this college.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">HOD Name</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Department</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {hods.filter(h => {
                                    const s = searchTerm.toLowerCase();
                                    return h.name?.toLowerCase().includes(s) || 
                                           h.departmentName?.toLowerCase().includes(s) || 
                                           h.email?.toLowerCase().includes(s);
                                }).map(hod => (
                                    <tr 
                                        key={hod.id} 
                                        className="group hover:bg-red-50/20 transition-all duration-300"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg group-hover:bg-biyani-red group-hover:rotate-6 transition-all uppercase">
                                                    {hod.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 group-hover:text-biyani-red transition-colors leading-none mb-1.5">{hod.name}</p>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded inline-block">Primary Head</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-700">{hod.email}</span>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5 opacity-60">Email Address</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-purple-100/50">
                                                <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
                                                {hod.departmentName || 'Unassigned'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusPill status="ACTIVE" type="success" />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => {
                                                    setSelectedHOD(hod);
                                                    setShowDetailPanel(true);
                                                }}
                                                className="px-4 py-2 bg-white border border-gray-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-all shadow-sm active:scale-95"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* HOD Detail Panel - Standardized Card Style */}
            {showDetailPanel && selectedHOD && (
                <UserDetailPanel
                    user={selectedHOD}
                    onClose={() => {
                        setShowDetailPanel(false);
                        setSelectedHOD(null);
                    }}
                    onUserUpdated={() => loadData()}
                    extraActions={[
                        {
                            label: 'Deactivate HOD',
                            variant: 'warning',
                            onClick: async () => {
                                if (!window.confirm('Deactivate this HOD? Status will be set to inactive.')) return;
                                try {
                                    await updateDoc(doc(db, 'users', selectedHOD.id), { status: 'inactive', updatedAt: serverTimestamp() });
                                    toast.success('HOD deactivated');
                                    loadData();
                                    setShowDetailPanel(false);
                                } catch (error) { toast.error('Deactivation failed'); }
                            }
                        },
                        {
                            label: 'Revoke HOD Role',
                            variant: 'danger',
                            onClick: async () => {
                                if (!window.confirm('Demote this HOD back to Teacher role? This will remove department ownership.')) return;
                                try {
                                    await demoteHODToTeacher(selectedHOD.id, selectedHOD.departmentId, 'Revoked by Principal', user);
                                    toast.success('Role revoked. User is now a Teacher.');
                                    loadData();
                                    setShowDetailPanel(false);
                                } catch (error) { toast.error(error.message || 'Revocation failed'); }
                            }
                        },
                        {
                            label: 'Delete HOD',
                            variant: 'danger',
                            onClick: async () => {
                                if (!window.confirm('CRITICAL: This will permanently delete the HOD record. Proceed?')) return;
                                try {
                                    if (selectedHOD.departmentId) {
                                        const deptRef = doc(db, 'departments', selectedHOD.departmentId);
                                        await updateDoc(deptRef, { currentHOD: null, currentHODName: null });
                                    }
                                    await deleteDoc(doc(db, 'users', selectedHOD.id));
                                    toast.success('HOD record deleted');
                                    loadData();
                                    setShowDetailPanel(false);
                                } catch (error) { toast.error('Delete failed'); }
                            }
                        }
                    ]}
                />
            )}
        </div>
    );
}
