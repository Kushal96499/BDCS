import React, { useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { toast } from '../components/admin/Toast';
import Input from '../components/Input';
import { useNavigate } from 'react-router-dom';

export default function StudentActivation({ onBack }) {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Verify, 2: Set Password
    const [loading, setLoading] = useState(false);
    const [verifiedData, setVerifiedData] = useState(null);

    const [formData, setFormData] = useState({
        email: '',
        rollNumber: '',
        password: '',
        confirmPassword: ''
    });

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.rollNumber) {
            toast.error('Please enter email and roll number');
            return;
        }

        setLoading(true);
        try {
            // Check if student exists in 'users' collection with 'needsAuth' flag or just by role
            const q = query(
                collection(db, 'users'),
                where('email', '==', formData.email),
                where('rollNumber', '==', formData.rollNumber),
                where('role', '==', 'student')
            );

            const snap = await getDocs(q);

            if (snap.empty) {
                toast.error('Student record not found. Please contact your Class Teacher.');
                setLoading(false);
                return;
            }

            const studentDoc = snap.docs[0];
            const studentData = studentDoc.data();

            // Optional: Check if already registered (uid exists and matches auth?) 
            // For now, we assume if they are here, they can't login. 
            // We can check if `needsAuth` is true or if `uid` matches a pattern?
            // Actually, we'll try to create auth. If email in use, they should use normal login.

            setVerifiedData({ id: studentDoc.id, ...studentData });
            setStep(2);
        } catch (error) {
            console.error(error);
            toast.error('Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (e) => {
        e.preventDefault();
        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            // 2. Update Firestore Doc with the NEW Auth UID
            // This links the "Pre-created" doc to the "Actual" Auth user
            await updateDoc(doc(db, 'users', verifiedData.id), {
                uid: user.uid, // CRITICAL: Overwrite the placeholder UID (if any) or ensure checks use this
                authCreated: true, // Flag
                needsAuth: false,
                status: 'active'
            });

            toast.success('Account activated! You are now logged in.');
            navigate('/student'); // Redirect to student dashboard
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/email-already-in-use') {
                toast.error('Account already exists. Please Go Back and Login.');
            } else {
                toast.error('Activation failed. ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Student First-Time Login</h2>
            <p className="text-gray-500 mb-6 text-sm">Verify your details provided by your teacher to set your password.</p>

            {step === 1 ? (
                <form onSubmit={handleVerify} className="space-y-4">
                    <Input
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <Input
                        label="Roll Number"
                        value={formData.rollNumber}
                        onChange={e => setFormData({ ...formData, rollNumber: e.target.value })}
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-biyani-red text-white py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    >
                        {loading ? 'Verifying...' : 'Verify Identity'}
                    </button>
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full text-gray-500 text-sm py-2 hover:text-gray-700"
                    >
                        Cancel, Back to Login
                    </button>
                </form>
            ) : (
                <form onSubmit={handleActivate} className="space-y-4">
                    <div className="bg-green-50 text-green-700 p-3 rounded text-sm mb-4">
                        Success! Hello <strong>{verifiedData.name}</strong>. Set your password below.
                    </div>
                    <Input
                        label="Create Password"
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        required
                    />
                    <Input
                        label="Confirm Password"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-biyani-red text-white py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    >
                        {loading ? 'Activating...' : 'Activate Account & Login'}
                    </button>
                </form>
            )}
        </div>
    );
}
