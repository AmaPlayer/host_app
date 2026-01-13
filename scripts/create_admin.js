const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'amaplay007-firebase-adminsdk-fbsvc-117ee207e2.json');
const TARGET_EMAIL = "ymonu276.my@gmail.com";
const TARGET_PASSWORD = "Nikalbsdk@123";

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = require(SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin Initialized");
    } catch (e) {
        console.error("❌ Failed to init Firebase Admin:", e.message);
        process.exit(1);
    }
}

async function createAdminUser() {
    console.log(`🚀 Starting Admin User Creation for: ${TARGET_EMAIL}`);

    try {
        let userRecord;

        // 1. Check if user exists
        try {
            userRecord = await admin.auth().getUserByEmail(TARGET_EMAIL);
            console.log(`ℹ️ User already exists with UID: ${userRecord.uid}`);

            // Only update password if we want to force reset it? 
            // Let's update it to ensure they can login with provided credentials.
            await admin.auth().updateUser(userRecord.uid, {
                password: TARGET_PASSWORD,
                emailVerified: true
            });
            console.log("✅ Password updated/verified.");

        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                // 2. Create new user
                console.log("ℹ️ Creating new user...");
                userRecord = await admin.auth().createUser({
                    email: TARGET_EMAIL,
                    password: TARGET_PASSWORD,
                    emailVerified: true,
                    displayName: "Admin User",
                });
                console.log(`✅ User created with UID: ${userRecord.uid}`);
            } else {
                throw error;
            }
        }

        // 3. Set Custom Claim (Still good to have)
        await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
        console.log(`✅ Custom claim { admin: true } set for UID: ${userRecord.uid}`);

        // 4. Create/Update Firestore Admin Document (REQUIRED by Dashboard)
        const adminDocRef = admin.firestore().collection('admins').doc(userRecord.uid);
        await adminDocRef.set({
            email: TARGET_EMAIL,
            active: true,
            role: 'super_admin',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`✅ Firestore admin document created/updated for UID: ${userRecord.uid}`);

        // 5. Verification Check
        const user = await admin.auth().getUser(userRecord.uid);
        if (user.customClaims && user.customClaims.admin) {
            console.log("\n🎉 SUCCESS! User is now an Admin.");
            console.log("Login at the dashboard using these credentials.");
        } else {
            console.error("\n⚠️ WARNING: Claims set but could not be verified immediately. Propagation might take a moment.");
        }
    } catch (error) {
        console.error("❌ Error creating admin user:", error);
    }
}

createAdminUser().then(() => process.exit(0));
