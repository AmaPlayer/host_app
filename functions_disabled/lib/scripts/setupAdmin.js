const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '../../../serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ ERROR: serviceAccountKey.json not found');
  console.error('Please place it in the root directory');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Admin configuration
const ADMIN_EMAIL = 'ymonu276.my@gmail.com';
const ADMIN_NAME = 'Admin User';

// Get UID from command line or prompt user
const cmdUID = process.argv[2];

if (cmdUID) {
  setupAdmin(cmdUID);
} else {
  promptForUID();
}

// ============================================================
// PROMPT FOR UID
// ============================================================

function promptForUID() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 ADMIN SETUP');
  console.log('='.repeat(60));
  console.log('\n⚠️  You need your Firebase User UID to continue.');
  console.log('\nHow to get your UID:');
  console.log('1. Go to Firebase Console (https://console.firebase.google.com)');
  console.log('2. Select project "amaplay007"');
  console.log('3. Go to Authentication (left menu)');
  console.log('4. Find your user email: ' + ADMIN_EMAIL);
  console.log('5. Click it and copy the UID\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('📝 Paste your Firebase UID here: ', (uid) => {
    rl.close();

    if (!uid || uid.trim().length === 0) {
      console.error('\n❌ UID cannot be empty');
      process.exit(1);
    }

    setupAdmin(uid.trim());
  });
}

// ============================================================
// SETUP ADMIN
// ============================================================

async function setupAdmin(adminUID) {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 Setting Up Admin Account');
    console.log('='.repeat(60) + '\n');

    console.log('📝 Admin Details:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Name: ${ADMIN_NAME}`);
    console.log(`   UID: ${adminUID}`);
    console.log(`   Role: super_admin`);
    console.log('');

    console.log('⏳ Creating admin account...\n');

    // Create admin document
    await db.collection('admins').doc(adminUID).set({
      userId: adminUID,
      displayName: ADMIN_NAME,
      email: ADMIN_EMAIL,
      photoURL: null,
      role: 'super_admin',
      permissions: [
        'read',
        'write',
        'delete',
        'approve',
        'manage_users',
        'manage_content',
        'manage_events',
        'view_reports',
        'manage_admins',
      ],
      active: true,
      createdAt: admin.firestore.Timestamp.now(),
      lastLoginAt: admin.firestore.Timestamp.now(),
    });

    console.log('✅ SUCCESS! Admin account created!\n');

    console.log('='.repeat(60));
    console.log('📊 Admin Account Details:');
    console.log('='.repeat(60));
    console.log(`✅ Email: ${ADMIN_EMAIL}`);
    console.log(`✅ Role: super_admin`);
    console.log(`✅ Permissions: All admin permissions granted`);
    console.log(`✅ Status: Active`);
    console.log('='.repeat(60) + '\n');

    console.log('🎉 You can now login to the admin dashboard with:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log('   Password: (your Firebase password)\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR: Failed to create admin account');
    console.error(`   ${error.message}\n`);

    if (error.code === 'auth/user-not-found') {
      console.error(
        '⚠️  This UID does not exist in Firebase Authentication'
      );
      console.error('   Please check your UID is correct\n');
    }

    process.exit(1);
  }
}
