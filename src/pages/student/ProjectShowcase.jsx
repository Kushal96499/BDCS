import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { uploadFileToConvex } from '../../utils/storage';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const PROJECT_TYPES = [
    { id: 'software', label: 'Software', icon: '💻' },
    { id: 'research', label: 'Research', icon: '🧪' },
    { id: 'pharmacy', label: 'Pharmacy', icon: '💊' },
    { id: 'case_study', label: 'Cast Study', icon: '📊' },
    { id: 'creative', label: 'Creative', icon: '🎨' },
    { id: 'hardware', label: 'Hardware', icon: '🏗️' },
    { id: 'assignment', label: 'Assignment', icon: '📚' },
    { id: 'other', label: 'Other', icon: '🧠' }
];

export default function ProjectShowcase() {
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'my'
    const [activeFilter, setActiveFilter] = useState('All');
    const [campusFilter, setCampusFilter] = useState('All');
    const [collegeFilter, setCollegeFilter] = useState('All');
    const [deptFilter, setDeptFilter] = useState('All');
    
    const [feedProjects, setFeedProjects] = useState([]);
    const [myProjects, setMyProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null); // For detail view

    // Convex storage hooks
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        projectType: 'software',
        description: '',
        tags: '',
        externalLink: '',
        visibility: 'Public', // Public, Department, Batch, Private
        imageUrl: '',   // Convex serving URL (for display)
        imageId: '',    // Convex storageId (persisted to Firestore)
        role: 'Solo',   // Solo | Team
        semester: user?.currentSemester || 1,
        teamMembers: ''
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({ ...prev, semester: user.currentSemester || 1 }));
            fetchProjects();
        }
    }, [user, activeTab]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            if (activeTab === 'my') {
                const q = query(
                    collection(db, 'projects'),
                    where('studentId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                const snap = await getDocs(q);
                setMyProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
                // Community Feed Logic (Public + Batch + Dept)
                const queries = [];
                queries.push(getDocs(query(collection(db, 'projects'), where('visibility', '==', 'Public'), orderBy('createdAt', 'desc'), limit(50))));

                if (user.batchId) {
                    queries.push(getDocs(query(collection(db, 'projects'), where('visibility', '==', 'Batch'), where('batchId', '==', user.batchId), limit(50))));
                }
                if (user.departmentId) {
                    queries.push(getDocs(query(collection(db, 'projects'), where('visibility', '==', 'Department'), where('departmentId', '==', user.departmentId), limit(50))));
                }

                const snapshots = await Promise.all(queries);
                const allDocs = [];
                const seenIds = new Set();
                snapshots.forEach(snap => {
                    snap.docs.forEach(d => {
                        if (!seenIds.has(d.id)) {
                            seenIds.add(d.id);
                            allDocs.push({ id: d.id, ...d.data() });
                        }
                    });
                });

                // Client-side sort
                allDocs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setFeedProjects(allDocs);
            }
        } catch (error) {
            console.error("Fetch projects error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            // 1. Get upload URL from Convex
            // 2. POST file, receive storageId
            // 3. Resolve permanent serving URL
            const { storageId, url } = await uploadFileToConvex(
                file,
                generateUploadUrl,
                async (id) => {
                    // Inline resolver: call Convex HTTP API to get the URL
                    const res = await fetch(
                        `${import.meta.env.VITE_CONVEX_SITE_URL}/getFileUrl?storageId=${encodeURIComponent(id)}`
                    );
                    if (!res.ok) return null;
                    const data = await res.json();
                    return data.url ?? null;
                }
            );
            setFormData(prev => ({ ...prev, imageUrl: url, imageId: storageId }));
            toast.success('Cover image uploaded! ✨');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload image. Please try a different image or format.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
            // Build Firestore payload — always strip raw formData shape
            const payload = {
                title: formData.title,
                projectType: formData.projectType,
                description: formData.description,
                tags: tagsArray,
                externalLink: formData.externalLink,
                visibility: formData.visibility,
                imageUrl: formData.imageUrl,   // Convex serving URL
                imageId: formData.imageId,     // Convex storageId
                role: formData.role,
                semester: formData.semester,
                teamMembers: formData.teamMembers,
            };

            if (editingId) {
                await updateDoc(doc(db, 'projects', editingId), {
                    ...payload,
                    updatedAt: serverTimestamp()
                });
                toast.success('Project updated! ✨');
            } else {
                await addDoc(collection(db, 'projects'), {
                    ...payload,
                    studentId: user.uid,
                    studentName: user.name,
                    batchId: user.batchId,
                    departmentId: user.departmentId,
                    departmentName: user.departmentName || '',
                    collegeId: user.collegeId || '',
                    collegeName: user.collegeName || '',
                    campusId: user.campusId || '',
                    campusName: user.campusName || '',
                    createdAt: serverTimestamp()
                });
                toast.success('Project published 🚀');
            }

            setShowModal(false);
            setEditingId(null);
            setFormData({
                title: '',
                projectType: 'software',
                description: '',
                tags: '',
                externalLink: '',
                visibility: 'Public',
                imageUrl: '',
                imageId: '',
                role: 'Solo',
                semester: user?.currentSemester || 1,
                teamMembers: ''
            });
            fetchProjects();
        } catch (error) {
            console.error('Submit project error:', error);
            toast.error('Failed to save project');
        }
    };

    const handleEdit = (project) => {
        setFormData({
            title: project.title,
            projectType: project.projectType,
            description: project.description,
            tags: project.tags?.join(', ') || '',
            externalLink: project.externalLink || '',
            visibility: project.visibility,
            imageUrl: project.imageUrl || '',
            imageId: project.imageId || '',
            role: project.role || 'Solo',
            semester: project.semester || 1,
            teamMembers: project.teamMembers || ''
        });
        setEditingId(project.id);
        setShowModal(true);
    };

    const handleDelete = async (projectId) => {
        if (!window.confirm("Delete this project?")) return;
        try {
            await deleteDoc(doc(db, 'projects', projectId));
            toast.success("Project deleted");
            fetchProjects();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete");
        }
    };

    const projectsToShow = activeTab === 'my' ? myProjects : feedProjects;
    
    // Multi-level filtering logic for Innovation Hub
    const filteredProjects = projectsToShow.filter(p => {
        const matchesCategory = activeFilter === 'All' || p.projectType === activeFilter.toLowerCase();
        const matchesCampus = campusFilter === 'All' || p.campusName === campusFilter;
        const matchesCollege = collegeFilter === 'All' || p.collegeName === collegeFilter;
        const matchesDept = deptFilter === 'All' || p.departmentName === deptFilter;
        
        return matchesCategory && matchesCampus && matchesCollege && matchesDept;
    });

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const cardVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

    if (authLoading) return (
        <div className="flex h-[60vh] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E31E24]"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FDFDFD] pb-32 font-sans overflow-x-hidden pt-0 md:pt-1">
            <header className="bg-white/95 backdrop-blur-3xl border-b border-gray-100 py-1.5 md:py-8 z-30 px-3 md:px-6 relative shadow-sm md:shadow-none">
                <div className="max-w-7xl mx-auto flex flex-col gap-2 md:gap-4">
                    <div className="flex flex-row items-center justify-between gap-2">
                        {/* Desktop Only Branding */}
                        <div className="space-y-0.5 hidden md:block">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Innovation Hub</h1>
                            <p className="text-gray-400 text-sm font-black uppercase tracking-widest italic opacity-70">Biyani Campus Network 🚀</p>
                        </div>

                        {/* Mobile Header: Just the tab switcher */}
                        <div className="flex items-center justify-between w-full md:w-auto gap-3">
                            <div className="p-0.5 bg-gray-50 border border-gray-100 rounded-full flex flex-1 md:flex-none">
                                {['feed', 'my'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 md:flex-none px-4 md:px-6 py-1.5 md:py-2.5 rounded-full text-[9px] md:text-xs font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeTab === tab
                                            ? 'bg-white shadow-md text-[#E31E24] scale-[1.02]'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        {tab === 'feed' ? 'Explore' : 'Mine'}
                                    </button>
                                ))}
                            </div>

                            {/* Desktop Create Button */}
                            <button
                                onClick={() => { setEditingId(null); setShowModal(true); }}
                                className="hidden md:flex bg-[#E31E24] hover:bg-black text-white px-6 py-3 rounded-[1.25rem] font-black text-xs shadow-xl shadow-red-100 transition-all items-center gap-2 shrink-0 active:scale-95"
                            >
                                <span className="text-lg leading-none">+</span>
                                <span className="uppercase tracking-widest">Create Project</span>
                            </button>
                        </div>
                    </div>

                    {/* Advanced Institutional Filters - Responsive Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                        {/* Innovation Category */}
                        <div className="relative">
                            <select
                                value={activeFilter}
                                onChange={(e) => setActiveFilter(e.target.value)}
                                className="appearance-none w-full bg-white border border-gray-100 text-gray-700 py-3 pl-4 pr-10 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-[#E31E24]/20 shadow-sm cursor-pointer hover:border-gray-200 transition-colors"
                            >
                                <option value="All">✨ All Innovations</option>
                                {PROJECT_TYPES.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.icon} {t.label}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                            </div>
                        </div>

                        {/* Campus Filter */}
                        <div className="relative">
                            <select
                                value={campusFilter}
                                onChange={(e) => setCampusFilter(e.target.value)}
                                className="appearance-none w-full bg-white border border-gray-100 text-gray-700 py-3 pl-4 pr-10 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-[#E31E24]/20 shadow-sm cursor-pointer hover:border-gray-200 transition-colors"
                            >
                                <option value="All">📍 All Campus</option>
                                {[...new Set(projectsToShow.map(p => p.campusName).filter(Boolean))].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                            </div>
                        </div>

                        {/* College Filter */}
                        <div className="relative">
                            <select
                                value={collegeFilter}
                                onChange={(e) => setCollegeFilter(e.target.value)}
                                className="appearance-none w-full bg-white border border-gray-100 text-gray-700 py-3 pl-4 pr-10 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-[#E31E24]/20 shadow-sm cursor-pointer hover:border-gray-200 transition-colors"
                            >
                                <option value="All">🏛️ All Colleges</option>
                                {[...new Set(projectsToShow.filter(p => campusFilter === 'All' || p.campusName === campusFilter).map(p => p.collegeName).filter(Boolean))].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                            </div>
                        </div>

                        {/* Department Filter */}
                        <div className="relative">
                            <select
                                value={deptFilter}
                                onChange={(e) => setDeptFilter(e.target.value)}
                                className="appearance-none w-full bg-white border border-gray-100 text-gray-700 py-3 pl-4 pr-10 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-[#E31E24]/20 shadow-sm cursor-pointer hover:border-gray-200 transition-colors"
                            >
                                <option value="All">🏢 All Depts</option>
                                {[...new Set(projectsToShow.filter(p => collegeFilter === 'All' || p.collegeName === collegeFilter).map(p => p.departmentName).filter(Boolean))].map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white h-64 sm:h-80 rounded-2xl animate-pulse border border-gray-100"></div>
                        ))}
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">{activeTab === 'my' ? '📰' : '🔭'}</div>
                        <p className="font-black text-gray-700 text-xl">{activeTab === 'my' ? 'No projects yet' : 'Nothing found'}</p>
                        <p className="text-sm text-gray-400 mt-2">{activeTab === 'my' ? 'Create your first project above!' : 'Try a different filter.'}</p>
                    </div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                    >
                        {filteredProjects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                isOwner={user.uid === project.studentId}
                                onView={() => setSelectedProject(project)}
                                onEdit={() => handleEdit(project)}
                                onDelete={() => handleDelete(project.id)}
                            />
                        ))}
                    </motion.div>
                )}
            </main>

            {/* MODAL (Keeping existing structure but cleaner UI) */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl"
                            onClick={() => setShowModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-[1.5rem] md:rounded-[2rem] w-full max-w-2xl max-h-[90vh] md:max-h-[85vh] shadow-2xl relative z-50 flex flex-col overflow-hidden"
                        >
                            <div className="px-5 py-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight">
                                    {editingId ? 'Edit Project' : 'New Project'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors">✕</button>
                            </div>

                            <div className="p-5 md:p-6 overflow-y-auto no-scrollbar">
                                {/* ... FORM CONTENT (Keeping Logic, Styling simplified) ... */}
                                <form id="projectForm" onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Title</label>
                                            <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 focus:ring-2 focus:ring-biyani-red/20 outline-none" placeholder="Project Name" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                                                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium" value={formData.projectType} onChange={e => setFormData({ ...formData, projectType: e.target.value })}>
                                                    {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Visibility</label>
                                                <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-200">
                                                    {['Public', 'Batch'].map(v => (
                                                        <button type="button" key={v} onClick={() => setFormData({ ...formData, visibility: v })} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${formData.visibility === v ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}>{v}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                            <textarea required rows="4" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-700 focus:ring-2 focus:ring-biyani-red/20 outline-none" placeholder="Describe your project..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Tags (comma separated)</label>
                                            <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium" placeholder="React, AI, Design..." value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">External Link</label>
                                            <input type="url" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-blue-600" placeholder="https://..." value={formData.externalLink} onChange={e => setFormData({ ...formData, externalLink: e.target.value })} />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Cover Image</label>
                                            <input type="file" onChange={handleImageUpload} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                                            {formData.imageUrl && <div className="mt-2 h-32 rounded-xl overflow-hidden bg-gray-100 border border-gray-200"><img src={formData.imageUrl} className="w-full h-full object-cover" /></div>}
                                        </div>

                                    </div>
                                </form>
                            </div>

                            <div className="p-5 md:p-6 border-t border-gray-100 bg-gray-50/50">
                                <button type="submit" form="projectForm" disabled={uploading} className="w-full bg-[#E31E24] hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all disabled:opacity-50 shadow-xl shadow-red-100">
                                    {uploading ? 'Processing...' : 'Publish Project 🚀'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Project Detail Modal */}
            <AnimatePresence>
                {selectedProject && (
                    <ProjectDetailModal
                        project={selectedProject}
                        isOwner={user.uid === selectedProject.studentId}
                        onClose={() => setSelectedProject(null)}
                        onEdit={() => { handleEdit(selectedProject); setSelectedProject(null); }}
                        onDelete={() => { handleDelete(selectedProject.id); setSelectedProject(null); }}
                    />
                )}
            </AnimatePresence>

            {/* Mobile Floating Action Button (FAB) */}
            <button
                onClick={() => { setEditingId(null); setShowModal(true); }}
                className="md:hidden fixed bottom-24 right-5 z-40 bg-[#E31E24] text-white w-14 h-14 rounded-2xl shadow-[0_8px_32px_rgba(227,30,36,0.3)] flex items-center justify-center text-3xl active:scale-90 transition-all active:rotate-45"
            >
                +
            </button>
        </div>
    );
}

// --- Project Card Component ---
function ProjectCard({ project, isOwner, onView, onEdit, onDelete }) {
    const typeInfo = PROJECT_TYPES.find(t => t.id === project.projectType) || PROJECT_TYPES[0];

    return (
        <motion.div
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col h-full cursor-pointer"
            onClick={onView}
        >
            {/* Thumbnail */}
            <div className="aspect-[16/10] md:aspect-[2/1] bg-gray-50 relative overflow-hidden">
                {project.imageUrl ? (
                    <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl opacity-5 filter grayscale brightness-50">
                        {typeInfo.icon}
                    </div>
                )}

                {/* Badges - refined glassmorphism */}
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 shadow-xl">
                    <span className="bg-black/60 backdrop-blur-xl px-2.5 py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white border border-white/10">
                        {project.projectType}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest border backdrop-blur-xl
                        ${project.visibility === 'Public' ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/20' : 'bg-amber-500/20 text-amber-100 border-amber-500/20'}`}>
                        {project.visibility}
                    </span>
                </div>

                {isOwner && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <button onClick={e => { e.stopPropagation(); onEdit(); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-lg hover:bg-gray-50 text-xs transition-colors">✏️</button>
                        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-lg hover:bg-red-50 text-red-500 text-xs transition-colors">🗑️</button>
                    </div>
                )}
            </div>

            <div className="p-4 md:p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1.5 md:mb-2 gap-2">
                    <h3 className="text-sm md:text-base font-black text-gray-900 leading-tight group-hover:text-[#E31E24] transition-colors flex-1 pr-1 uppercase tracking-tight">
                        {project.title}
                    </h3>
                </div>

                <p className="text-gray-500 text-[11px] md:text-sm line-clamp-2 mb-3 md:mb-4 leading-relaxed font-medium">
                    {project.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4 md:mb-6">
                    {project.tags?.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="mt-auto flex items-center justify-between pt-3 md:pt-4 border-t border-gray-50">
                    <div className="flex flex-col gap-1.5 overflow-hidden">
                        <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-lg bg-[#E31E24]/5 flex items-center justify-center text-[9px] font-black text-[#E31E24] shrink-0">
                                {project.studentName?.[0]}
                            </div>
                            <span className="text-[9px] md:text-[10px] font-black text-gray-900 uppercase tracking-tight truncate">{project.studentName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 truncate">
                                🏛️ {project.collegeName || 'Institutional'}
                            </span>
                            <span className="text-[7px] md:text-[8px] font-bold text-[#E31E24]/60 uppercase tracking-widest truncate">
                                Sem {project.semester}
                            </span>
                        </div>
                    </div>
                    {project.externalLink && (
                        <a href={project.externalLink} target="_blank" rel="noreferrer" className="text-biyani-red hover:bg-red-50 p-2 rounded-full transition-colors shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// --- Project Detail Modal ---
function ProjectDetailModal({ project, isOwner, onClose, onEdit, onDelete }) {
    const typeInfo = PROJECT_TYPES.find(t => t.id === project.projectType) || PROJECT_TYPES[0];

    // Stop body scroll while modal is open
    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl"
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 24 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative z-10 bg-white rounded-[1.5rem] md:rounded-[2.5rem] w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Hero Image or Gradient Banner */}
                <div className="relative h-48 md:h-64 shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                    {project.imageUrl ? (
                        <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover opacity-90" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-7xl opacity-30">
                            {typeInfo.icon}
                        </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Type pill on image */}
                    <span className="absolute top-4 left-5 bg-black/40 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white">
                        {typeInfo.icon} {typeInfo.label || project.projectType}
                    </span>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-5 w-9 h-9 flex items-center justify-center rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all"
                    >
                        ✕
                    </button>

                    {/* Title on image */}
                    <div className="absolute bottom-5 left-5 right-5">
                        <h2 className="text-white text-xl md:text-2xl font-black leading-tight drop-shadow-2xl uppercase tracking-tight">
                            {project.title}
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="w-6 h-6 rounded-lg bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center text-[10px] font-black text-white">
                                {project.studentName?.[0] || '?'}
                            </div>
                            <span className="text-white/90 text-[11px] font-black uppercase tracking-wider">{project.studentName}</span>
                            <span className="text-white/40 text-xs">/</span>
                            <span className="text-white/70 text-[11px] font-bold uppercase tracking-widest">Sem {project.semester}</span>
                        </div>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto p-5 md:p-8 flex-1 space-y-5 md:space-y-6 no-scrollbar">

                    {/* Meta badges row */}
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-gray-50 text-gray-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-gray-100 italic">
                            👥 {project.role || 'Solo'}
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-gray-50 text-gray-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-gray-100 italic">
                            🔎 {project.visibility || 'Public'}
                        </span>
                        {project.campusName && (
                            <span className="px-3 py-1.5 rounded-xl bg-red-50 text-[#E31E24] text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-red-100 italic">
                                📍 {project.campusName}
                            </span>
                        )}
                        {project.departmentName && (
                            <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-blue-100 italic">
                                🏢 {project.departmentName}
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <p className="text-[9px] md:text-[10px] font-black text-[#E31E24] uppercase tracking-[0.2em] italic opacity-60">About Project</p>
                        <p className="text-gray-700 text-xs md:text-sm leading-relaxed font-bold whitespace-pre-wrap">
                            {project.description || 'No description provided.'}
                        </p>
                    </div>

                    {/* Tags */}
                    {project.tags?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tags</p>
                            <div className="flex flex-wrap gap-2">
                                {project.tags.map((tag, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200 uppercase tracking-wide">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Team Members */}
                    {project.teamMembers && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Team Members</p>
                            <p className="text-gray-700 text-sm font-medium">{project.teamMembers}</p>
                        </div>
                    )}

                    {/* External Link */}
                    {project.externalLink && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Live / Repository</p>
                            <a
                                href={project.externalLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold hover:bg-blue-100 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View Project →
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-gray-100 shrink-0">
                    {isOwner ? (
                        <div className="flex gap-3">
                            <button
                                onClick={onEdit}
                                className="flex-1 py-3.5 rounded-2xl border-2 border-gray-100 font-black text-xs uppercase tracking-widest text-gray-700 hover:border-gray-900 hover:bg-gray-50 transition-all active:scale-95"
                            >
                                ✏️ Edit
                            </button>
                            <button
                                onClick={onDelete}
                                className="flex-1 py-3.5 rounded-2xl bg-red-50 border-2 border-red-50 font-black text-xs uppercase tracking-widest text-red-600 hover:bg-red-100 transition-all active:scale-95"
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-xl bg-gray-100 font-bold text-sm text-gray-700 hover:bg-gray-200 transition-all"
                        >
                            Close
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
