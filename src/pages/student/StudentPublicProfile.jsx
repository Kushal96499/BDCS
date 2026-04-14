import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };
const container = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

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

export default function StudentPublicProfile() {
    const { studentId } = useParams();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [lightbox, setLightbox] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [displayCourseName, setDisplayCourseName] = useState('');

    useEffect(() => { if (studentId) fetchProfile(); }, [studentId]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const userSnap = await getDoc(doc(db, 'users', studentId));
            if (!userSnap.exists()) { setNotFound(true); return; }
            const data = userSnap.data();

            if (data.role !== 'student' || data.profile_visibility === 'private') {
                setNotFound(true); return;
            }

            // Fallback for course name
            let resolvedCourseName = data.courseName || '';
            if (!resolvedCourseName && data.courseId) {
                try {
                    const courseDoc = await getDoc(doc(db, 'courses', data.courseId));
                    if (courseDoc.exists()) resolvedCourseName = courseDoc.data().name;
                } catch (e) {
                    console.error('Failed to fetch fallback course name', e);
                    resolvedCourseName = data.courseId;
                }
            }
            setDisplayCourseName(resolvedCourseName);

            // Campus / College mapping fallback
            let collegeVal = data.collegeName || data.campusName || '';

            if (!collegeVal) {
                try {
                    if (data.collegeId) {
                        const collDoc = await getDoc(doc(db, 'colleges', data.collegeId));
                        if (collDoc.exists()) {
                            collegeVal = collDoc.data().name;
                        }
                    }

                    if (!collegeVal && data.campusId) {
                        const campDoc = await getDoc(doc(db, 'campuses', data.campusId));
                        if (campDoc.exists()) {
                            collegeVal = campDoc.data().name;
                        }
                    }

                    if (!collegeVal && data.departmentId) {
                        const deptDoc = await getDoc(doc(db, 'departments', data.departmentId));
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

            // Only expose safe public fields — never email, phone, marks, attendance
            setProfile({
                id: userSnap.id,
                name: data.name,
                currentSemester: data.currentSemester,
                batchName: data.batchName,
                departmentId: data.departmentId,
                departmentName: data.departmentName,
                collegeName: collegeVal || 'Not Assigned',
                photoURL: data.photoURL || null,
                socialLinks: data.socialLinks || []
            });

            const projSnap = await getDocs(query(
                collection(db, 'projects'),
                where('studentId', '==', studentId),
                where('visibility', '==', 'Public')
            ));

            const docs = projSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setProjects(docs);

        } catch (e) {
            console.error(e);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <ProfileSkeleton />;
    if (notFound) return <NotFound onBack={() => navigate('/student/directory')} />;

    const initials = profile.name?.charAt(0) || '?';
    const displayBatch = profile.batchName || null;

    return (
        <motion.div variants={container} initial="hidden" animate="visible"
            className="min-h-screen bg-gray-50 pb-24 md:pb-10"
        >
            {/* ── BACK ── */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 mb-4">
                <button onClick={() => navigate('/student/directory')}
                    className="flex flex-row items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Student Directory</span>
                </button>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">

                {/* ═══════════════════════════════════════════════════
                    HERO HEADER (GenZ Style)
                ═══════════════════════════════════════════════════ */}
                <motion.div variants={fade} className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Top accent bar */}
                    <div className="h-1 bg-gradient-to-r from-[#E31E24] via-[#E31E24] to-red-400" />

                    {/* Top-right verified badge */}
                    <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-1.5 shadow-sm">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase">Verified Student</span>
                    </div>

                    <div className="p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row gap-5">
                            {/* Avatar */}
                            <div className="flex-shrink-0 cursor-pointer group" onClick={() => setLightbox(true)}>
                                <div className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-100 overflow-hidden flex items-center justify-center shadow-sm relative transition-transform duration-200 group-hover:scale-105">
                                    {profile.photoURL ? (
                                        <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-black text-gray-300">{initials}</span>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">{profile.name}</h1>

                                <div className="flex sm:hidden items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1 w-fit mt-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    <span className="text-[9px] font-black text-emerald-700 uppercase">Verified</span>
                                </div>

                                {/* Quick pills */}
                                <div className="flex flex-wrap gap-2 mt-4">
                                    <InfoPill icon="🎓" value={displayCourseName} />
                                    <InfoPill icon="🏛️" value={profile.departmentName || profile.departmentId} />
                                    <InfoPill icon="📚" value={profile.currentSemester ? `Sem ${profile.currentSemester}` : null} />
                                    <InfoPill icon="📅" value={displayBatch} />
                                    <InfoPill icon="🏫" value={profile.collegeName || 'Biyani College'} />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ═══════════════════════════════════════════════════
                    PUBLIC PROJECTS
                ═══════════════════════════════════════════════════ */}
                <motion.div variants={fade}>
                    <Section title="Public Projects" emoji="🚀">
                        {projects.length === 0 ? (
                            <EmptyState message="No public projects shared yet." emoji="📭" />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {projects.map(proj => {
                                    const typeInfo = PROJECT_TYPES[proj.projectType] || PROJECT_TYPES.other;
                                    return (
                                        <div
                                            key={proj.id}
                                            onClick={() => setSelectedProject(proj)}
                                            className="group flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-16 h-16 rounded-xl bg-white border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                                                {proj.imageUrl ? (
                                                    <img src={proj.imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-2xl">{typeInfo.icon}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-800 truncate group-hover:text-[#E31E24] transition-colors">{proj.title}</p>
                                                <p className="text-[11px] text-gray-500 mt-0.5 font-medium line-clamp-1">
                                                    {typeInfo.label} • {proj.description}
                                                </p>
                                                {proj.tags?.length > 0 && (
                                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                                        {proj.tags.slice(0, 3).map((tag, i) => (
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
                        )}
                    </Section>
                </motion.div>

                {/* ═══════════════════════════════════════════════════
                    SOCIAL LINKS
                ═══════════════════════════════════════════════════ */}
                {profile.socialLinks && profile.socialLinks.length > 0 && (
                    <motion.div variants={fade}>
                        <Section title="Social & Portfolio Links" emoji="🔗">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {profile.socialLinks.map((link, idx) => (
                                    <a
                                        key={idx}
                                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-[#E31E24]/30 hover:bg-red-50/30 transition-all group"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:border-[#E31E24]/30">
                                            <span className="text-sm grayscale group-hover:grayscale-0 transition-all">🔗</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate group-hover:text-[#E31E24] transition-colors">{link.name}</p>
                                            <p className="text-[10px] font-medium text-gray-400 truncate mt-0.5">{link.url.replace(/^https?:\/\//, '')}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </Section>
                    </motion.div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-center gap-2 py-6 opacity-30 pointer-events-none">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Public Student Profile · BDCS</span>
                </div>
            </div>

            {/* ── PROJECT DETAIL MODAL ── */}
            <AnimatePresence>
                {selectedProject && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
                        onClick={() => setSelectedProject(null)}
                    >
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="relative">
                                {/* Header image or type banner */}
                                {selectedProject.imageUrl ? (
                                    <img src={selectedProject.imageUrl} alt={selectedProject.title} className="w-full h-48 sm:h-56 object-cover" />
                                ) : (
                                    <div className="w-full h-32 sm:h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-6xl">
                                        {PROJECT_TYPES[selectedProject.projectType]?.icon || '🧠'}
                                    </div>
                                )}

                                <button
                                    onClick={() => setSelectedProject(null)}
                                    className="absolute top-4 right-4 w-9 h-9 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white font-black text-sm transition-colors"
                                >✕</button>
                            </div>

                            <div className="px-6 py-6 overflow-y-auto">
                                {/* Title */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-widest">
                                            {PROJECT_TYPES[selectedProject.projectType]?.label || 'Project'}
                                        </span>
                                        {selectedProject.semester && (
                                            <span className="text-[10px] font-bold text-gray-400">Sem {selectedProject.semester}</span>
                                        )}
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 leading-tight">{selectedProject.title}</h2>
                                </div>

                                {/* Description */}
                                {selectedProject.description && (
                                    <div className="prose prose-sm prose-gray max-w-none mb-6">
                                        <p className="text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{selectedProject.description}</p>
                                    </div>
                                )}

                                {/* Tags */}
                                {selectedProject.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {selectedProject.tags.map((t, i) => (
                                            <span key={i} className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg uppercase tracking-wider">{t}</span>
                                        ))}
                                    </div>
                                )}

                                {/* External link CTA */}
                                {selectedProject.externalLink && (
                                    <a
                                        href={selectedProject.externalLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#E31E24] text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                                    >
                                        🔗 Open Live Project View
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── PHOTO LIGHTBOX ── */}
            <AnimatePresence>
                {lightbox && profile.photoURL && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setLightbox(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative max-w-lg w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <img
                                src={profile.photoURL}
                                alt={profile.name}
                                className="w-full max-h-[75vh] object-cover rounded-3xl shadow-2xl"
                                decoding="async"
                            />
                            <div className="mt-5 text-center">
                                <p className="text-white font-black text-2xl tracking-tight">{profile.name}</p>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <span className="text-white/80 text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg">{displayCourseName}</span>
                                    {profile.currentSemester && (
                                        <span className="text-white/80 text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg">Sem {profile.currentSemester}</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setLightbox(false)}
                                className="absolute -top-4 -right-4 md:-right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-900 font-bold text-xl shadow-2xl hover:bg-gray-200 hover:rotate-90 transition-all cursor-pointer"
                            >
                                ✕
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function InfoPill({ icon, value }) {
    if (!value) return null;
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-xs font-semibold text-gray-600">
            <span>{icon}</span>
            {value}
        </span>
    );
}

function Section({ title, emoji, children, action }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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

function EmptyState({ message, emoji, action }) {
    return (
        <div className="text-center py-8 rounded-xl border border-dashed border-gray-200 bg-gray-50/40">
            <span className="text-2xl block mb-1">{emoji || '📭'}</span>
            <p className="text-sm text-gray-400 font-medium">{message}</p>
            {action}
        </div>
    );
}

function ProfileSkeleton() {
    return (
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 space-y-6 animate-pulse">
            <div className="h-6 w-32 bg-gray-200 rounded-xl mb-4" />
            <div className="h-40 bg-white border border-gray-100 rounded-2xl" />
            <div className="h-64 bg-white border border-gray-100 rounded-2xl" />
        </div>
    );
}

function NotFound({ onBack }) {
    return (
        <div className="max-w-md mx-auto px-4 pt-24 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🔒</div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Profile Not Found</h2>
            <p className="text-gray-500 text-sm mt-2 font-medium max-w-xs mx-auto">
                This profile is private, doesn't exist, or you don't have access.
            </p>
            <button onClick={onBack}
                className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl"
            >
                ← Back to Directory
            </button>
        </div>
    );
}
