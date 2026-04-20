import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';
import { profileUpdateSchema } from '../schemas/userSchemas';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';

export default function UserProfileModal({ isOpen, onClose }) {
    useScrollLock(isOpen);
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

    useEffect(() => {
        if (user?.photoURL && !isStaff) setAvatarPreview(user.photoURL);
        reset({
            phoneNumber: user?.phoneNumber || '',
            bio: user?.bio || '',
        });
    }, [user?.photoURL, user?.phoneNumber, user?.bio, reset]);

    const handleFileChange = (e) => {
        if (isStaff) return;
        const file = e.target.files[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const compressImageToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
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
            if (avatarFile && !isStaff) photoURL = await compressImageToBase64(avatarFile);
            await updateDoc(doc(db, 'users', user.uid), {
                phoneNumber: data.phoneNumber || null,
                bio: data.bio || null,
                ...(!isStaff && photoURL && { photoURL }),
                updatedAt: new Date()
            });
            toast.success('Profile modernized!');
            await refreshUser();
            onClose();
        } catch (error) {
            toast.error(error.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Identity Hub</h3>
                                <p className="text-[10px] font-bold text-[#E31E24] uppercase tracking-widest mt-0.5">Profile Management</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSubmit(onSubmit)} className="p-8 overflow-y-auto space-y-8 custom-scrollbar overscroll-contain">
                            {/* Avatar & Basic Info */}
                            <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 flex items-center gap-6">
                                <div className="relative group shrink-0">
                                    <div className={`w-24 h-24 rounded-3xl flex items-center justify-center border-4 border-white shadow-xl overflow-hidden transition-all
                                        ${isStaff ? 'bg-gradient-to-br from-[#E31E24] to-red-800' : 'bg-gray-200 cursor-pointer group-hover:scale-95'}`}
                                        onClick={() => !isStaff && fileInputRef.current?.click()}
                                    >
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl font-black text-white">{user?.name?.[0]}</span>
                                        )}
                                    </div>
                                    {!isStaff && (
                                        <div className="absolute -bottom-2 -right-2 bg-white rounded-xl p-2 shadow-lg border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <svg className="w-4 h-4 text-[#E31E24]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-lg font-black text-gray-900 truncate leading-tight">{user?.name}</h4>
                                    <span className="inline-block mt-1 text-[10px] font-black text-[#E31E24] bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 uppercase tracking-widest">
                                        {user?.role?.replace('_', ' ')}
                                    </span>
                                    <p className="text-xs font-bold text-gray-400 mt-1 truncate">{user?.email}</p>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Number</label>
                                    <input
                                        type="tel"
                                        {...register('phoneNumber')}
                                        disabled={isStaff}
                                        className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-[#E31E24] outline-none transition-all ${errors.phoneNumber ? 'border-red-500' : 'border-gray-100'} ${isStaff ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        placeholder="Phone Number"
                                    />
                                    {errors.phoneNumber && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.phoneNumber.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bio / Description</label>
                                    <textarea
                                        {...register('bio')}
                                        disabled={isStaff}
                                        rows="3"
                                        className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-[#E31E24] outline-none transition-all resize-none ${errors.bio ? 'border-red-500' : 'border-gray-100'} ${isStaff ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        placeholder={isStaff ? "Profile managed by Institutional Administration" : "Write something about yourself..."}
                                    />
                                    {errors.bio && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.bio.message}</p>}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={onClose} 
                                    className="flex-1 px-6 py-4 text-xs font-black text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all uppercase tracking-widest">
                                    {isStaff ? 'Close Hub' : 'Discard'}
                                </button>
                                {!isStaff && (
                                    <button type="submit" disabled={loading}
                                        className="flex-1 px-6 py-4 text-xs font-black text-white bg-[#E31E24] rounded-2xl shadow-lg shadow-red-100 hover:shadow-red-200 hover:-translate-y-0.5 transition-all disabled:opacity-50 uppercase tracking-widest">
                                        {loading ? 'Updating...' : 'Sync Profile'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
