import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';
import { profileUpdateSchema } from '../schemas/userSchemas';

export default function UserProfileModal({ isOpen, onClose }) {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.photoURL || null);
    const fileInputRef = useRef(null);

    const isStaff = ['admin', 'teacher', 'hod', 'principal', 'director', 'exam_cell', 'placement', 'hr'].includes(user?.role);

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(profileUpdateSchema),
        defaultValues: {
            phoneNumber: user?.phoneNumber || '',
            bio: user?.bio || '',
        },
    });

    // Sync form + preview when user data refreshes (e.g. after save or context update)
    useEffect(() => {
        if (user?.photoURL && !isStaff) setAvatarPreview(user.photoURL);
        reset({
            phoneNumber: user?.phoneNumber || '',
            bio: user?.bio || '',
        });
    }, [user?.photoURL, user?.phoneNumber, user?.bio, reset]);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        if (isStaff) return; // Staff cannot upload photos
        const file = e.target.files[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    // Compress image to base64 using canvas — no external service needed
    const compressImageToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => { img.src = e.target.result; };
            reader.onerror = reject;
            reader.readAsDataURL(file);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 300;
                let { width, height } = img;

                if (width > height) {
                    if (width > MAX_SIZE) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
                } else {
                    if (height > MAX_SIZE) { width = Math.round(width * MAX_SIZE / height); height = MAX_SIZE; }
                }

                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
        });
    };

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            let photoURL = user?.photoURL;
            // Only process avatar for students
            if (avatarFile && !isStaff) {
                photoURL = await compressImageToBase64(avatarFile);
            }

            await updateDoc(doc(db, 'users', user.uid), {
                phoneNumber: data.phoneNumber || null,
                bio: data.bio || null,
                ...(!isStaff && photoURL && { photoURL }),
                updatedAt: new Date()
            });

            toast.success('Profile updated successfully!');
            await refreshUser();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-800">My Profile</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto space-y-6">

                    {/* Identity Section (LOCKED) */}
                    <div className="bg-gray-50/80 p-5 rounded-2xl border border-dashed border-gray-200 space-y-5">
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 border-white shadow-sm overflow-hidden 
                                    ${isStaff ? 'bg-gradient-to-br from-gray-700 to-gray-900' : 'bg-gray-200 cursor-pointer group-hover:opacity-90'}`}
                                    onClick={() => !isStaff && fileInputRef.current?.click()}
                                >
                                    {isStaff ? (
                                        <span className="text-2xl font-black text-white">{user?.name?.[0] || '?'}</span>
                                    ) : avatarPreview ? (
                                        <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-bold text-gray-400">{user?.name?.[0]}</span>
                                    )}
                                </div>
                                {!isStaff && (
                                    <>
                                        <div className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border border-gray-100 cursor-pointer hover:bg-gray-50"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <svg className="w-3 h-3 text-biyani-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                    </>
                                )}
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">{user?.name || 'Unknown User'}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-200/50 px-2 py-0.5 rounded">
                                        {user?.role || 'User'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2 border-t border-gray-200/50">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Corporate Email</label>
                                <div className="text-gray-700 font-medium text-sm bg-white/50 px-3 py-2 rounded-lg border border-transparent flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    {user?.email || 'N/A'}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Institution</label>
                                <div className="text-gray-600 font-medium text-xs bg-white/50 px-3 py-2 rounded-lg border border-transparent flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                    {user?.collegeName || user?.collegeId || 'Biyani Group of Colleges'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Editable Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                            <svg className="w-4 h-4 text-biyani-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Personal Details</h4>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">🇮🇳</span>
                                </div>
                                <input
                                    type="tel"
                                    {...register('phoneNumber')}
                                    className={`w-full pl-10 px-4 py-3 bg-white border rounded-xl text-gray-900 focus:ring-4 focus:ring-red-50 focus:border-biyani-red transition-all font-medium ${errors.phoneNumber ? 'border-red-400' : 'border-gray-200'
                                        }`}
                                    placeholder="+91..."
                                />
                            </div>
                            {errors.phoneNumber && (
                                <p className="text-xs text-red-600 mt-1">{errors.phoneNumber.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Bio <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span></label>
                            <textarea
                                {...register('bio')}
                                rows="3"
                                className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:ring-4 focus:ring-red-50 focus:border-biyani-red transition-all resize-none ${errors.bio ? 'border-red-400' : 'border-gray-200'
                                    }`}
                                placeholder="Write a short professional bio..."
                            />
                            {errors.bio && (
                                <p className="text-xs text-red-600 mt-1">{errors.bio.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-biyani-red to-orange-600 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
