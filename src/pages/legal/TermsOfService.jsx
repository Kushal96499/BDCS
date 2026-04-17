import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';

export default function TermsOfService() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-gray-800 to-black px-8 py-10 text-white">
                    <h1 className="text-3xl font-black tracking-tight mb-2">Terms of Institutional Service</h1>
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-[0.2em] opacity-80">Last Updated: April 17, 2026</p>
                </div>

                <div className="p-10 space-y-8 text-gray-600 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight uppercase border-l-4 border-black pl-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using the Biyani Digital Campus System (BDCS), you agree to comply with and be bound by these Terms of Service. This platform is provided strictly for academic and administrative purposes related to the Biyani Group of Colleges.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight uppercase border-l-4 border-black pl-4">2. Authorized Use</h2>
                        <p>
                            Access to BDCS is granted only to currently enrolled students, active faculty members, and authorized administrative staff. Any attempt to access the system without valid institutional credentials or through the use of another user's account is strictly prohibited and subject to disciplinary action.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight uppercase border-l-4 border-black pl-4">3. User Responsibilities</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                            <li>You must not use the system to upload malicious software, engage in phishing, or harass other institution members.</li>
                            <li>Teachers and administrators must ensure the accuracy of data entered regarding attendance, results, and student profiles.</li>
                            <li>Students are expected to use the platform for their personal academic growth and institutional communication.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight uppercase border-l-4 border-black pl-4">4. Intellectual Property</h2>
                        <p>
                            All content, logic, and infrastructure of the BDCS platform are the property of Biyani Group of Colleges. Academic materials uploaded by faculty remain the property of the respective copyright holders but are licensed for use within the campus framework.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight uppercase border-l-4 border-black pl-4">5. Account Termination</h2>
                        <p>
                            The institution reserves the right to suspend or terminate access to the system for students or staff who violate campus policies, exit the institution, or compromise the platform's security.
                        </p>
                    </section>

                    <section className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <p className="text-xs text-gray-400 italic">Failure to comply with these terms may lead to legal or disciplinary consequences under institutional bylaws.</p>
                        <Button variant="secondary" onClick={() => navigate('/')} className="px-8 py-3.5">Acknowledge & Return</Button>
                    </section>
                </div>
            </div>
        </div>
    );
}
