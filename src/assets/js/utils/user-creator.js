// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// User Creation Factory
// Common functions for creating users
// ============================================

/**
 * Generate random password
 * @param {number} length - Password length
 * @returns {string} Random password
 */
function generatePassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '@#$%';

    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';

    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Create user in Firebase Authentication and Firestore
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user info
 */
async function createUserAccount(userData) {
    const { email, password, role, name, campus_id, department_id, additionalData } = userData;

    try {
        // Step 1: Create user in Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log(`✅ Auth user created: ${user.uid}`);

        // Step 2: Create user document in Firestore
        await collections.users.doc(user.uid).set({
            email: email,
            role: role,
            name: name,
            campus_id: campus_id,
            department_id: department_id,
            status: 'active',
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            created_by: auth.currentUser.uid
        });

        console.log(`✅ User document created in Firestore`);

        // Step 3: Create role-specific document
        let roleDocRef;

        if (role === ROLES.ADMIN) {
            roleDocRef = await collections.admins.add({
                user_id: user.uid,
                permissions: additionalData.permissions || ['all'],
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else if (role === ROLES.HOD) {
            roleDocRef = await collections.hods.add({
                user_id: user.uid,
                campus_id: campus_id,
                department_id: department_id,
                department_name: additionalData.department_name || '',
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: auth.currentUser.uid
            });
        } else if (role === ROLES.TEACHER) {
            roleDocRef = await collections.teachers.add({
                user_id: user.uid,
                campus_id: campus_id,
                department_id: department_id,
                department_name: additionalData.department_name || '',
                specialization: additionalData.specialization || '',
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: auth.currentUser.uid
            });
        } else if (role === ROLES.STUDENT) {
            roleDocRef = await collections.students.add({
                user_id: user.uid,
                campus_id: campus_id,
                department_id: department_id,
                department_name: additionalData.department_name || '',
                enrollment_number: additionalData.enrollment_number || '',
                batch: additionalData.batch || '',
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: auth.currentUser.uid
            });
        }

        console.log(`✅ ${role} document created`);

        // Step 4: Sign out the newly created user (important!)
        await auth.signOut();

        // Step 5: Re-authenticate as the admin/creator
        // This will be handled automatically by Firebase

        return {
            success: true,
            userId: user.uid,
            email: email,
            password: password, // Return for display to admin
            role: role
        };

    } catch (error) {
        console.error('❌ Error creating user:', error);
        throw error;
    }
}

/**
 * Get departments for a campus
 * @param {string} campusId - Campus ID
 * @returns {Promise<Array>} List of departments
 */
async function getDepartmentsByCampus(campusId) {
    try {
        const snapshot = await collections.departments
            .where('campus_id', '==', campusId)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching departments:', error);
        return [];
    }
}

/**
 * Generate enrollment number
 * Format: YY-DEPT-NNNN (e.g., 26-CSE-0001)
 * @param {string} departmentCode - Department code
 * @returns {Promise<string>} Enrollment number
 */
async function generateEnrollmentNumber(departmentCode) {
    const year = new Date().getFullYear().toString().slice(-2);

    // Get count of students in this department this year
    const snapshot = await collections.students
        .where('enrollment_number', '>=', `${year}-${departmentCode}-0000`)
        .where('enrollment_number', '<=', `${year}-${departmentCode}-9999`)
        .get();

    const count = snapshot.size + 1;
    const serialNumber = count.toString().padStart(4, '0');

    return `${year}-${departmentCode}-${serialNumber}`;
}

// Export functions
if (typeof window !== 'undefined') {
    window.generatePassword = generatePassword;
    window.createUserAccount = createUserAccount;
    window.getDepartmentsByCampus = getDepartmentsByCampus;
    window.generateEnrollmentNumber = generateEnrollmentNumber;
}
