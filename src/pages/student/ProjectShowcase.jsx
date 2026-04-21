// ============================================
// BDCS - Project Showcase (Simple & Clean Redesign)
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, limit, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { uploadFileToConvex } from '../../utils/storage';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumSelect from '../../components/common/PremiumSelect';

const PROJECT_TYPES = [
    { id: 'software', label: 'Software', icon: '💻' },
    { id: 'research', label: 'Research', icon: '🧪' },
    { id: 'pharmacy', label: 'Pharmacy', icon: '💊' },
    { id: 'case_study', label: 'Case Study', icon: '📊' },
    { id: 'creative', label: 'Creative', icon: '🎨' },
    { id: 'hardware', label: 'Hardware', icon: '🏗️' },
    { id: 'assignment', label: 'Assignment', icon: '📚' },
    { id: 'other', label: 'Other', icon: '🧠' }
];

export default function ProjectShowcase() {
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('feed'); 
    const [activeFilter, setActiveFilter] = useState('All');
    const [campusFilter, setCampusFilter] = useState('All');
    const [collegeFilter, setCollegeFilter] = useState('All');
    const [deptFilter, setDeptFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [feedProjects, setFeedProjects] = useState([]);
    const [myProjects, setMyProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);

    const generateUploadUrl = useMutation(api.files.generateUploadUrl);

    const [formData, setFormData] = useState({
        title: '',
        projectType: 'software',
        description: '',
        tags: '',
        externalLink: '',
        visibility: 'Public', 
        imageUrl: '',   
        imageId: '',    
        role: 'Solo',   
        semester: 1,
        teamMembers: ''
    });

    // Organizational Data State
    const [orgData, setOrgData] = useState({ 
        campuses: [], 
        colleges: [], 
        departments: [],
        ready: false 
    });

    useEffect(() => {
        if (!user) return;

        console.log("Setting up Project Explorer Listeners...");

        const unsubC = onSnapshot(collection(db, 'campuses'), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setOrgData(prev => ({ ...prev, campuses: list, ready: true }));
        });
        const unsubCl = onSnapshot(collection(db, 'colleges'), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setOrgData(prev => ({ ...prev, colleges: list }));
        });
        const unsubD = onSnapshot(collection(db, 'departments'), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setOrgData(prev => ({ ...prev, departments: list }));
        });

        return () => { unsubC(); unsubCl(); unsubD(); };
    }, [user]);

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
                const queries = [];
                queries.push(getDocs(query(collection(db, 'projects'), where('visibility', '==', 'Public'), orderBy('createdAt', 'desc'), limit(100))));

                if (user.batchId) {
                    queries.push(getDocs(query(collection(db, 'projects'), where('visibility', '==', 'Batch'), where('batchId', '==', user.batchId))));
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
            const { storageId, url } = await uploadFileToConvex(
                file,
                generateUploadUrl,
                async (id) => {
                    const res = await fetch(`${import.meta.env.VITE_CONVEX_SITE_URL}/getFileUrl?storageId=${encodeURIComponent(id)}`);
                    if (!res.ok) return null;
                    const data = await res.json();
                    return data.url ?? null;
                }
            );
            setFormData(prev => ({ ...prev, imageUrl: url, imageId: storageId }));
            toast.success('Image uploaded');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const resolveOrgNames = async (student) => {
        const names = { campusName: '', collegeName: '', departmentName: '' };
        try {
            if (student.departmentId) {
                const d = await getDoc(doc(db, 'departments', student.departmentId));
                if (d.exists()) names.departmentName = d.data().name;
            }
            if (student.collegeId) {
                const c = await getDoc(doc(db, 'colleges', student.collegeId));
                if (c.exists()) names.collegeName = c.data().name;
            }
            if (student.campusId) {
                const cp = await getDoc(doc(db, 'campuses', student.campusId));
                if (cp.exists()) names.campusName = cp.data().name;
            }
        } catch (e) {
            console.error("Resolution error:", e);
        }
        return names;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
            const payload = {
                title: formData.title,
                projectType: formData.projectType,
                description: formData.description,
                tags: tagsArray,
                externalLink: formData.externalLink,
                visibility: formData.visibility,
                imageUrl: formData.imageUrl,
                imageId: formData.imageId,
                role: formData.role,
                semester: formData.semester,
                teamMembers: formData.teamMembers,
            };

            if (editingId) {
                await updateDoc(doc(db, 'projects', editingId), { ...payload, updatedAt: serverTimestamp() });
                toast.success('Project updated');
            } else {
                const orgNames = await resolveOrgNames(user);
                await addDoc(collection(db, 'projects'), {
                    ...payload,
                    studentId: user.uid,
                    studentName: user.name,
                    batchId: user.batchId,
                    departmentId: user.departmentId,
                    departmentName: orgNames.departmentName || user.departmentName || '',
                    collegeId: user.collegeId || '',
                    collegeName: orgNames.collegeName || user.collegeName || '',
                    campusId: user.campusId || '',
                    campusName: orgNames.campusName || user.campusName || '',
                    createdAt: serverTimestamp()
                });
                toast.success('Project added');
            }

            setShowModal(false);
            setEditingId(null);
            resetForm();
            fetchProjects();
        } catch (error) {
            console.error('Submit error:', error);
            toast.error('Failed to save project');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '', projectType: 'software', description: '', tags: '',
            externalLink: '', visibility: 'Public', imageUrl: '', imageId: '',
            role: 'Solo', semester: user?.currentSemester || 1, teamMembers: ''
        });
    };

    const handleEdit = (project) => {
        setFormData({
            title: project.title, projectType: project.projectType, description: project.description,
            tags: project.tags?.join(', ') || '', externalLink: project.externalLink || '',
            visibility: project.visibility, imageUrl: project.imageUrl || '', imageId: project.imageId || '',
            role: project.role || 'Solo', semester: project.semester || 1, teamMembers: project.teamMembers || ''
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
    
    const campusOptions = useMemo(() => orgData.campuses, [orgData.campuses]);
    const collegeOptions = useMemo(() => {
        if (campusFilter === 'All') return orgData.colleges;
        const campus = orgData.campuses.find(c => (c.name || c.id) === campusFilter);
        return campus ? orgData.colleges.filter(c => c.campusId === campus.id) : [];
    }, [orgData.campuses, orgData.colleges, campusFilter]);
    
    const deptOptions = useMemo(() => {
        if (collegeFilter === 'All') {
            if (campusFilter === 'All') return orgData.departments;
            const campus = orgData.campuses.find(c => (c.name || c.id) === campusFilter);
            if (!campus) return [];
            const collegeIds = orgData.colleges.filter(c => c.campusId === campus.id).map(c => c.id);
            return orgData.departments.filter(d => collegeIds.includes(d.collegeId));
        }
        const college = orgData.colleges.find(c => (c.name || c.id) === collegeFilter);
        return college ? orgData.departments.filter(d => d.collegeId === college.id) : [];
    }, [orgData, campusFilter, collegeFilter]);

    const filteredProjects = useMemo(() => {
        const clean = (s) => (s || '').toString().trim().toLowerCase();
        
        // Resolve selected IDs for robust filtering using cleaned names
        const selectedCampus = orgData.campuses.find(c => clean(c.name || c.id) === clean(campusFilter));
        const selectedCollege = orgData.colleges.find(c => clean(c.name || c.id) === clean(collegeFilter));
        const selectedDept = orgData.departments.find(d => clean(d.name || d.id) === clean(deptFilter));

        return projectsToShow.filter(p => {
            const sLower = clean(searchQuery);
            const matchesSearch = !searchQuery || 
                clean(p.title).includes(sLower) || 
                clean(p.studentName).includes(sLower);

            const categoryVal = clean(activeFilter || 'All');
            const matchesCategory = categoryVal === 'all' || clean(p.projectType) === categoryVal;
            
            // Org data fallback: if project is missing org info, use student's profile info if it's their project
            const pCampusId = p.campusId || (p.studentId === user?.uid ? user?.campusId : null);
            const pCollegeId = p.collegeId || (p.studentId === user?.uid ? user?.collegeId : null);
            const pDeptId = p.departmentId || (p.studentId === user?.uid ? user?.departmentId : null);
            
            const pCampusName = p.campusName || (p.studentId === user?.uid ? user?.campusName : '');
            const pCollegeName = p.collegeName || (p.studentId === user?.uid ? user?.collegeName : '');
            const pDeptName = p.departmentName || (p.studentId === user?.uid ? user?.departmentName : '');

            // Ultra-robust check: compare IDs first, then use soft string matching
            const matchesCampus = campusFilter === 'All' || 
                (selectedCampus && pCampusId === selectedCampus.id) ||
                clean(pCampusName) === clean(campusFilter) ||
                clean(pCampusName).includes(clean(campusFilter));
                
            const matchesCollege = collegeFilter === 'All' || 
                (selectedCollege && pCollegeId === selectedCollege.id) ||
                clean(pCollegeName) === clean(collegeFilter) ||
                clean(pCollegeName).includes(clean(collegeFilter));
                
            const matchesDept = deptFilter === 'All' || 
                (selectedDept && pDeptId === selectedDept.id) ||
                clean(pDeptName) === clean(deptFilter) ||
                clean(pDeptName).includes(clean(deptFilter));
            
            return matchesSearch && matchesCategory && matchesCampus && matchesCollege && matchesDept;
        });
    }, [projectsToShow, searchQuery, activeFilter, campusFilter, collegeFilter, deptFilter, orgData]);

    const resetFilters = () => {
        setActiveFilter('All');
        setCampusFilter('All');
        setCollegeFilter('All');
        setDeptFilter('All');
        setSearchQuery('');
    };

    if (authLoading) return <div className="animate-pulse space-y-8"><div className="h-64 bg-slate-100 rounded-3xl" /></div>;

    return (
        <div className="text-slate-900 pb-32">
            
            {/* ── PREMIUM HEADER ────────────────────────────── */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/40 p-6 md:p-8 rounded-[2.5rem] backdrop-blur-3xl border border-white/60 shadow-xl shadow-slate-100/30">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                         <div className="px-2.5 py-1 bg-red-50/50 rounded-full border border-red-100/50 flex items-center gap-1.5 backdrop-blur-md">
                             <span className="w-1.5 h-1.5 bg-[#E31E24] rounded-full animate-pulse shadow-[0_0_8px_rgba(227,30,36,0.3)]" />
                             <p className="text-[8px] font-black text-[#E31E24] uppercase tracking-[0.2em]">Innovation Hub</p>
                         </div>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9]">
                        Projects<span className="text-[#E31E24]">.</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="hidden sm:block">
                        <StatBadge label="Global Repository" value={feedProjects.length} />
                    </div>
                    <button onClick={() => { setEditingId(null); resetForm(); setShowModal(true); }} className="flex-1 sm:flex-none px-8 py-4 bg-slate-950 text-white rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#E31E24] transition-all shadow-2xl shadow-slate-200 active:scale-95 group">
                         <span className="group-hover:rotate-90 transition-transform duration-500">🚀</span> Add Project
                    </button>
                </div>
            </header>

            {/* ── PREMIUM FILTERS & SEARCH ────────────────── */}
            <div className="relative z-30 mt-8">
                <div className="bg-white/60 border border-white/40 p-4 md:p-6 rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/30 backdrop-blur-3xl space-y-4 md:space-y-6">
                    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-stretch lg:items-center">
                        {/* Tab Switcher */}
                        <div className="flex p-1 bg-slate-200/30 rounded-xl md:rounded-2xl w-full lg:w-auto border border-white/50 backdrop-blur-md">
                             {['feed', 'my'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 lg:flex-none px-4 md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab ? 'bg-slate-950 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                                >
                                    {tab === 'feed' ? 'Feed' : 'My Projects'}
                                </button>
                            ))}
                        </div>

                        {/* Filter Grid - Forced grid to prevent overflow with long names */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 lg:flex-1 gap-3 md:gap-4">
                            <div className="flex-1 shadow-sm rounded-xl md:rounded-2xl overflow-visible">
                                <PremiumSelect 
                                    label="Category" 
                                    value={activeFilter} 
                                    options={[
                                        { value: 'All', label: 'All Categories' },
                                        ...PROJECT_TYPES.map(t => ({ value: t.id, label: t.label }))
                                    ]} 
                                    onChange={(e) => setActiveFilter(e.target.value)} 
                                />
                            </div>
                            <div className="flex-1 shadow-sm rounded-xl md:rounded-2xl overflow-visible">
                                <PremiumSelect 
                                    label="Campus" 
                                    value={campusFilter} 
                                    options={[
                                        { value: 'All', label: 'All Campuses' },
                                        ...campusOptions.map(c => ({ value: c.name || c.id, label: c.name || c.id }))
                                    ]} 
                                    onChange={e => { setCampusFilter(e.target.value); setCollegeFilter('All'); setDeptFilter('All'); }} 
                                />
                            </div>
                            <div className="flex-1 shadow-sm rounded-xl md:rounded-2xl overflow-visible">
                                <PremiumSelect 
                                    label="College" 
                                    value={collegeFilter} 
                                    options={[
                                        { value: 'All', label: 'All Colleges' },
                                        ...collegeOptions.map(c => ({ value: c.name || c.id, label: c.name || c.id }))
                                    ]} 
                                    onChange={e => { setCollegeFilter(e.target.value); setDeptFilter('All'); }} 
                                    disabled={campusFilter === 'All'}
                                />
                            </div>
                            <div className="flex-1 shadow-sm rounded-xl md:rounded-2xl overflow-visible">
                                <PremiumSelect 
                                    label="Department" 
                                    value={deptFilter} 
                                    options={[
                                        { value: 'All', label: 'All Departments' },
                                        ...deptOptions.map(d => ({ value: d.name || d.id, label: d.name || d.id }))
                                    ]} 
                                    onChange={e => setDeptFilter(e.target.value)} 
                                    disabled={collegeFilter === 'All'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Integrated Search Bar */}
                    <div className="relative group">
                        <input 
                            type="text" 
                            placeholder="Search projects or members..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white/50 border border-slate-100/50 rounded-xl md:rounded-2xl px-12 md:px-14 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-900 focus:ring-8 focus:ring-slate-50 focus:bg-white focus:border-[#E31E24]/30 outline-none transition-all shadow-inner"
                        />
                        <span className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 opacity-30 text-[10px] md:text-sm">🔍</span>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-full text-[10px] transition-all">✕</button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── CONTENT GRID ───────────────────────────────────── */}
            <main className="mt-10 md:mt-16">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-slate-50 h-[300px] rounded-3xl animate-pulse" />)}
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[2rem] border border-dashed border-slate-100">
                        <div className="text-6xl mb-6 opacity-20">🚀</div>
                        <h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight mb-2">No Projects Found</h3>
                        <button onClick={resetFilters} className="mt-6 px-8 py-3 bg-slate-950 text-white text-[10px] font-bold rounded-xl hover:bg-[#E31E24] transition-all uppercase tracking-widest">Reset Filters</button>
                    </div>
                ) : (
                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                        <AnimatePresence mode="popLayout">
                            {filteredProjects.map((p, i) => (
                                <SimpleProjectCard
                                    key={p.id}
                                    project={p}
                                    isOwner={user.uid === p.studentId}
                                    index={i}
                                    onView={() => setSelectedProject(p)}
                                    onEdit={() => handleEdit(p)}
                                    onDelete={() => handleDelete(p.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>

            <AnimatePresence>
                {selectedProject && (
                    <SimpleProjectModal
                        project={selectedProject}
                        isOwner={user.uid === selectedProject.studentId}
                        onClose={() => setSelectedProject(null)}
                        onEdit={() => { handleEdit(selectedProject); setSelectedProject(null); }}
                        onDelete={() => { handleDelete(selectedProject.id); setSelectedProject(null); }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showModal && (
                    <SimpleFormModal
                        editingId={editingId}
                        formData={formData}
                        setFormData={setFormData}
                        onClose={() => setShowModal(false)}
                        handleSubmit={handleSubmit}
                        uploading={uploading}
                        handleImageUpload={handleImageUpload}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─────────────────────────────────────────────
// SIMPLE SUB-COMPONENTS
// ─────────────────────────────────────────────

function StatBadge({ label, value, color = 'slate' }) {
    const colors = {
        slate: 'bg-slate-50 text-slate-500 border-slate-100',
        red: 'bg-red-50 text-[#E31E24] border-red-100',
    };
    return (
        <div className={`px-5 py-2.5 rounded-xl border flex items-center gap-3 ${colors[color] || colors.slate}`}>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{label}:</span>
            <span className="text-sm font-black tracking-tighter">{value}</span>
        </div>
    );
}

// Legacy sub-components removed for inlining logic

function SimpleSelectInput({ label, options, value, onChange }) {
    const mappedOptions = options.map(opt => ({ value: opt.id, label: opt.label }));
    return (
        <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</p>
            <PremiumSelect
                value={value}
                onChange={(e) => onChange(e.target.value)}
                options={mappedOptions}
            />
        </div>
    );
}

function SimpleInput({ label, value, onChange, type = "text", ...props }) {
    return (
        <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</p>
            <input 
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-xs font-bold text-slate-900 focus:ring-4 focus:ring-red-50 focus:bg-white focus:border-[#E31E24] outline-none transition-all placeholder:text-slate-300"
                {...props}
            />
        </div>
    );
}

function SimpleProjectCard({ project, isOwner, index, onView, onEdit, onDelete }) {
    const { user } = useAuth();
    const typeInfo = PROJECT_TYPES.find(t => t.id === project.projectType) || PROJECT_TYPES[0];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, type: 'spring', damping: 25, stiffness: 120 }}
            onClick={onView}
            className="group relative bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-2 transition-all duration-700 cursor-pointer overflow-hidden flex flex-col h-full active:scale-[0.98] isolate"
        >
            <div className="aspect-[16/11] relative overflow-hidden bg-slate-50">
                {project.imageUrl ? (
                    <img src={project.imageUrl} className="w-full h-full object-cover transition-transform duration-[3s] ease-out group-hover:scale-110" alt="Thumbnail" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200">
                        <span className="text-6xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700">{typeInfo.icon}</span>
                    </div>
                )}
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="absolute top-5 left-5 px-3.5 py-1.5 bg-white/90 backdrop-blur-md shadow-xl rounded-xl text-[8px] font-black text-slate-950 uppercase tracking-[0.2em] border border-white/50">
                   {typeInfo.label}
                </div>
                
                {isOwner && (
                    <div className="absolute top-5 right-5 flex gap-2 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                        <button onClick={e => { e.stopPropagation(); onEdit(); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-xl text-[10px] hover:bg-[#E31E24] hover:text-white transition-all">✏️</button>
                        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-xl text-[10px] hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    </div>
                )}
            </div>

            <div className="p-8 flex-1 flex flex-col">
                <div className="flex-1 space-y-3">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-[1] group-hover:text-[#E31E24] transition-colors line-clamp-2">
                        {project.title}
                    </h3>
                    <p className="text-slate-400 text-[11px] font-bold leading-relaxed line-clamp-3 opacity-90 uppercase tracking-tight">{project.description}</p>
                </div>

                <div className="pt-6 mt-8 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center text-xs text-white font-black shadow-lg shadow-slate-200">
                            {project.studentName?.[0]}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate w-32">{project.studentName}</p>
                            <p className="text-[9px] font-black text-[#E31E24] uppercase tracking-widest truncate w-32">
                                {(!project.departmentName || project.departmentName === 'General') ? (isOwner && user ? user.departmentName : 'Student') : project.departmentName}
                            </p>
                        </div>
                    </div>
                    
                    <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-[#E31E24] group-hover:text-white group-hover:border-[#E31E24] transition-all duration-501">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function SimpleProjectModal({ project, isOwner, onClose, onEdit, onDelete }) {
    const { user } = useAuth();
    const typeInfo = PROJECT_TYPES.find(t => t.id === project.projectType) || PROJECT_TYPES[0];

    const isMobile = window.innerWidth < 768;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-6 isolate">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl" />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: isMobile ? 100 : 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: isMobile ? 100 : 20 }}
                transition={{ type: 'spring', damping: 30, stiffness: 350, mass: 0.8 }}
                style={{ willChange: 'transform, opacity' }}
                className={`relative w-full max-w-5xl flex flex-col lg:flex-row bg-white overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)] isolate
                    ${isMobile ? 'h-full max-h-[100dvh] rounded-t-[2.5rem] rounded-b-none' : 'max-h-[90vh] rounded-[3rem] p-0'}
                `}
            >
                <div className="w-full lg:w-1/2 bg-slate-50 relative overflow-hidden flex items-center justify-center min-h-[300px]">
                    {project.imageUrl ? (
                        <img src={project.imageUrl} className="w-full h-full object-cover" alt="Detail" />
                    ) : (
                        <div className="text-[10rem] grayscale opacity-10">{typeInfo.icon}</div>
                    )}
                    <button onClick={onClose} className="absolute top-6 left-6 lg:hidden w-10 h-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center text-sm shadow-xl">✕</button>
                    <div className="absolute bottom-6 left-6 px-4 py-2 bg-slate-950 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl">
                        {typeInfo.label}
                    </div>
                </div>

                <div className="flex-1 p-8 lg:p-14 overflow-y-auto no-scrollbar flex flex-col bg-white">
                    <div className="flex items-center justify-between mb-8">
                         <div className="space-y-1.5">
                            <p className="text-[10px] font-black text-[#E31E24] uppercase tracking-[0.2em]">Semester {project.semester} • {project.role}</p>
                            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{project.title}</h3>
                         </div>
                         <button onClick={onClose} className="hidden lg:flex w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl items-center justify-center text-sm transition-all shadow-sm border border-slate-100">✕</button>
                    </div>

                    <div className="space-y-8 flex-1">
                        <p className="text-xs lg:text-sm font-bold text-slate-500 leading-relaxed whitespace-pre-wrap opacity-90">{project.description}</p>
                        
                        <div className="grid grid-cols-2 gap-6 border-t border-slate-50 pt-8">
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Student Name</p>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{project.studentName}</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Department</p>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                    {(!project.departmentName || project.departmentName === 'General') ? (isOwner && user ? user.departmentName : 'Department') : project.departmentName}
                                </p>
                             </div>
                        </div>
                    </div>

                    <div className="pt-10 flex flex-col sm:flex-row gap-3">
                         {project.externalLink && (
                             <a href={project.externalLink} target="_blank" rel="noreferrer" className="flex-1 py-4 rounded-xl bg-slate-950 text-white font-black uppercase tracking-widest text-[10px] text-center hover:bg-[#E31E24] transition-all shadow-lg active:scale-95">View Project</a>
                         )}
                         {isOwner && (
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={onEdit} className="flex-1 sm:flex-none px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:shadow-lg transition-all text-xs">✏️</button>
                                <button onClick={onDelete} className="flex-1 sm:flex-none px-6 py-4 bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-500 hover:text-white transition-all text-xs">🗑️</button>
                            </div>
                         )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function SimpleFormModal({ editingId, formData, setFormData, onClose, handleSubmit, uploading, handleImageUpload }) {
    const isMobile = window.innerWidth < 768;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-6 isolate">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: isMobile ? 100 : 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: isMobile ? 100 : 20 }}
                transition={{ type: 'spring', damping: 30, stiffness: 350, mass: 0.8 }}
                className={`relative w-full max-w-4xl bg-white overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.15)] flex flex-col
                    ${isMobile ? 'h-full max-h-[100dvh] rounded-t-[2.5rem] rounded-b-none' : 'max-h-[90vh] rounded-[3rem] p-0'}
                `}
            >
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30 backdrop-blur-xl">
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-[#E31E24] uppercase tracking-[0.2em]">Project Builder</p>
                        <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">
                            {editingId ? 'Edit Project' : 'Add Project'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-white hover:bg-slate-50 rounded-xl flex items-center justify-center text-sm transition-all shadow-sm border border-slate-100">✕</button>
                </div>

                <div className="p-8 md:p-10 overflow-y-auto no-scrollbar flex-1 bg-white">
                    <form id="projectFormSimple" onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <SimpleInput label="Project Title" value={formData.title} onChange={v => setFormData({...formData, title: v})} placeholder="Awesome Project Name" />
                                <div className="grid grid-cols-2 gap-4">
                                    <SimpleSelectInput label="Category" options={PROJECT_TYPES.map(t => ({id: t.id, label: t.label}))} value={formData.projectType} onChange={v => setFormData({...formData, projectType: v})} />
                                    <SimpleSelectInput label="Visibility" options={[{id: 'Public', label: 'Public'}, {id: 'Batch', label: 'My Batch'}]} value={formData.visibility} onChange={v => setFormData({...formData, visibility: v})} />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</p>
                                    <textarea required rows="5" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 focus:ring-4 focus:ring-red-50 focus:bg-white focus:border-[#E31E24] outline-none resize-none transition-all placeholder:text-slate-300" placeholder="Tell us about your project..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <SimpleSelectInput label="Role" options={[{id: 'Solo', label: 'Solo'}, {id: 'Team', label: 'Team'}]} value={formData.role} onChange={v => setFormData({...formData, role: v})} />
                                    <SimpleInput label="Semester" type="number" min="1" max="8" value={formData.semester} onChange={v => setFormData({...formData, semester: parseInt(v)})} />
                                </div>
                                <SimpleInput label="External Link" placeholder="https://github.com/..." type="url" value={formData.externalLink} onChange={v => setFormData({...formData, externalLink: v})} />
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Image</p>
                                    <div className="relative overflow-hidden rounded-2xl bg-slate-50 border-2 border-dashed border-slate-100 hover:border-[#E31E24]/30 transition-all cursor-pointer aspect-[16/9] flex items-center justify-center group/upload">
                                        <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                        {formData.imageUrl ? (
                                            <>
                                                <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/upload:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Change Image</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center space-y-2">
                                                <div className="text-3xl grayscale opacity-20">🖼️</div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tap to Upload</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-8 border-t border-slate-50 bg-slate-50/20 backdrop-blur-xl flex items-center gap-4">
                    <button type="button" onClick={onClose} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                    <button type="submit" form="projectFormSimple" disabled={uploading} className="flex-1 bg-slate-950 hover:bg-[#E31E24] text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl active:scale-95 disabled:opacity-50">
                        {uploading ? 'Uploading...' : (editingId ? 'Update Project' : 'Add Project')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
