// ============================================
// BDCS - Database Migration Script
// Adds professional profile fields to existing users
// RUN ONCE to migrate existing database
// ============================================

import { db } from '../config/firebase.js';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

/**
 * Migration: Add Professional Profile Fields to Existing Users
 */
export async function migrateUsersProfessionalProfile() {
    console.log('🚀 Starting Professional Profile Migration...\n');

    const batch = writeBatch(db);
    const usersSnapshot = await getDocs(collection(db, 'users'));

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;

        try {
            // Check if user already has professional profile
            if (userData.professionalProfile) {
                console.log(`⏭️  Skipping ${userData.name || userId} - Already migrated`);
                skippedCount++;
                continue;
            }

            // Prepare professional profile structure
            const professionalProfile = {
                skills: [],
                experience: [],
                certifications: [],
                awards: [],
                publications: []
            };

            // Initialize social stats
            const socialStats = {
                skillsCount: 0,
                experienceCount: 0,
                certificationsCount: 0,
                awardsCount: 0,
                projectsCount: 0,
                publicationsCount: 0
            };

            // Initialize lifecycle state
            const lifecycleState = userData.lifecycleState || 'active';
            const relievedAt = userData.relievedAt || null;
            const relievedBy = userData.relievedBy || null;
            const alumniVerified = userData.alumniVerified || false;

            // Prepare update data
            const updateData = {
                professionalProfile,
                socialStats,
                lifecycleState,
                relievedAt,
                relievedBy,
                alumniVerified,
                updatedAt: new Date()
            };

            // Use batch update for performance
            const userRef = doc(db, 'users', userId);
            batch.update(userRef, updateData);

            console.log(`✅ Queued ${userData.name || userId} for migration`);
            migratedCount++;

            // Commit batch every 500 documents (Firestore limit)
            if (migratedCount % 500 === 0) {
                await batch.commit();
                console.log(`\n📦 Committed batch of 500 updates\n`);
            }

        } catch (error) {
            console.error(`❌ Error migrating ${userData.name || userId}:`, error.message);
            errorCount++;
        }
    }

    // Commit remaining documents
    if (migratedCount % 500 !== 0) {
        await batch.commit();
        console.log(`\n📦 Committed final batch\n`);
    }

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Successfully Migrated: ${migratedCount}`);
    console.log(`⏭️  Skipped (Already Migrated): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📁 Total Users Processed: ${usersSnapshot.docs.length}`);
    console.log('═══════════════════════════════════════════\n');

    return {
        success: errorCount === 0,
        migrated: migratedCount,
        skipped: skippedCount,
        errors: errorCount
    };
}

/**
 * Migration: Initialize Teacher Multi-Department Support
 */
export async function migrateTeachersMultiDepartment() {
    console.log('🚀 Starting Teacher Multi-Department Migration...\n');

    const usersSnapshot = await getDocs(collection(db, 'users'));

    let migratedCount = 0;
    let skippedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Only migrate teachers
        if (userData.role !== 'teacher' && !userData.roles?.includes('teacher')) {
            continue;
        }

        try {
            // Check if already migrated
            if (Array.isArray(userData.teacherDepartments)) {
                skippedCount++;
                continue;
            }

            const updateData = {};

            // Convert single department to array
            if (userData.departmentId && !Array.isArray(userData.teacherDepartments)) {
                updateData.teacherDepartments = [userData.departmentId];
            } else {
                updateData.teacherDepartments = [];
            }

            // Convert single subject to array
            if (userData.subjectId && !Array.isArray(userData.teacherSubjects)) {
                updateData.teacherSubjects = [userData.subjectId];
            } else {
                updateData.teacherSubjects = [];
            }

            updateData.updatedAt = new Date();

            await updateDoc(doc(db, 'users', userId), updateData);

            console.log(`✅ Migrated teacher: ${userData.name || userId}`);
            migratedCount++;

        } catch (error) {
            console.error(`❌ Error migrating teacher ${userData.name || userId}:`, error.message);
        }
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(`✅ Teachers Migrated: ${migratedCount}`);
    console.log(`⏭️  Teachers Skipped: ${skippedCount}`);
    console.log('═══════════════════════════════════════════\n');

    return { migrated: migratedCount, skipped: skippedCount };
}

/**
 * Rollback: Remove professional profile fields (DANGER!)
 */
export async function rollbackProfessionalProfile() {
    const confirmation = prompt(
        'WARNING: This will DELETE all professional profile data. Type "ROLLBACK" to confirm:'
    );

    if (confirmation !== 'ROLLBACK') {
        console.log('❌ Rollback cancelled');
        return;
    }

    console.log('🔄 Starting Rollback...\n');

    const batch = writeBatch(db);
    const usersSnapshot = await getDocs(collection(db, 'users'));

    let rollbackCount = 0;

    for (const userDoc of usersSnapshot.docs) {
        const userRef = doc(db, 'users', userDoc.id);

        // Remove fields using Firestore deleteField
        batch.update(userRef, {
            professionalProfile: null,
            socialStats: null
        });

        rollbackCount++;

        if (rollbackCount % 500 === 0) {
            await batch.commit();
            console.log(`📦 Rolled back batch of 500 users`);
        }
    }

    if (rollbackCount % 500 !== 0) {
        await batch.commit();
    }

    console.log(`\n✅ Rollback Complete: ${rollbackCount} users`);
    return { rollbackCount };
}

// ============================================
// CLI Runner (Node.js)
// ============================================
/**
 * Run from command line:
 * node src/migrations/professionalProfileMigration.js
 */
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('professionalProfileMigration')) {
    (async () => {
        try {
            console.log('\n╔═══════════════════════════════════════════╗');
            console.log('║   BDCS Database Migration Tool            ║');
            console.log('╚═══════════════════════════════════════════╝\n');

            const args = process.argv.slice(2);
            const command = args[0];

            switch (command) {
                case 'migrate-profiles':
                    await migrateUsersProfessionalProfile();
                    break;
                case 'migrate-teachers':
                    await migrateTeachersMultiDepartment();
                    break;
                case 'migrate-all':
                    await migrateUsersProfessionalProfile();
                    await migrateTeachersMultiDepartment();
                    break;
                case 'rollback':
                    await rollbackProfessionalProfile();
                    break;
                default:
                    console.log('Available commands:');
                    console.log('  - migrate-profiles  : Add professional profile fields');
                    console.log('  - migrate-teachers  : Add multi-department support');
                    console.log('  - migrate-all       : Run all migrations');
                    console.log('  - rollback          : Remove professional profile (DANGER!)');
                    console.log('\nUsage: node src/migrations/professionalProfileMigration.js <command>');
            }

            process.exit(0);
        } catch (error) {
            console.error('💥 Migration Error:', error);
            process.exit(1);
        }
    })();
}
