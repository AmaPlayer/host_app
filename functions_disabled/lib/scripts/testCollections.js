"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '../../../serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ ERROR: serviceAccountKey.json not found at:', serviceAccountPath);
    console.error('Please place it in the root directory');
    process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
// Test configuration
const TEST_USER_ID = 'TEST_USER_123';
const TEST_MODE = process.argv[2] || 'create'; // 'create' or 'cleanup'
const results = [];
// ============================================================
// TEST DATA GENERATORS
// ============================================================
function generateTestData() {
    const now = admin.firestore.Timestamp.now();
    const testUserId = TEST_USER_ID;
    return {
        // USER - Base test user
        users: {
            displayName: 'Test User',
            email: 'test@example.com',
            photoURL: null,
            createdAt: now,
            updatedAt: now,
            postsCount: 0,
            storiesCount: 0,
            followersCount: 0,
            followingCount: 0,
            followers: [],
            following: [],
            isVerified: false,
            isActive: true,
            isTestData: true,
        },
        // CONTENT - Posts
        posts: {
            userId: testUserId,
            userDisplayName: 'Test User',
            userPhotoURL: null,
            caption: 'TEST_POST - This is a test post',
            mediaUrl: null,
            timestamp: now,
            likes: [],
            likesCount: 0,
            commentsCount: 0,
            shares: [],
            sharesCount: 0,
            visibility: 'public',
            isActive: true,
            isTestData: true,
        },
        // CONTENT - Stories
        stories: {
            userId: testUserId,
            userDisplayName: 'Test User',
            userPhotoURL: null,
            mediaType: 'image',
            mediaUrl: 'https://example.com/test.jpg',
            caption: 'TEST_STORY - Test story',
            timestamp: now,
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
            viewCount: 0,
            viewers: [],
            isHighlight: false,
            highlightId: null,
            sharingEnabled: true,
            publicLink: 'test-story-link',
            isTestData: true,
        },
        // CONTENT - Moments
        moments: {
            userId: testUserId,
            userDisplayName: 'Test User',
            userPhotoURL: null,
            videoUrl: 'https://example.com/test.mp4',
            thumbnailUrl: 'https://example.com/test-thumb.jpg',
            caption: 'TEST_MOMENT - Test moment video',
            duration: 30,
            metadata: {
                width: 1080,
                height: 1920,
                fileSize: 5000000,
                format: 'mp4',
                aspectRatio: '9:16',
                uploadedAt: new Date().toISOString(),
            },
            engagement: {
                likes: [],
                likesCount: 0,
                commentsCount: 0,
                shares: [],
                sharesCount: 0,
                views: 0,
                watchTime: 0,
                completionRate: 0,
            },
            createdAt: now,
            updatedAt: now,
            isActive: true,
            moderationStatus: 'approved',
            isTestData: true,
        },
        // CONTENT - Videos
        videos: {
            userId: testUserId,
            userName: 'Test User',
            userPhotoURL: null,
            title: 'TEST_VIDEO - Test video',
            videoUrl: 'https://example.com/video.mp4',
            thumbnail: 'https://example.com/thumb.jpg',
            uploadDate: now,
            duration: 60,
            likes: 0,
            views: 0,
            shares: 0,
            isPublic: true,
            verificationStatus: 'pending',
            isTestData: true,
        },
        // CONTENT - Talent Videos
        talentVideos: {
            userId: testUserId,
            userName: 'Test User',
            userPhotoURL: null,
            title: 'TEST_TALENT - Test talent video',
            videoUrl: 'https://example.com/talent.mp4',
            thumbnail: 'https://example.com/talent-thumb.jpg',
            uploadDate: now,
            sport: 'running',
            likes: 0,
            isApproved: false,
            isHighlight: false,
            isTestData: true,
        },
        // ENGAGEMENT - Comments
        comments: {
            text: 'TEST_COMMENT - This is a test comment',
            userId: testUserId,
            userDisplayName: 'Test User',
            userPhotoURL: null,
            contentId: 'TEST_POST_001',
            contentType: 'post',
            timestamp: new Date().toISOString(),
            likes: [],
            likesCount: 0,
            isTestData: true,
        },
        // ENGAGEMENT - Shares
        shares: {
            contentId: 'TEST_POST_001',
            contentType: 'post',
            userId: testUserId,
            sharedWith: [],
            timestamp: now,
            isTestData: true,
        },
        // RELATIONSHIPS - Friendships
        friendships: {
            requesterId: testUserId,
            requesterName: 'Test User',
            requesterPhotoURL: null,
            recipientId: 'OTHER_USER_123',
            recipientName: 'Other User',
            recipientPhotoURL: null,
            status: 'pending',
            createdAt: now,
            isTestData: true,
        },
        // RELATIONSHIPS - Friend Requests
        friendRequests: {
            requesterId: testUserId,
            requesterName: 'Test User',
            requesterPhotoURL: null,
            recipientId: 'OTHER_USER_123',
            status: 'pending',
            createdAt: now,
            isTestData: true,
        },
        // RELATIONSHIPS - Organization Connections
        organizationConnections: {
            connectionType: 'org_to_athlete',
            senderId: testUserId,
            senderName: 'Test User',
            senderPhotoURL: null,
            senderRole: 'organization',
            recipientId: 'OTHER_USER_123',
            recipientName: 'Other User',
            recipientPhotoURL: null,
            recipientRole: 'athlete',
            status: 'pending',
            createdAt: now,
            createdViaConnection: true,
            isTestData: true,
        },
        // RELATIONSHIPS - Connection Activity
        connectionActivity: {
            connectionId: 'TEST_CONN_001',
            action: 'request_sent',
            actorId: testUserId,
            targetId: 'OTHER_USER_123',
            timestamp: now,
            isTestData: true,
        },
        // RELATIONSHIPS - Follows
        follows: {
            followerId: testUserId,
            followerName: 'Test User',
            followerPhotoURL: null,
            followingId: 'OTHER_USER_123',
            followingName: 'Other User',
            followingPhotoURL: null,
            createdAt: now,
            isTestData: true,
        },
        // VERIFICATION - Verification Requests
        verificationRequests: {
            userId: testUserId,
            userDisplayName: 'Test User',
            userPhotoURL: null,
            userRole: 'athlete',
            verificationCount: 0,
            verificationGoal: 5,
            status: 'pending',
            createdAt: now,
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            isPublic: true,
            shareableLink: 'test-verify-link',
            verifiedBy: [],
            flagged: false,
            isTestData: true,
        },
        // VERIFICATION - Verifications
        verifications: {
            verificationRequestId: 'TEST_VER_REQ_001',
            voterId: 'OTHER_USER_123',
            voterName: 'Other User',
            voterPhotoURL: null,
            vote: true,
            timestamp: now,
            isTestData: true,
        },
        // MESSAGING - Messages
        messages: {
            senderId: testUserId,
            senderName: 'Test User',
            senderPhotoURL: null,
            receiverId: 'OTHER_USER_123',
            message: 'TEST_MESSAGE - This is a test message',
            timestamp: now,
            isRead: false,
            isTestData: true,
        },
        // MESSAGING - Conversations
        conversations: {
            participantIds: [testUserId, 'OTHER_USER_123'],
            participantNames: ['Test User', 'Other User'],
            lastMessage: 'TEST_MESSAGE - Last message',
            lastMessageTime: now,
            lastMessageSenderId: testUserId,
            createdAt: now,
            updatedAt: now,
            isGroupChat: false,
            isTestData: true,
        },
        // MESSAGING - Notifications
        notifications: {
            type: 'like',
            senderId: 'OTHER_USER_123',
            senderName: 'Other User',
            receiverId: testUserId,
            message: 'TEST_NOTIFICATION - Someone liked your post',
            timestamp: now,
            isRead: false,
            isTestData: true,
        },
        // COMMUNITY - Groups
        groups: {
            name: 'TEST_GROUP - Test Group',
            description: 'This is a test group',
            creatorId: testUserId,
            createdAt: now,
            members: [testUserId],
            admins: [testUserId],
            privacy: 'public',
            postingPermissions: 'members',
            memberCount: 1,
            isActive: true,
            isTestData: true,
        },
        // ADMIN - Reports
        reports: {
            contentId: 'TEST_POST_001',
            contentType: 'post',
            reporterId: testUserId,
            reporterName: 'Test User',
            reasons: ['inappropriate'],
            timestamp: now,
            status: 'pending',
            isTestData: true,
        },
        // ADMIN - Admin Logs
        adminLogs: {
            adminId: testUserId,
            adminName: 'Test User',
            action: 'create',
            collection: 'posts',
            documentId: 'TEST_POST_001',
            timestamp: now,
            isTestData: true,
        },
        // ADMIN - Admins
        admins: {
            userId: testUserId,
            displayName: 'Test User',
            email: 'test@example.com',
            photoURL: null,
            role: 'admin',
            permissions: ['read', 'write'],
            active: true,
            createdAt: now,
            isTestData: true,
        },
        // ADMIN - Moment Interactions
        momentInteractions: {
            momentId: 'TEST_MOMENT_001',
            userId: testUserId,
            interactionType: 'view',
            timestamp: now,
            duration: 10,
            isTestData: true,
        },
    };
}
// ============================================================
// WRITE TEST DOCUMENTS
// ============================================================
async function createTestDocuments() {
    console.log('\n🚀 Starting Collection Tests (CREATE MODE)...\n');
    const testData = generateTestData();
    const collections = Object.keys(testData);
    // 1. Create test user first
    console.log('📝 Creating TEST_USER first...');
    try {
        await db.collection('users').doc(TEST_USER_ID).set(testData.users);
        console.log('✅ TEST_USER created\n');
    }
    catch (error) {
        console.error('❌ Failed to create TEST_USER:', error.message);
        process.exit(1);
    }
    // 2. Create test documents for all collections
    for (const collectionName of collections) {
        if (collectionName === 'users')
            continue; // Already created
        try {
            const docId = `TEST_${collectionName.toUpperCase()}_001`;
            const testDoc = testData[collectionName];
            await db.collection(collectionName).doc(docId).set(testDoc);
            results.push({
                collection: collectionName,
                status: 'PASSED',
                docId: docId,
            });
            console.log(`✅ ${collectionName.padEnd(25)} - PASSED (${docId})`);
        }
        catch (error) {
            results.push({
                collection: collectionName,
                status: 'FAILED',
                error: error.message,
            });
            console.error(`❌ ${collectionName.padEnd(25)} - FAILED: ${error.message}`);
        }
    }
    // Also add users to results
    results.unshift({
        collection: 'users',
        status: 'PASSED',
        docId: TEST_USER_ID,
    });
    // Print summary
    printSummary();
}
// ============================================================
// CLEANUP TEST DOCUMENTS
// ============================================================
async function cleanupTestDocuments() {
    console.log('\n🗑️  Starting Cleanup (DELETE MODE)...\n');
    const collections = [
        'users',
        'posts',
        'stories',
        'moments',
        'videos',
        'talentVideos',
        'comments',
        'shares',
        'friendships',
        'friendRequests',
        'organizationConnections',
        'connectionActivity',
        'follows',
        'verificationRequests',
        'verifications',
        'messages',
        'conversations',
        'notifications',
        'groups',
        'reports',
        'adminLogs',
        'admins',
        'momentInteractions',
    ];
    for (const collectionName of collections) {
        try {
            // Query for documents with isTestData: true
            const snapshot = await db
                .collection(collectionName)
                .where('isTestData', '==', true)
                .get();
            let deletedCount = 0;
            for (const doc of snapshot.docs) {
                await doc.ref.delete();
                deletedCount++;
            }
            if (deletedCount > 0) {
                results.push({
                    collection: collectionName,
                    status: 'PASSED',
                });
                console.log(`🗑️  ${collectionName.padEnd(25)} - Deleted ${deletedCount} document(s)`);
            }
        }
        catch (error) {
            results.push({
                collection: collectionName,
                status: 'FAILED',
                error: error.message,
            });
            console.error(`❌ ${collectionName.padEnd(25)} - Cleanup failed: ${error.message}`);
        }
    }
    // Also delete test user
    try {
        await db.collection('users').doc(TEST_USER_ID).delete();
        console.log(`🗑️  users (TEST_USER)              - Deleted 1 document`);
    }
    catch (error) {
        console.error(`❌ Failed to delete test user: ${error.message}`);
    }
    console.log('\n✅ Cleanup completed!');
}
// ============================================================
// REPORTING
// ============================================================
function printSummary() {
    const passCount = results.filter((r) => r.status === 'PASSED').length;
    const failCount = results.filter((r) => r.status === 'FAILED').length;
    console.log('\n' + '='.repeat(60));
    console.log('✨ TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n✅ Passed: ${passCount}/${results.length}`);
    console.log(`❌ Failed: ${failCount}/${results.length}`);
    if (failCount > 0) {
        console.log('\n❌ FAILED COLLECTIONS:');
        results
            .filter((r) => r.status === 'FAILED')
            .forEach((r) => {
            console.log(`   - ${r.collection}: ${r.error}`);
        });
    }
    console.log('\n' + '='.repeat(60));
    if (failCount === 0) {
        console.log('🎉 All collections tested successfully!');
    }
    else {
        console.log(`⚠️  ${failCount} collection(s) failed`);
    }
    console.log('='.repeat(60) + '\n');
}
// ============================================================
// MAIN
// ============================================================
async function main() {
    try {
        if (TEST_MODE === 'cleanup') {
            await cleanupTestDocuments();
        }
        else {
            await createTestDocuments();
        }
    }
    catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
    finally {
        process.exit(0);
    }
}
main();
//# sourceMappingURL=testCollections.js.map