/**
 * User Migration Script: Firebase Firestore → Supabase
 *
 * This script migrates all users and role-specific data from Firebase to Supabase
 *
 * What it does:
 * 1. Reads all users from Firestore (users collection)
 * 2. Reads role-specific data (athletes, coaches, parents, organizations)
 * 3. Transforms data to match Supabase schema
 * 4. Inserts into Supabase tables
 * 5. Logs progress and errors
 *
 * Usage: npm run migrate:users
 */

require('dotenv').config({ path: '../../.env' });
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

// Initialize Supabase with service role key (needed for inserts)
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY // Using service role for admin operations
);

// ============================================================================
// STATISTICS
// ============================================================================

const stats = {
  total: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  athletes: 0,
  coaches: 0,
  parents: 0,
  organizations: 0,
  errors: [],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform Firestore user data to Supabase format
 */
function transformUserData(firestoreUser, userId) {
  return {
    id: userId, // Use Firebase UID as primary key
    email: firestoreUser.email || null,
    display_name: firestoreUser.displayName || firestoreUser.name || null,
    photo_url: firestoreUser.photoURL || firestoreUser.profilePicture || null,
    bio: firestoreUser.bio || null,
    role: firestoreUser.role || 'athlete', // Default to athlete if not set
    location: firestoreUser.location || null,
    is_verified: firestoreUser.isVerified || false,
    profile_views: firestoreUser.profileViews || 0,
    created_at: firestoreUser.createdAt?.toDate?.() || new Date(),
    updated_at: firestoreUser.updatedAt?.toDate?.() || new Date(),
  };
}

/**
 * Transform athlete data
 */
function transformAthleteData(firestoreAthlete, userId) {
  return {
    user_id: userId,
    sports: firestoreAthlete.sports || firestoreAthlete.sport ? [firestoreAthlete.sport] : [],
    position: firestoreAthlete.position || null,
    player_type: firestoreAthlete.playerType || null,
    height: firestoreAthlete.height || null,
    weight: firestoreAthlete.weight || null,
    grad_year: firestoreAthlete.gradYear || firestoreAthlete.graduationYear || null,
    school: firestoreAthlete.school || null,
    gpa: firestoreAthlete.gpa || null,
    stats: firestoreAthlete.stats || {},
    achievements: firestoreAthlete.achievements || [],
    created_at: firestoreAthlete.createdAt?.toDate?.() || new Date(),
    updated_at: firestoreAthlete.updatedAt?.toDate?.() || new Date(),
  };
}

/**
 * Transform coach data
 */
function transformCoachData(firestoreCoach, userId) {
  return {
    user_id: userId,
    specializations: firestoreCoach.specializations || [],
    years_experience: firestoreCoach.yearsExperience || firestoreCoach.experience || null,
    certifications: firestoreCoach.certifications || [],
    coaching_philosophy: firestoreCoach.coachingPhilosophy || firestoreCoach.philosophy || null,
    team_affiliations: firestoreCoach.teamAffiliations || firestoreCoach.teams || [],
    created_at: firestoreCoach.createdAt?.toDate?.() || new Date(),
    updated_at: firestoreCoach.updatedAt?.toDate?.() || new Date(),
  };
}

/**
 * Transform parent data
 */
function transformParentData(firestoreParent, userId) {
  return {
    user_id: userId,
    child_name: firestoreParent.childName || null,
    child_age: firestoreParent.childAge || null,
    child_sports: firestoreParent.childSports || [],
    school_info: firestoreParent.schoolInfo || firestoreParent.school || null,
    aspirations: firestoreParent.aspirations || null,
    created_at: firestoreParent.createdAt?.toDate?.() || new Date(),
    updated_at: firestoreParent.updatedAt?.toDate?.() || new Date(),
  };
}

/**
 * Transform organization data
 */
function transformOrganizationData(firestoreOrg, userId) {
  return {
    user_id: userId,
    org_type: firestoreOrg.organizationType || firestoreOrg.type || null,
    location: firestoreOrg.location || null,
    sports: firestoreOrg.sports || [],
    facilities: firestoreOrg.facilities || [],
    member_count: firestoreOrg.memberCount || 0,
    website: firestoreOrg.website || null,
    created_at: firestoreOrg.createdAt?.toDate?.() || new Date(),
    updated_at: firestoreOrg.updatedAt?.toDate?.() || new Date(),
  };
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Migrate a single user and their role-specific data
 */
async function migrateUser(userId, userData) {
  try {
    // Step 1: Insert into users table
    const userRecord = transformUserData(userData, userId);

    const { error: userError } = await supabase
      .from('users')
      .upsert(userRecord, { onConflict: 'id' });

    if (userError) {
      throw new Error(`Failed to insert user: ${userError.message}`);
    }

    console.log(`  ✅ Migrated user: ${userRecord.display_name || userRecord.email} (${userRecord.role})`);

    // Step 2: Migrate role-specific data
    const role = userData.role || 'athlete';

    switch (role) {
      case 'athlete':
        await migrateAthleteData(userId, userData);
        stats.athletes++;
        break;

      case 'coach':
        await migrateCoachData(userId, userData);
        stats.coaches++;
        break;

      case 'parent':
        await migrateParentData(userId, userData);
        stats.parents++;
        break;

      case 'organization':
        await migrateOrganizationData(userId, userData);
        stats.organizations++;
        break;

      default:
        console.log(`  ⚠️  Unknown role: ${role}, skipping role-specific data`);
    }

    stats.success++;
    return true;

  } catch (error) {
    stats.failed++;
    stats.errors.push({
      userId,
      email: userData.email,
      error: error.message,
    });
    console.error(`  ❌ Failed to migrate user ${userId}: ${error.message}`);
    return false;
  }
}

/**
 * Migrate athlete-specific data
 */
async function migrateAthleteData(userId, userData) {
  // Check if we have athlete data in the user document or need to fetch from athletes collection
  let athleteData = userData;

  // Try to get from athletes collection if exists
  try {
    const athleteDoc = await db.collection('athletes').doc(userId).get();
    if (athleteDoc.exists) {
      athleteData = { ...userData, ...athleteDoc.data() };
    }
  } catch (err) {
    // Athletes collection might not exist, use user data
  }

  const athleteRecord = transformAthleteData(athleteData, userId);

  const { error } = await supabase
    .from('athletes')
    .upsert(athleteRecord, { onConflict: 'user_id' });

  if (error) {
    throw new Error(`Failed to insert athlete data: ${error.message}`);
  }
}

/**
 * Migrate coach-specific data
 */
async function migrateCoachData(userId, userData) {
  let coachData = userData;

  try {
    const coachDoc = await db.collection('coaches').doc(userId).get();
    if (coachDoc.exists) {
      coachData = { ...userData, ...coachDoc.data() };
    }
  } catch (err) {
    // Coaches collection might not exist
  }

  const coachRecord = transformCoachData(coachData, userId);

  const { error } = await supabase
    .from('coaches')
    .upsert(coachRecord, { onConflict: 'user_id' });

  if (error) {
    throw new Error(`Failed to insert coach data: ${error.message}`);
  }
}

/**
 * Migrate parent-specific data
 */
async function migrateParentData(userId, userData) {
  let parentData = userData;

  try {
    const parentDoc = await db.collection('parents').doc(userId).get();
    if (parentDoc.exists) {
      parentData = { ...userData, ...parentDoc.data() };
    }
  } catch (err) {
    // Parents collection might not exist
  }

  const parentRecord = transformParentData(parentData, userId);

  const { error } = await supabase
    .from('parents')
    .upsert(parentRecord, { onConflict: 'user_id' });

  if (error) {
    throw new Error(`Failed to insert parent data: ${error.message}`);
  }
}

/**
 * Migrate organization-specific data
 */
async function migrateOrganizationData(userId, userData) {
  let orgData = userData;

  try {
    const orgDoc = await db.collection('organizations').doc(userId).get();
    if (orgDoc.exists) {
      orgData = { ...userData, ...orgDoc.data() };
    }
  } catch (err) {
    // Organizations collection might not exist
  }

  const orgRecord = transformOrganizationData(orgData, userId);

  const { error } = await supabase
    .from('organizations')
    .upsert(orgRecord, { onConflict: 'user_id' });

  if (error) {
    throw new Error(`Failed to insert organization data: ${error.message}`);
  }
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function main() {
  console.log('\n🚀 Starting User Migration: Firestore → Supabase\n');
  console.log('================================================');
  console.log('This will migrate all users and role-specific data');
  console.log('================================================\n');

  try {
    // Step 1: Check connections
    console.log('📋 Checking connections...\n');

    // Test Supabase connection
    const { error: supabaseError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (supabaseError) {
      throw new Error(`Supabase connection failed: ${supabaseError.message}`);
    }

    console.log('✅ Supabase connection successful');

    // Test Firebase connection
    const testDoc = await db.collection('users').limit(1).get();
    console.log('✅ Firebase connection successful\n');

    // Step 2: Count users
    console.log('📊 Counting users in Firestore...\n');

    const usersSnapshot = await db.collection('users').get();
    stats.total = usersSnapshot.size;

    console.log(`📈 Found ${stats.total} users to migrate\n`);

    if (stats.total === 0) {
      console.log('⚠️  No users found in Firestore. Nothing to migrate.');
      return;
    }

    // Step 3: Migrate users
    console.log('🔄 Starting migration...\n');

    let processed = 0;

    for (const doc of usersSnapshot.docs) {
      processed++;
      const userId = doc.id;
      const userData = doc.data();

      console.log(`[${processed}/${stats.total}] Migrating user: ${userId}`);
      await migrateUser(userId, userData);
    }

    // Step 4: Report results
    console.log('\n================================================');
    console.log('✅ Migration Complete!');
    console.log('================================================\n');

    console.log('📊 Migration Statistics:');
    console.log(`   Total users: ${stats.total}`);
    console.log(`   ✅ Successful: ${stats.success}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   ⏭️  Skipped: ${stats.skipped}`);
    console.log('');
    console.log('📋 By Role:');
    console.log(`   🏃 Athletes: ${stats.athletes}`);
    console.log(`   🏋️  Coaches: ${stats.coaches}`);
    console.log(`   👨‍👩‍👧 Parents: ${stats.parents}`);
    console.log(`   🏢 Organizations: ${stats.organizations}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      stats.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. User ${err.userId} (${err.email}): ${err.error}`);
      });
    }

    console.log('\n🎉 User migration completed!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
main()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  });
