const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// 1. Initialize Firebase Admin (Firestore)
if (!admin.apps.length) {
    // Use service account if available, or application default credentials
    // For local test, we might need a service account key or use the emulator
    // Assuming standard setup:
    try {
        // Try to use default credentials or credentials from env
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp();
        }
    } catch (e) {
        console.error("Failed to init Firebase Admin. Make sure you have credentials set up.", e);
        process.exit(1);
    }
}
const db = admin.firestore();

// 2. Initialize Supabase (Archive & Shadow Delete)
const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY // MUST use Service Role Key for Admin deletes
);

// 3. Initialize R2 (Media Delete)
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.REACT_APP_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.REACT_APP_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.REACT_APP_R2_SECRET_ACCESS_KEY,
    }
});

async function cleanupStories() {
    console.log('🧹 Starting Story Cleanup...');
    const now = new Date();

    try {
        // Query Expired Stories
        const snapshot = await db.collection('stories')
            .where('expiresAt', '<', now)
            .get();

        if (snapshot.empty) {
            console.log('✅ No expired stories found.');
            return;
        }

        console.log(`Found ${snapshot.size} expired stories to clean.`);

        for (const doc of snapshot.docs) {
            const story = doc.data();
            const storyId = doc.id;
            console.log(`Processing expired story: ${storyId}`);

            // A. Archive to Supabase 'stories_archive'
            // Ensure table exists in Supabase first!
            const { error: archiveError } = await supabase
                .from('stories_archive')
                .insert({
                    id: storyId,
                    user_id: story.userId, // Map fields correctly
                    media_url: story.mediaUrl,
                    media_type: story.mediaType,
                    caption: story.caption,
                    created_at: story.timestamp ? story.timestamp.toDate() : new Date(),
                    archived_at: new Date()
                });

            if (archiveError) {
                // If table missing, we log but continue (don't block delete)
                console.warn(`⚠️ Failed to archive story ${storyId} (Table missing?):`, archiveError.message);
            } else {
                console.log(`📦 Archived metadata for ${storyId}`);
            }

            // B. Delete Media from R2
            if (story.mediaUrl) {
                // Extract Key from URL or store path in DB (Best practice is to store path, but if only URL...)
                // R2 Public URL: https://pub-xxx...r2.dev/stories/images/uid/filename
                // Key: stories/images/uid/filename
                try {
                    // Quick-and-dirty key extraction (Assuming standard URL structure)
                    // If mediaUrl is full URL, we need to strip domain.
                    // If we stored the path in firestore, easier. Let's assume URL.
                    let key = story.mediaUrl;
                    if (key.startsWith('http')) {
                        const urlObj = new URL(key);
                        key = urlObj.pathname.substring(1); // Remove leading slash
                    }

                    await r2.send(new DeleteObjectCommand({
                        Bucket: process.env.REACT_APP_R2_BUCKET_NAME,
                        Key: key
                    }));
                    console.log(`🗑️ Deleted media for ${storyId}`);
                } catch (e) {
                    console.error(`❌ Failed to delete media for ${storyId}:`, e.message);
                }
            }

            // C. Delete from Supabase 'stories' (Shadow Record)
            const { error: deleteShadowError } = await supabase
                .from('stories')
                .delete()
                .eq('id', storyId);

            if (deleteShadowError) {
                console.warn(`⚠️ Failed to delete shadow record ${storyId}:`, deleteShadowError.message);
            }

            // D. Delete from Firestore
            await db.collection('stories').doc(storyId).delete();
            console.log(`🔥 Deleted Firestore doc ${storyId}`);
        }

        console.log('✅ Cleanup complete.');

    } catch (error) {
        console.error('❌ Critical Error during cleanup:', error);
    }
}

// Run
cleanupStories().then(() => process.exit(0));
