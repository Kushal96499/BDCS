import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function MyCouncil() {
    const { user } = useAuth();
    const [council, setCouncil] = useState({ president: null, members: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.batchId) fetchCouncil();
    }, [user]);

    const fetchCouncil = async () => {
        try {
            const q = query(
                collection(db, 'users'),
                where('batchId', '==', user.batchId),
                where('councilRole', 'in', ['president', 'member'])
            );
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCouncil({
                president: data.find(m => m.councilRole === 'president'),
                members: data.filter(m => m.councilRole === 'member')
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-biyani-red"></div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto pb-32 space-y-12">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <span className="text-4xl">👑</span>
                    <h1 className="text-4xl font-heading font-black text-gray-900 mt-2">Student Council</h1>
                    <p className="text-gray-500 font-medium">Leadership representing {user?.batchName || user?.batchId || 'your batch'}.</p>
                </div>
                {/* President-only: Propose Event CTA */}
                {user?.councilRole?.toLowerCase() === 'president' && (
                    <Link
                        to="/student/council/propose-event"
                        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-black rounded-2xl shadow-lg hover:bg-black hover:-translate-y-0.5 transition-all text-sm uppercase tracking-widest w-fit"
                    >
                        <span className="text-lg">✍️</span>
                        Propose Event
                    </Link>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. PRESIDENT CARD (Gold Accent) */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="lg:col-span-1"
                >
                    <div className="bg-white rounded-[3rem] p-8 border-2 border-amber-100 shadow-2xl shadow-amber-50 relative overflow-hidden h-full flex flex-col items-center text-center">
                        {/* Gold Glow */}
                        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-50 to-transparent opacity-50"></div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 blur-[60px] opacity-40"></div>

                        <div className="relative w-32 h-32 mb-6">
                            <div className="w-full h-full rounded-full border-4 border-amber-300 p-1">
                                <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center overflow-hidden">
                                    {council.president?.photoURL ? (
                                        <img src={council.president.photoURL} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-black text-amber-600">{council.president?.name?.[0] || '?'}</span>
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-2 inset-x-0 mx-auto w-fit bg-amber-400 text-amber-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                President
                            </div>
                        </div>

                        <h2 className="text-2xl font-heading font-black text-gray-900 mb-1">
                            {council.president?.name || 'Vacant'}
                        </h2>
                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-6">
                            {user?.courseName} Leader
                        </p>

                        <div className="mt-auto w-full bg-amber-50 p-4 rounded-2xl border border-amber-100">
                            <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-wide">
                                "Responsible for batch unity, event proposals, and academic coordination."
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* 2. MEMBERS GRID */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-heading font-bold text-gray-900 ml-2">Council Members</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {council.members.length > 0 ? council.members.map((member, i) => (
                            <motion.div
                                key={member.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-lg transition-all"
                            >
                                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-lg font-bold text-gray-400 overflow-hidden">
                                    {member.photoURL ? (
                                        <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                                    ) : (
                                        member.name[0]
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">{member.name}</h4>
                                    <span className="text-[10px] font-black text-biyani-red bg-red-50 px-2 py-0.5 rounded-md uppercase tracking-widest">
                                        Member
                                    </span>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="col-span-2 py-12 text-center border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 font-bold">
                                No additional members appointed yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
