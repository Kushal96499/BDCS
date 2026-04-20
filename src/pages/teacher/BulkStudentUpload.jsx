// ============================================
// BDCS - Bulk Student Upload Component
// Upload multiple students via CSV/Excel
// ============================================

import React, { useState, useEffect } from 'react';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'; // Auth primitives
import { initializeApp, deleteApp } from 'firebase/app'; // App primitive
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase'; // Config
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { logCreate } from '../../utils/auditLogger';

export default function BulkStudentUpload({ onComplete }) {
    const { user: currentUser } = useAuth();
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState(null);

    // Batch Selection Logic
    const [batches, setBatches] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [loadingBatches, setLoadingBatches] = useState(true);

    useEffect(() => {
        const fetchBatches = async () => {
            if (!currentUser?.uid) return;
            try {
                // Fetch batches where user is Class Teacher
                const q = query(collection(db, 'batches'), where('classTeacherId', '==', currentUser.uid), where('status', '==', 'active'));
                const snap = await getDocs(q);
                const batchList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setBatches(batchList);
            } catch (error) {
                console.error("Error fetching batches:", error);
                toast.error("Failed to load your batches");
            } finally {
                setLoadingBatches(false);
            }
        };
        fetchBatches();
    }, [currentUser]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseCSV(selectedFile);
        }
    };

    const parseCSV = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                toast.error('CSV file appears to be empty');
                return;
            }

            // Parse header - Clean and normalize
            // Expected: Sr.No, FULL NAME, FATHER NAME, MOTHER NAME, EMAIL, MOBILE NUMBER(UNIQUE), LAST EXAM ROLLNO
            const headers = lines[0].split(',').map(h => h.trim().toUpperCase());

            // Map headers to internal keys
            const headerMap = {
                'FULL NAME': 'name',
                'FATHER NAME': 'fatherName',
                'MOTHER NAME': 'motherName',
                'EMAIL': 'email',
                'MOBILE NUMBER(UNIQUE)': 'phone',
                'LAST EXAM ROLLNO': 'enrollmentNumber',
                'SR.NO': 'srNo'
            };

            // Parse data rows
            const data = lines.slice(1).map((line, index) => {
                // Split by comma, handling potential quotes if needed (basic split for now)
                const values = line.split(',').map(v => v.trim());
                const row = {};

                headers.forEach((header, i) => {
                    const key = headerMap[header];
                    if (key && key !== 'srNo') {
                        row[key] = values[i] || '';
                    }
                });

                row._rowIndex = index + 2;
                return row;
            });

            setPreview(data);
        };
        reader.readAsText(file);
    };

    const validateRow = (row) => {
        const errors = [];
        if (!row.name) errors.push('Name is required');
        if (!row.email) errors.push('Email is required');
        if (!row.enrollmentNumber) errors.push('Last Exam Rollno (Enrollment) is required');

        // Basic email validation
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
            errors.push('Invalid email format');
        }

        return { valid: errors.length === 0, errors };
    };

    const handleUpload = async () => {
        if (preview.length === 0) {
            toast.error('No data to upload');
            return;
        }

        if (!selectedBatchId) {
            toast.error('Please select a target batch');
            return;
        }

        const targetBatch = batches.find(b => b.id === selectedBatchId);
        if (!targetBatch) {
            toast.error("Invalid batch selected");
            return;
        }

        setProcessing(true);
        const successList = [];
        const errorList = [];

        // Initialize Secondary App for User Creation
        let secondaryApp = null;
        let secondaryAuth = null;

        try {
            // 1. Fetch current students to determine next Roll Number
            const studentsQ = query(collection(db, 'users'), where('batchId', '==', targetBatch.id), where('role', '==', 'student'));
            const studentsSnap = await getDocs(studentsQ);
            const existingStudents = studentsSnap.docs.map(d => d.data());
            
            // Determine Serial Start & Robust Prefix Extraction
            let lastSerial = 0;
            
            // Extract Prefix: BCA 2023-26 -> BCA23
            let batchBase = targetBatch.name.split(' ')[0] || 'STU';
            let yearMatch = targetBatch.name.match(/\d{4}/);
            let yearShort = yearMatch ? yearMatch[0].substring(2) : '';
            let rollPrefix = targetBatch.rollPrefix || `${batchBase}${yearShort}`;
            
            existingStudents.forEach(s => {
                const r = s.rollNumber || '';
                const match = r.match(/\d+$/);
                if (match) {
                    const num = parseInt(match[0]);
                    if (num > lastSerial) lastSerial = num;
                    
                    // If we find a student with a prefix in this batch, adopt it
                    const currentPrefix = r.substring(0, r.length - match[0].length);
                    if (currentPrefix && !targetBatch.rollPrefix) {
                        rollPrefix = currentPrefix;
                    }
                }
            });

            secondaryApp = initializeApp(auth.app.options, `bulk-upload-${Date.now()}`);
            secondaryAuth = getAuth(secondaryApp);

            let currentSerial = lastSerial;

            for (const row of preview) {
                const validation = validateRow(row);
                if (!validation.valid) {
                    errorList.push({
                        row: row._rowIndex,
                        name: row.name || 'Unknown',
                        errors: validation.errors
                    });
                    continue;
                }

                try {
                    // Password = Last Exam Roll No
                    let password = row.enrollmentNumber.toString().trim();
                    if (password.length < 6) password = password.padStart(6, '0');

                    // Generate Sequence Roll Number
                    currentSerial++;
                    const generatedRollNumber = `${rollPrefix}${currentSerial.toString().padStart(3, '0')}`;

                    // Create Firebase Auth account using SECONDARY Auth
                    const userCredential = await createUserWithEmailAndPassword(
                        secondaryAuth,
                        row.email,
                        password
                    );

                    // Create Firestore document with Enriched Metadata
                    const studentData = {
                        name: row.name,
                        email: row.email,
                        phone: row.phone || '',
                        role: 'student',
                        primaryRole: 'student',
                        roles: ['student'],
                        currentActiveRole: 'student',

                        // Identification
                        fatherName: row.fatherName || '',
                        motherName: row.motherName || '',
                        enrollmentNumber: row.enrollmentNumber, 
                        rollNumber: generatedRollNumber, // AUTOMATED

                        status: 'active',
                        batchId: targetBatch.id,
                        batchName: targetBatch.name || targetBatch.courseName || '',
                        
                        // Critical Context Inheritance
                        campusId: targetBatch.campusId || currentUser.campusId || '',
                        campusName: targetBatch.campusName || currentUser.campusName || '',
                        collegeId: targetBatch.collegeId || currentUser.collegeId || '',
                        collegeName: targetBatch.collegeName || currentUser.collegeName || '',
                        departmentId: targetBatch.departmentId || currentUser.departmentId || '',
                        departmentName: targetBatch.departmentName || currentUser.departmentName || '',
                        
                        courseId: targetBatch.courseId || '',
                        courseIds: targetBatch.courseIds || (targetBatch.courseId ? [targetBatch.courseId] : []),
                        currentSemester: targetBatch.currentSemester || targetBatch.semester || 1,

                        createdBy: currentUser.uid,
                        createdByName: currentUser.name,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        mustResetPassword: true,

                        lockedProfile: {
                            enrollmentNumber: row.enrollmentNumber,
                            rollNumber: generatedRollNumber,
                            joiningDate: serverTimestamp(),
                            createdBy: currentUser.uid,
                            originalRole: 'student'
                        },

                        editableProfile: {
                            photoURL: null,
                            personalEmail: null,
                            phone: row.phone || null,
                            address: {},
                            bio: '',
                            skills: [],
                            documents: []
                        }
                    };

                    await setDoc(doc(db, 'users', userCredential.user.uid), studentData);

                    // Log creation
                    await logCreate('users', userCredential.user.uid, studentData, currentUser, {
                        label: studentData.name
                    });

                    successList.push({
                        name: row.name,
                        email: row.email,
                        password: password,
                        rollNumber: generatedRollNumber
                    });

                } catch (error) {
                    console.error('Error creating student:', row.name, error);
                    let errorMsg = error.message;
                    if (error.code === 'auth/email-already-in-use') errorMsg = "Email already exists";
                    errorList.push({ row: row._rowIndex, name: row.name || 'Unknown', errors: [errorMsg] });
                }
            }
        } catch (err) {
            console.error("Critical Bulk Upload Error", err);
            toast.error("Process failed: " + err.message);
        }

        // Cleanup Secondary App
        try {
            await signOut(secondaryAuth);
            await deleteApp(secondaryApp);
        } catch (cleanupErr) {
            console.error("Error cleanup secondary app", cleanupErr);
        }

        setResults({ success: successList, errors: errorList });
        setProcessing(false);

        if (successList.length > 0) {
            toast.success(`Successfully created ${successList.length} student account(s)`);
        }
        if (errorList.length > 0) {
            toast.error(`Failed to create ${errorList.length} student account(s)`);
        }
    };

    const downloadTemplate = () => {
        // Updated Pattern: Sr.No, FULL NAME, FATHER NAME, MOTHER NAME, EMAIL, MOBILE NUMBER(UNIQUE), LAST EXAM ROLLNO
        const csvContent = 'Sr.No,FULL NAME,FATHER NAME,MOTHER NAME,EMAIL,MOBILE NUMBER(UNIQUE),LAST EXAM ROLLNO\n1,ROHIT KUMAR SHARMA,SANTOSH KUMAR SHARMA,SAPNA SHARMA,rohit@example.com,9876543210,11634843';
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'student_upload_template.csv';
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const downloadResults = () => {
        if (!results) return;

        let csvContent = 'Name,Email,Password,Status\n';
        results.success.forEach(student => {
            csvContent += `${student.name},${student.email},${student.password},Success\n`;
        });
        results.errors.forEach(error => {
            csvContent += `${error.name},,,Failed: ${error.errors.join('; ')}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'bulk_upload_results.csv';
        link.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Bulk Student Upload</h2>

                {/* Instructions */}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">Instructions</h3>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                        <li>Download the CSV template below</li>
                        <li>Fill in student details exactly as per format</li>
                        <li><strong>LAST EXAM ROLLNO</strong> will be used as the temporary password</li>
                        <li>Upload the completed CSV file</li>
                    </ul>
                </div>

                {/* Download Template */}
                <div className="mb-6">
                    <button
                        onClick={downloadTemplate}
                        className="px-4 py-2 text-sm font-medium text-biyani-red border border-biyani-red rounded-lg hover:bg-red-50 transition-colors"
                    >
                        📥 Download CSV Template (Updated Format)
                    </button>
                </div>

                {/* Batch Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Target Batch
                    </label>
                    {loadingBatches ? (
                        <div className="text-sm text-gray-500">Loading your batches...</div>
                    ) : (
                        <select
                            value={selectedBatchId}
                            onChange={(e) => setSelectedBatchId(e.target.value)}
                            className="block w-full p-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-biyani-red focus:border-biyani-red"
                        >
                            <option value="">-- Select Batch to Upload Students To --</option>
                            {batches.map(batch => (
                                <option key={batch.id} value={batch.id}>
                                    {batch.name} (Sem {batch.currentSemester})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* File Upload */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload CSV File
                    </label>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        disabled={!selectedBatchId}
                        className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>

                {/* Preview Table */}
                {preview.length > 0 && !results && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            Preview ({preview.length} students)
                        </h3>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Father Name</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parent Email</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Roll No/Pass</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {preview.map((row, idx) => {
                                        const validation = validateRow(row);
                                        return (
                                            <tr key={idx} className={!validation.valid ? 'bg-red-50' : ''}>
                                                <td className="px-4 py-2 text-sm text-gray-900">{row._rowIndex}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{row.name}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{row.fatherName}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{row.email}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{row.enrollmentNumber}</td>
                                                <td className="px-4 py-2 text-sm">
                                                    {validation.valid ? (
                                                        <span className="text-green-600">✓ Valid</span>
                                                    ) : (
                                                        <span className="text-red-600" title={validation.errors.join(', ')}>
                                                            ✗ Invalid
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleUpload}
                                disabled={processing}
                                className="px-6 py-2 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Uploading...' : `Upload ${preview.length} Students`}
                            </button>
                        </div>
                    </div>
                )}

                {/* Results */}
                {results && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Upload Results</h3>
                            <button
                                onClick={downloadResults}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                📥 Download Results & Passwords
                            </button>
                        </div>

                        {results.success.length > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-green-800 mb-2">
                                    ✓ Successfully Created ({results.success.length})
                                </h4>
                                <div className="text-xs text-green-700 max-h-40 overflow-y-auto">
                                    {results.success.map((student, idx) => (
                                        <div key={idx} className="py-1">
                                            {student.name} ({student.email})
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-red-800 mb-2">
                                    ✗ Failed ({results.errors.length})
                                </h4>
                                <div className="text-xs text-red-700 max-h-40 overflow-y-auto">
                                    {results.errors.map((error, idx) => (
                                        <div key={idx} className="py-1">
                                            Row {error.row}: {error.name} - {error.errors.join(', ')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setResults(null);
                                    setPreview([]);
                                    setFile(null);
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Upload Another Batch
                            </button>
                            {onComplete && (
                                <button
                                    onClick={onComplete}
                                    className="px-4 py-2 text-sm font-medium text-white bg-biyani-red rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
