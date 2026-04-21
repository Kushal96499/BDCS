// ============================================
// BDCS - Student Profile (Academic File)
// Institutional Premium
// ============================================

import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { db, auth } from '../../config/firebase';
import { toast } from '../../components/admin/Toast';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const PROJECT_TYPES = {
    software: { label: 'Software', icon: '💻' },
    research: { label: 'Research', icon: '🧪' },
    pharmacy: { label: 'Pharmacy', icon: '💊' },
    case_study: { label: 'Case Study', icon: '📊' },
    creative: { label: 'Creative', icon: '🎨' },
    hardware: { label: 'Hardware', icon: '🏗️' },
    assignment: { label: 'Assignment', icon: '📚' },
    other: { label: 'Other', icon: '🧠' }
};

export default function StudentProfile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [visibility, setVisibility] = useState(user?.profile_visibility || 'public');
    const [updating, setUpdating] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [projects, setProjects] = useState([]);
    const [displayCourseName, setDisplayCourseName] = useState(user?.courseName || '');
    const [displayDeptName, setDisplayDeptName] = useState(user?.departmentName || '');
    const [displayCollegeName, setDisplayCollegeName] = useState(user?.collegeName || user?.campusName || '');

    // Photo Modal state
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [loadingProjects, setLoadingProjects] = useState(true);

    // Social Links state
    const [socialLinks, setSocialLinks] = useState(user?.socialLinks || []);
    const [showAddLink, setShowAddLink] = useState(false);
    const [newLink, setNewLink] = useState({ name: '', url: '' });
    const [savingLink, setSavingLink] = useState(false);

    const currentYear = new Date().getFullYear();
    const academicYearStr = `${currentYear}-${currentYear + 1}`;

    const isBacklog = user?.academicStatus === 'BACKLOG' || user?.academicStatus === 'REPEAT_YEAR';

    useEffect(() => {
        if (user?.uid) {
            fetchSubjects();
            fetchProjects();
            resolveCourseName();
        }
    }, [user?.uid, user?.departmentId, user?.courseId, user?.currentSemester]);

    const resolveCourseName = async () => {
        if (user?.courseName) {
            setDisplayCourseName(user.courseName);
            return;
        }
        if (user?.courseId) {
            try {
                const courseDoc = await getDoc(doc(db, 'courses', user.courseId));
                if (courseDoc.exists()) setDisplayCourseName(courseDoc.data().name);
            } catch (err) { console.error("Failed to fetch course:", err); }
        }

        if (!user?.departmentName && user?.departmentId) {
            try {
                const deptDoc = await getDoc(doc(db, 'departments', user.departmentId));
                if (deptDoc.exists()) setDisplayDeptName(deptDoc.data().name);
                else setDisplayDeptName(user.departmentId);
            } catch (err) { console.error("Failed to fetch dept:", err); setDisplayDeptName(user.departmentId); }
        } else if (user?.departmentName) {
            setDisplayDeptName(user.departmentName);
        }

        // Campus / College mapping
        let collegeVal = user?.collegeName || user?.campusName || '';

        if (!collegeVal) {
            try {
                // Try finding college via user's collegeId
                if (user?.collegeId) {
                    const collDoc = await getDoc(doc(db, 'colleges', user.collegeId));
                    if (collDoc.exists()) {
                        collegeVal = collDoc.data().name;
                    }
                }

                // Try finding campus via user's campusId
                if (!collegeVal && user?.campusId) {
                    const campDoc = await getDoc(doc(db, 'campuses', user.campusId));
                    if (campDoc.exists()) {
                        collegeVal = campDoc.data().name;
                    }
                }

                // If still missing, try resolving via department
                if (!collegeVal && user?.departmentId) {
                    const deptDoc = await getDoc(doc(db, 'departments', user.departmentId));
                    if (deptDoc.exists()) {
                        const deptData = deptDoc.data();
                        if (deptData.collegeId) {
                            const dCollDoc = await getDoc(doc(db, 'colleges', deptData.collegeId));
                            if (dCollDoc.exists()) {
                                collegeVal = dCollDoc.data().name;
                            }
                        } else if (deptData.campusId) {
                            const dCampDoc = await getDoc(doc(db, 'campuses', deptData.campusId));
                            if (dCampDoc.exists()) {
                                collegeVal = dCampDoc.data().name;
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to dynamically fetch campus/college name:", err);
            }
        }

        setDisplayCollegeName(collegeVal || 'Not Assigned');
    };

    useEffect(() => {
        if (user?.socialLinks) setSocialLinks(user.socialLinks);
    }, [user?.socialLinks]);

    const fetchSubjects = async () => {
        setLoadingSubjects(true);
        try {
            if (user?.departmentId && user?.currentSemester) {
                // Subjects are stored by departmentId + courseId + semester (as int)
                const constraints = [
                    where('departmentId', '==', user.departmentId),
                    where('semester', '==', Number(user.currentSemester)),
                    where('status', '==', 'active')
                ];
                if (user.courseId) {
                    constraints.push(where('courseId', '==', user.courseId));
                }
                const q = query(collection(db, 'subjects'), ...constraints);
                const snap = await getDocs(q);
                let subjectsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Fetch teacher assignments from class_assignments
                if (user.batchId) {
                    const assignQ = query(
                        collection(db, 'class_assignments'),
                        where('batchId', '==', user.batchId),
                        where('semester', '==', Number(user.currentSemester))
                    );
                    const assignSnap = await getDocs(assignQ);
                    const assignMap = {};
                    assignSnap.docs.forEach(d => {
                        const data = d.data();
                        assignMap[data.subjectId] = data.teacherName;
                    });

                    // Merge teacher names into subjects
                    subjectsList = subjectsList.map(sub => ({
                        ...sub,
                        teacherName: assignMap[sub.id] || sub.teacherName || null
                    }));
                }

                setSubjects(subjectsList);
            }
        } catch (err) {
            console.error('Error fetching subjects:', err);
        } finally {
            setLoadingSubjects(false);
        }
    };

    const fetchProjects = async () => {
        setLoadingProjects(true);
        try {
            const q = query(
                collection(db, 'projects'),
                where('studentId', '==', user.uid)
            );
            const snap = await getDocs(q);
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setProjects(docs);
        } catch (err) {
            console.error('Error fetching projects:', err);
        } finally {
            setLoadingProjects(false);
        }
    };

    const handleToggleVisibility = async (newVal) => {
        setUpdating(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), { profile_visibility: newVal, updatedAt: new Date() });
            setVisibility(newVal);
            toast.success(newVal === 'public' ? 'Profile set to Public 🌐' : 'Profile set to Private 🔒');
        } catch { toast.error('Failed to update visibility'); }
        finally { setUpdating(false); }
    };

    const handleAddLink = async () => {
        if (!newLink.name.trim() || !newLink.url.trim()) {
            toast.error('Please fill both fields');
            return;
        }
        setSavingLink(true);
        try {
            const linkObj = { name: newLink.name.trim(), url: newLink.url.trim(), addedAt: new Date().toISOString() };
            await updateDoc(doc(db, 'users', user.uid), {
                socialLinks: arrayUnion(linkObj),
                updatedAt: new Date()
            });
            setSocialLinks(prev => [...prev, linkObj]);
            setNewLink({ name: '', url: '' });
            setShowAddLink(false);
            toast.success('Link added ✨');
        } catch (err) {
            console.error('Error adding link:', err);
            toast.error('Failed to add link');
        } finally {
            setSavingLink(false);
        }
    };

    const handleRemoveLink = async (link) => {
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                socialLinks: arrayRemove(link),
                updatedAt: new Date()
            });
            setSocialLinks(prev => prev.filter(l => l.url !== link.url || l.name !== link.name));
            toast.success('Link removed');
        } catch (err) {
            console.error('Error removing link:', err);
            toast.error('Failed to remove link');
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        setUploadingPhoto(true);
        try {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let { width, height } = img;
                        const MAX_SIZE = 1200; // High quality resolution

                        if (width > height) {
                            if (width > MAX_SIZE) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
                        } else {
                            if (height > MAX_SIZE) { width = Math.round(width * MAX_SIZE / height); height = MAX_SIZE; }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.92)); // Best quality compression
                    };
                    img.onerror = reject;
                    img.src = event.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            await updateDoc(doc(db, 'users', user.uid), {
                photoURL: base64,
                updatedAt: new Date()
            });
            toast.success('Profile photo updated ✨');
        } catch (error) {
            console.error('Photo upload error:', error);
            toast.error('Failed to update photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const getStatusInfo = () => {
        if (user?.status === 'suspended') return { bg: 'bg-red-500/10', text: 'text-red-600', dot: 'bg-red-500', label: 'Suspended' };
        if (user?.resultStatus === 'pending') return { bg: 'bg-amber-500/10', text: 'text-amber-600', dot: 'bg-amber-500', label: 'Result Pending' };
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Active Student' };
    };

    const statusInfo = getStatusInfo();

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24">

            {/* ═══════════════════════════════════════════════════
                HERO HEADER
            ═══════════════════════════════════════════════════ */}
            <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
                {/* Top accent bar */}
                <div className="h-1 bg-gradient-to-r from-[#E31E24] via-[#E31E24] to-red-400" />

                <div className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-5">
                        {/* Avatar */}
                        <div className="flex-shrink-0 cursor-pointer group" onClick={() => setShowPhotoModal(true)}>
                            <div className="w-[88px] h-[88px] rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-100 overflow-hidden flex items-center justify-center shadow-sm relative transition-transform duration-200 group-hover:scale-105">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt={user?.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-black text-gray-300">{user?.name?.charAt(0) || '?'}</span>
                                )}
                                {/* Overlay for Edit */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span className="text-[10px] font-bold text-white tracking-wide">EDIT</span>
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">{user?.name || '—'}</h1>
                                    <p className="text-sm font-mono font-semibold text-gray-400 mt-0.5">{user?.rollNumber || 'Roll No. not assigned'}</p>
                                </div>
                                {/* Status */}
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold self-start ${statusInfo.bg} ${statusInfo.text}`}>
                                    <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`} />
                                    {statusInfo.label}
                                </span>
                            </div>

                            {/* Quick pills */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                <InfoPill icon="🎓" value={displayCourseName} />
                                <InfoPill icon="🏛️" value={displayDeptName} />
                                <InfoPill icon="📚" value={user?.currentSemester ? `Sem ${user.currentSemester}` : null} />
                                <InfoPill icon="🏫" value={displayCollegeName} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                ACADEMIC IDENTITY
            ═══════════════════════════════════════════════════ */}
            <Section title="Academic Identity" emoji="🪪">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                    <Field label="Roll Number" value={user?.rollNumber} mono />
                    <Field label="Semester" value={user?.currentSemester ? `Semester ${user.currentSemester}` : '—'} />
                    <Field label="Course" value={displayCourseName} />
                    <Field label="Department" value={displayDeptName} />
                    <Field label="Batch" value={user?.batchName || user?.batchId} />
                    <Field label="Campus" value={displayCollegeName} />
                </div>
            </Section>

            {/* ═══════════════════════════════════════════════════
                ACADEMIC PROGRESS (Rollback / Backlog Tracking)
            ═══════════════════════════════════════════════════ */}
            <Section title="Academic Progress" emoji="📊">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                    <Field label="Original Batch" value={user?.originalBatchName || user?.batchName || '—'} />
                    <Field label="Current Batch" value={user?.batchName || '—'} />
                    <Field label="Current Year" value={user?.currentYear ? `Year ${user.currentYear}` : '—'} />
                    <Field label="Current Semester" value={user?.currentSemester ? `Semester ${user.currentSemester}` : '—'} />
                    <div className="flex flex-col py-2 border-b border-gray-50 last:border-0">
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-0.5">Academic Status</span>
                        <span className={`inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full text-xs font-bold ${user?.academicStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : user?.academicStatus === 'BACKLOG'
                                ? 'bg-orange-100 text-orange-700'
                                : user?.academicStatus === 'REPEAT_YEAR'
                                    ? 'bg-red-100 text-red-700'
                                    : user?.academicStatus === 'PASSOUT'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-600'
                            }`}>
                            {user?.academicStatus || 'ACTIVE'}
                        </span>
                    </div>
                    {user?.rollbackReason && (
                        <Field label="Rollback Reason" value={user.rollbackReason} />
                    )}
                </div>
                {user?.backlogSubjects?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2">Backlog Subjects</p>
                        <div className="flex flex-wrap gap-2">
                            {user.backlogSubjects.map((sub, i) => (
                                <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-xl">
                                    {sub}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </Section>

            {/* ═══════════════════════════════════════════════════
                SUBJECTS — AUTO FROM CURRENT SEMESTER
            ═══════════════════════════════════════════════════ */}
            {!isBacklog && (
                <Section title={`Subjects — Sem ${user?.currentSemester || ''}`} emoji="📖">
                    {loadingSubjects ? (
                        <LoadingDots />
                    ) : subjects.length > 0 ? (
                        <div className="overflow-x-auto -mx-5 sm:-mx-6">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left px-5 sm:px-6 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Code</th>
                                        <th className="text-left px-3 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Subject</th>
                                        <th className="text-left px-3 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider hidden sm:table-cell">Teacher</th>
                                        <th className="text-center px-3 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Cr</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {subjects.map(sub => (
                                        <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-5 sm:px-6 py-3 font-mono text-xs font-bold text-gray-500">{sub.code || '—'}</td>
                                            <td className="px-3 py-3 font-semibold text-gray-800">{sub.name || sub.subjectName || '—'}</td>
                                            <td className="px-3 py-3 text-gray-400 text-xs hidden sm:table-cell">{sub.teacherName || '—'}</td>
                                            <td className="px-3 py-3 text-center">
                                                <span className="inline-block w-7 h-7 rounded-lg bg-gray-100 text-xs font-bold text-gray-600 leading-7">{sub.credits || '—'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState message="No subjects registered for current semester." emoji="📭" />
                    )}
                </Section>
            )}

            {/* ═══════════════════════════════════════════════════
                ACADEMIC PROJECTS
            ═══════════════════════════════════════════════════ */}
            <Section title="Academic Projects" emoji="🚀" action={
                (!isBacklog) && (
                    <button onClick={() => navigate('/student/projects')} className="text-[11px] font-bold text-[#E31E24] hover:underline">
                        View All →
                    </button>
                )
            }>
                {isBacklog ? (
                    <EmptyState message="Academic Projects are locked during backlog mode." emoji="🔒" />
                ) : loadingProjects ? (
                    <LoadingDots />
                ) : projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {projects.slice(0, 4).map(proj => {
                            const typeInfo = PROJECT_TYPES[proj.projectType] || PROJECT_TYPES.other;
                            return (
                                <div
                                    key={proj.id}
                                    onClick={() => navigate('/student/projects')}
                                    className="group flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {proj.imageUrl ? (
                                            <img src={proj.imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xl">{typeInfo.icon}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate group-hover:text-[#E31E24] transition-colors">{proj.title}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            {typeInfo.label} • Sem {proj.semester || '—'}
                                        </p>
                                        {proj.tags?.length > 0 && (
                                            <div className="flex gap-1 mt-1.5">
                                                {proj.tags.slice(0, 2).map((tag, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200/60 text-gray-500 uppercase">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState message="No projects yet. Create your first one!" emoji="🎯" action={
                        <button onClick={() => navigate('/student/projects')} className="mt-3 px-4 py-2 text-xs font-bold text-white bg-[#E31E24] rounded-lg hover:bg-red-700 transition-colors">
                            + Create Project
                        </button>
                    } />
                )}
            </Section>

            {/* ═══════════════════════════════════════════════════
                SOCIAL LINKS
            ═══════════════════════════════════════════════════ */}
            <Section title="Social Links" emoji="🔗" action={
                (!showAddLink && !isBacklog) && (
                    <button onClick={() => setShowAddLink(true)} className="text-[11px] font-bold text-[#E31E24] hover:underline">
                        + Add Link
                    </button>
                )
            }>
                {isBacklog ? (
                    <EmptyState message="Social Links are locked during backlog mode." emoji="🔒" />
                ) : socialLinks.length > 0 ? (
                    <div className="space-y-2 mb-4">
                        {socialLinks.map((link, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 group">
                                {/* Icon */}
                                <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <span className="text-sm">🔗</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-700 truncate">{link.name}</p>
                                    <a
                                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] text-blue-500 hover:underline truncate block"
                                    >
                                        {link.url}
                                    </a>
                                </div>
                                <button
                                    onClick={() => handleRemoveLink(link)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                                    title="Remove"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : !showAddLink ? (
                    <EmptyState message="Add your portfolio, LinkedIn, GitHub or any link." emoji="🌐" action={
                        <button onClick={() => setShowAddLink(true)} className="mt-3 px-4 py-2 text-xs font-bold text-[#E31E24] bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                            + Add Your First Link
                        </button>
                    } />
                ) : null}

                {/* Add link form */}
                {showAddLink && (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Label</label>
                                <input
                                    type="text"
                                    value={newLink.name}
                                    onChange={e => setNewLink(p => ({ ...p, name: e.target.value }))}
                                    className="w-full px-3 py-2.5 text-sm font-medium border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#E31E24]/20 focus:border-[#E31E24]"
                                    placeholder="e.g. Portfolio, GitHub, LinkedIn..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">URL</label>
                                <input
                                    type="url"
                                    value={newLink.url}
                                    onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))}
                                    className="w-full px-3 py-2.5 text-sm font-medium border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#E31E24]/20 focus:border-[#E31E24]"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddLink}
                                disabled={savingLink}
                                className="px-4 py-2 text-xs font-bold text-white bg-[#E31E24] rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {savingLink ? 'Saving...' : 'Save Link'}
                            </button>
                            <button
                                onClick={() => { setShowAddLink(false); setNewLink({ name: '', url: '' }); }}
                                className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </Section>

            {/* ═══════════════════════════════════════════════════
                DIRECTORY VISIBILITY
            ═══════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <span>👁️</span>
                        Directory Visibility
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Controls whether you appear in the public student directory.</p>
                </div>
                <div className="flex rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0 shadow-sm">
                    <button
                        onClick={() => handleToggleVisibility('public')}
                        disabled={updating}
                        className={`px-4 py-2 text-xs font-bold transition-all ${visibility === 'public'
                            ? 'bg-[#E31E24] text-white'
                            : 'text-gray-400 hover:bg-gray-100'
                            }`}
                    >
                        🌐 Public
                    </button>
                    <button
                        onClick={() => handleToggleVisibility('private')}
                        disabled={updating}
                        className={`px-4 py-2 text-xs font-bold transition-all border-l border-gray-200 ${visibility === 'private'
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-400 hover:bg-gray-100'
                            }`}
                    >
                        🔒 Private
                    </button>
                </div>
            </div>
            <div className="h-6" />

            {/* ═══════════════════════════════════════════════════
                PHOTO MODAL (LinkedIn-style Expander)
            ═══════════════════════════════════════════════════ */}
            <AnimatePresence>
                {showPhotoModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-xl"
                        onClick={() => setShowPhotoModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowPhotoModal(false)}
                                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors backdrop-blur-md font-bold"
                            >
                                ✕
                            </button>

                            <div className="w-full aspect-square bg-gray-50 flex items-center justify-center relative group">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-9xl font-black text-gray-200">{user?.name?.charAt(0) || '?'}</span>
                                )}

                                {uploadingPhoto && (
                                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                        <div className="w-12 h-12 border-4 border-[#E31E24] border-t-transparent rounded-full animate-spin"></div>
                                        <p className="mt-4 text-sm font-bold text-gray-900 tracking-wide">Enhancing & Uploading...</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-white border-t border-gray-100 flex flex-col gap-3">
                                <h3 className="font-bold text-lg text-gray-900 text-center">Profile Photo</h3>
                                <p className="text-xs text-gray-500 text-center mb-2">Upload a professional, clear photo for your institutional identity card and records.</p>

                                <label className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-gray-900 hover:bg-black focus:ring-4 focus:ring-gray-200 rounded-xl text-white text-sm font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>Upload New Photo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                                </label>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* ═══════════════════════════════════════════════════
                SYSTEM & CONTROL
            ═══════════════════════════════════════════════════ */}
            <h3 className="section-title text-slate-400 mt-12 mb-6 uppercase text-[10px] font-black tracking-widest">System & Control</h3>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span>🔐</span>
                            Session Management
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium uppercase tracking-tight">Logout of your account on this device.</p>
                    </div>
                    <button
                        onClick={() => auth.signOut().then(() => navigate('/login'))}
                        className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-[#E31E24] hover:shadow-red-200 transition-all active:scale-95"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="h-20" />
        </div>
    );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────

function InfoPill({ icon, value }) {
    if (!value) return null;
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-xs font-semibold text-gray-600">
            <span>{icon}</span>
            {value}
        </span>
    );
}

function StatCard({ label, value, sub, accent }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full" style={{ backgroundColor: accent }} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-2">{label}</p>
            <p className="text-2xl font-black text-gray-900 mt-1 pl-2 leading-none">{value}</p>
            {sub && <p className="text-[11px] text-gray-300 font-semibold mt-1 pl-2">{sub}</p>}
        </div>
    );
}

function Section({ title, emoji, children, action }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
            <div className="px-5 sm:px-6 py-3 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-2">
                    <span>{emoji}</span> {title}
                </h2>
                {action}
            </div>
            <div className="p-5 sm:p-6">{children}</div>
        </div>
    );
}

function Field({ label, value, mono }) {
    return (
        <div className="flex flex-col py-2 border-b border-gray-50 last:border-0">
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-0.5">{label}</span>
            <span className={`text-sm font-bold text-gray-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
        </div>
    );
}

function EmptyState({ message, emoji, action }) {
    return (
        <div className="text-center py-8 rounded-xl border border-dashed border-gray-200 bg-gray-50/40">
            <span className="text-2xl block mb-1">{emoji || '📭'}</span>
            <p className="text-sm text-gray-400 font-medium">{message}</p>
            {action}
        </div>
    );
}

function LoadingDots() {
    return (
        <div className="py-8 flex justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
    );
}
