/**
 * Verify Login Flow Data - Check if athlete onboarding data is correctly saved
 * Usage: node functions/lib/scripts/verifyLoginFlowData.js <userId>
 *
 * This script checks:
 * 1. User document exists with correct structure
 * 2. Role is set to 'athlete'
 * 3. Sport/position/subcategory data properly denormalized
 * 4. No account duplication for this user
 * 5. All required fields present
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '../../../serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ ERROR: serviceAccountKey.json not found');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 LOGIN FLOW DATA VERIFICATION');
  console.log('='.repeat(70));
  console.log('\nUsage: node verifyLoginFlowData.js <userId>');
  console.log('\nExample: node verifyLoginFlowData.js xyz123abc456');
  console.log('\nThis script verifies:');
  console.log('  ✓ User document exists with proper structure');
  console.log('  ✓ Role is set correctly');
  console.log('  ✓ Sport/position/subcategory data present');
  console.log('  ✓ All denormalized fields present');
  console.log('  ✓ No account duplication');
  console.log('  ✓ All required fields populated\n');
  process.exit(0);
}

async function verifyLoginFlowData() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 VERIFYING LOGIN FLOW DATA');
  console.log('='.repeat(70));
  console.log(`\nUser ID: ${userId}\n`);

  try {
    // 1. Get user document
    console.log('📋 Step 1: Fetching user document...');
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists()) {
      console.error('❌ User document NOT FOUND in Firestore');
      process.exit(1);
    }

    const userData = userDoc.data();
    console.log('✅ User document found\n');

    // 2. Check for account duplication
    console.log('🔍 Step 2: Checking for account duplication...');
    const email = userData.email;
    if (!email) {
      console.warn('⚠️  User document has no email field');
    } else {
      const duplicateUsers = await db.collection('users')
        .where('email', '==', email)
        .get();

      if (duplicateUsers.size > 1) {
        console.error(`❌ DUPLICATION DETECTED: ${duplicateUsers.size} accounts with email ${email}`);
        duplicateUsers.forEach(doc => {
          console.log(`   - ${doc.id}: ${doc.data().displayName || '(no name)'}`);
        });
      } else {
        console.log(`✅ No duplication: Only 1 account with email ${email}\n`);
      }
    }

    // 3. Verify role field
    console.log('🎯 Step 3: Verifying role field...');
    if (!userData.role) {
      console.error('❌ Role field MISSING');
    } else if (userData.role === 'athlete') {
      console.log(`✅ Role: ${userData.role}\n`);
    } else {
      console.warn(`⚠️  Role is '${userData.role}' (not athlete)\n`);
    }

    // 4. Verify sport data
    console.log('🏆 Step 4: Verifying sport data...');
    const sportIssues = [];

    if (!userData.sports) {
      sportIssues.push('  ❌ sports array MISSING');
    } else if (!Array.isArray(userData.sports)) {
      sportIssues.push(`  ❌ sports is not an array (type: ${typeof userData.sports})`);
    } else if (userData.sports.length === 0) {
      console.warn('  ⚠️  sports array is empty');
    } else {
      console.log(`  ✅ sports: [${userData.sports.join(', ')}]`);
    }

    if (!userData.sportDetails) {
      sportIssues.push('  ❌ sportDetails array MISSING');
    } else if (!Array.isArray(userData.sportDetails)) {
      sportIssues.push(`  ❌ sportDetails is not an array`);
    } else if (userData.sportDetails.length === 0) {
      console.warn('  ⚠️  sportDetails array is empty');
    } else {
      console.log(`  ✅ sportDetails:`);
      userData.sportDetails.forEach(sport => {
        console.log(`     - ${sport.name} (id: ${sport.id})`);
      });
    }

    if (sportIssues.length > 0) {
      sportIssues.forEach(issue => console.error(issue));
    }
    console.log();

    // 5. Verify position data
    console.log('🎯 Step 5: Verifying position data...');
    const positionIssues = [];

    if (!userData.position) {
      positionIssues.push('  ❌ position field MISSING');
    } else {
      console.log(`  ✅ position: ${userData.position}`);
    }

    if (!userData.positionName) {
      positionIssues.push('  ❌ positionName field MISSING');
    } else {
      console.log(`  ✅ positionName: ${userData.positionName}`);
    }

    if (positionIssues.length > 0) {
      positionIssues.forEach(issue => console.error(issue));
    }
    console.log();

    // 6. Verify subcategory/playerType data
    console.log('👤 Step 6: Verifying subcategory/playerType data...');
    const subcategoryIssues = [];

    if (!userData.subcategory) {
      console.warn('  ⚠️  subcategory field missing (optional for some sports)');
    } else {
      console.log(`  ✅ subcategory: ${userData.subcategory}`);
    }

    if (!userData.subcategoryName) {
      console.warn('  ⚠️  subcategoryName field missing (optional for some sports)');
    } else {
      console.log(`  ✅ subcategoryName: ${userData.subcategoryName}`);
    }

    if (!userData.playerType) {
      console.warn('  ⚠️  playerType field missing (should equal subcategoryName)');
    } else {
      console.log(`  ✅ playerType: ${userData.playerType}`);

      // Check if playerType equals subcategoryName
      if (userData.playerType !== userData.subcategoryName) {
        console.warn(`  ⚠️  playerType (${userData.playerType}) !== subcategoryName (${userData.subcategoryName})`);
      }
    }
    console.log();

    // 7. Verify specializations
    console.log('🔧 Step 7: Verifying specializations...');
    if (!userData.specializations) {
      console.warn('  ⚠️  specializations array missing (optional)');
    } else if (!Array.isArray(userData.specializations)) {
      console.error(`  ❌ specializations is not an array`);
    } else if (userData.specializations.length === 0) {
      console.warn('  ⚠️  specializations array is empty');
    } else {
      console.log(`  ✅ specializations: [${userData.specializations.join(', ')}]`);
    }
    console.log();

    // 8. Verify personal details
    console.log('👤 Step 8: Verifying personal details...');
    const personalIssues = [];

    const personalFields = [
      'displayName',
      'dateOfBirth',
      'gender',
      'height',
      'weight',
      'country',
      'state',
      'city'
    ];

    personalFields.forEach(field => {
      if (!userData[field]) {
        personalIssues.push(`  ⚠️  ${field} is missing`);
      } else {
        console.log(`  ✅ ${field}: ${userData[field]}`);
      }
    });

    if (personalIssues.length > 0) {
      personalIssues.forEach(issue => console.log(issue));
    }
    console.log();

    // 9. Verify nested athleteProfile
    console.log('📚 Step 9: Verifying nested athleteProfile...');
    if (!userData.athleteProfile) {
      console.warn('  ⚠️  athleteProfile nested object missing');
    } else {
      console.log('  ✅ athleteProfile exists');
      const ap = userData.athleteProfile;
      if (ap.sports && ap.sports.length > 0) {
        console.log(`     ✓ sports: ${ap.sports.length} sport(s)`);
      }
      if (ap.position) {
        console.log(`     ✓ position: ${ap.position.name || ap.position}`);
      }
      if (ap.subcategory) {
        console.log(`     ✓ subcategory: ${ap.subcategory.name || ap.subcategory}`);
      }
      if (ap.completedOnboarding) {
        console.log(`     ✓ completedOnboarding: true`);
      }
    }
    console.log();

    // 10. Summary and validation
    console.log('=' .repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));

    let issueCount = 0;
    if (userData.role !== 'athlete') issueCount++;
    if (!userData.sports || !Array.isArray(userData.sports)) issueCount++;
    if (!userData.sportDetails || !Array.isArray(userData.sportDetails)) issueCount++;
    if (!userData.position) issueCount++;
    if (!userData.positionName) issueCount++;
    if (!userData.displayName) issueCount++;

    console.log(`\nUser: ${userData.displayName || 'Unknown'}`);
    console.log(`Email: ${userData.email}`);
    console.log(`Role: ${userData.role}`);
    console.log(`Sport: ${userData.sportDetails?.[0]?.name || 'Not set'}`);
    console.log(`Position: ${userData.positionName || 'Not set'}`);
    console.log(`PlayerType: ${userData.playerType || 'Not set'}`);

    console.log('\n' + '='.repeat(70));
    if (issueCount === 0) {
      console.log('✅ ALL CHECKS PASSED - Login flow data is correct!');
      console.log('='.repeat(70) + '\n');
      process.exit(0);
    } else {
      console.log(`⚠️  ${issueCount} critical field(s) missing or incorrect`);
      console.log('='.repeat(70) + '\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyLoginFlowData();
