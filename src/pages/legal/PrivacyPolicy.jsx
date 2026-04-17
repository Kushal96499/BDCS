import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-red-600 to-red-800 px-8 py-10 text-white">
                    <h1 className="text-3xl font-black tracking-tight mb-2">Institutional Privacy Policy</h1>
                    <p className="text-red-100 text-sm font-medium uppercase tracking-[0.2em] opacity-80">Effective Date: April 17, 2026</p>
                </div>

                <div className="p-10 space-y-8 text-gray-600 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight uppercase border-l-4 border-red-600 pl-4">1. Information We Collect</h2>
                        <p className="mb-4">
                            Biyani Digital Campus System (BDCS) collects personal information necessary for academic administration, including:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Identity Data: Name, date of birth, gender, and student/staff ID.</li>
                            <li>Contact Data: Email address, phone number, and residential address.</li>
                            <li>Academic Data: Enrollment details, attendance records, exam results, and discipline records.</li>
                            <li>Technical Data: Login dates, device information, and interaction logs with the platform.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight uppercase border-l-4 border-red-600 pl-4">2. Purpose of Data Usage</h2>
                        <p>
                            We use your data strictly for institutional purposes:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-4">
                            <li>To monitor academic progress and attendance.</li>
                            <li>To facilitate communication between administration, teachers, and students.</li>
                            <li>To generate mandated reports for educational boards and regulatory bodies.</li>
                            <li>To ensure the security and integrity of the digital campus framework.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight uppercase border-l-4 border-red-600 pl-4">3. Data Sharing and Disclosure</h2>
                        <p>
                            BDCS does not sell or lease your personal information to third parties. Data is only shared with authorized institutional partners or regulatory authorities as required by law for academic accreditation and verification.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight uppercase border-l-4 border-red-600 pl-4">4. Your Rights</h2>
                        <p>
                            Students and staff have the right to access their personal records, request corrections to inaccurate data, and view their academic history. Some data points are mandated by the institution and cannot be removed while you are an active member of the campus.
                        </p>
                    </section>

                    <section className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <p className="text-xs text-gray-400 italic">For privacy-related inquiries, please contact the Institutional Placement & Administration Cell.</p>
                        <Button variant="outline" onClick={() => navigate('/')} className="px-8 border-gray-200">Return to Portal</Button>
                    </section>
                </div>
            </div>
        </div>
    );
}
