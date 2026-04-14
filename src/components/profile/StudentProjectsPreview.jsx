import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function StudentProjectsPreview({ userId }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (userId) fetchProjects();
    }, [userId]);

    const fetchProjects = async () => {
        try {
            const q = query(
                collection(db, 'projects'),
                where('studentId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(3)
            );
            const snap = await getDocs(q);
            setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-900 uppercase italic flex items-center gap-2">
                    🛠️ Projects Showcase
                </h3>
                <button
                    onClick={() => navigate('/student/projects')}
                    className="text-[10px] font-black text-biyani-red uppercase tracking-widest hover:underline"
                >
                    View All
                </button>
            </div>

            {loading ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {[1, 2].map(i => <div key={i} className="min-w-[200px] h-32 bg-gray-50 animate-pulse rounded-2xl"></div>)}
                </div>
            ) : projects.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                    <p className="text-sm font-bold text-gray-400">No projects pinned yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map(project => (
                        <motion.div
                            key={project.id}
                            whileHover={{ y: -3 }}
                            className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-between"
                        >
                            <div>
                                <h4 className="font-bold text-gray-900 line-clamp-1">{project.title}</h4>
                                <p className="text-[10px] text-gray-400 font-medium line-clamp-2 mt-1">{project.description}</p>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-1">
                                {project.tags?.slice(0, 2).map((tag, i) => (
                                    <span key={i} className="text-[8px] font-black bg-white px-2 py-0.5 rounded-md uppercase tracking-wider text-gray-500 border border-gray-100">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
