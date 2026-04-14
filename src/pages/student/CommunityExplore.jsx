import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';

export default function CommunityExplore() {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All'); // All, Batch, Department

    useEffect(() => {
        if (user) fetchProjects();
    }, [user, filter]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            let q = collection(db, 'projects');
            // Simplified querying: Get all public/relevant and filter client-side for complex visibility rules
            // Ideally should use composite indexes, but avoiding complex deployment config for now
            const snap = await getDocs(query(q, orderBy('createdAt', 'desc')));

            const visibleProjects = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => {
                // Filter Logic
                if (filter === 'Batch' && p.batchId !== user.batchId) return false;
                if (filter === 'Department' && p.departmentId !== user.departmentId) return false;

                // Visibility Logic
                if (p.visibility === 'Public') return true;
                if (p.visibility === 'Department' && p.departmentId === user.departmentId) return true;
                if (p.visibility === 'Batch' && p.batchId === user.batchId) return true;
                if (p.studentId === user.uid) return true; // Own private projects

                return false;
            });

            setProjects(visibleProjects);
        } catch (error) {
            console.error("Fetch community projects error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase italic">Explore Community</h2>
                    <p className="text-sm text-gray-500 font-medium italic">Discover what other students are building</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl">
                    {['All', 'Department', 'Batch'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-biyani-red text-biyani-red"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {projects.map((project, index) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all group"
                        >
                            <div className="h-40 bg-gray-800 relative overflow-hidden">
                                {project.imageUrl ? (
                                    <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                        <span className="text-4xl text-white font-black opacity-20">{project.title[0]}</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <span className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-md text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                                        {project.studentName?.split(' ')[0]}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5">
                                <h3 className="text-lg font-black text-gray-900 mb-1 leading-tight line-clamp-1 group-hover:text-biyani-red transition-colors">{project.title}</h3>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
                                    {project.batchId} • {project.departmentId}
                                </p>

                                <p className="text-gray-500 text-xs line-clamp-2 mb-4 font-medium leading-relaxed">
                                    {project.description}
                                </p>

                                <div className="flex justify-between items-center mt-auto">
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {project.techStack?.slice(0, 3).map((tech, i) => (
                                            <div key={i} className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-600 uppercase" title={tech}>
                                                {tech[0]}
                                            </div>
                                        ))}
                                    </div>
                                    {project.link && (
                                        <a href={project.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-biyani-red transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {projects.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <h3 className="text-xl font-black text-gray-900 mb-2">It's quiet here...</h3>
                            <p className="text-gray-400 font-medium">Be the first to showcase your project to the community!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
