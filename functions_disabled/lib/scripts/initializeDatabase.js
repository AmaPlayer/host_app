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
    console.error('ERROR: serviceAccountKey.json not found at:', serviceAccountPath);
    console.error('Please download it from Firebase Console and place it in the root directory');
    process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
// Collection names
const COLLECTIONS = {
    // Content
    POSTS: 'posts',
    STORIES: 'stories',
    MOMENTS: 'moments',
    VIDEOS: 'videos',
    TALENT_VIDEOS: 'talentVideos',
    // Comments & Engagement
    COMMENTS: 'comments',
    SHARES: 'shares',
    // Users & Relationships
    USERS: 'users',
    FRIENDSHIPS: 'friendships',
    FRIEND_REQUESTS: 'friendRequests',
    ORGANIZATION_CONNECTIONS: 'organizationConnections',
    CONNECTION_ACTIVITY: 'connectionActivity',
    FOLLOWS: 'follows',
    // Verification
    VERIFICATION_REQUESTS: 'verificationRequests',
    VERIFICATIONS: 'verifications',
    // Messaging
    MESSAGES: 'messages',
    CONVERSATIONS: 'conversations',
    NOTIFICATIONS: 'notifications',
    // Community
    GROUPS: 'groups',
    REPORTS: 'reports',
    // Admin
    ADMIN_LOGS: 'adminLogs',
    ADMINS: 'admins',
    MOMENT_INTERACTIONS: 'momentInteractions',
};
async function createCollectionsWithSchema(options = {}) {
    const { dryRun = false, verbose = true } = options;
    const log = (msg) => {
        if (verbose)
            console.log(`[${new Date().toISOString()}] ${msg}`);
    };
    try {
        log('🚀 Starting Database Initialization...\n');
        if (dryRun) {
            log('⚠️  DRY RUN MODE - No changes will be made\n');
        }
        // 1. USERS Collection
        log('📝 Creating USERS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.USERS).doc('_schema').set({
                displayName: 'string',
                email: 'string',
                photoURL: 'string | null',
                bio: 'string | optional',
                location: 'string | optional',
                website: 'string | optional',
                username: 'string | optional',
                createdAt: 'Timestamp',
                updatedAt: 'Timestamp',
                postsCount: 'number',
                storiesCount: 'number',
                followersCount: 'number',
                followingCount: 'number',
                followers: 'array<string>',
                following: 'array<string>',
                isVerified: 'boolean',
                isActive: 'boolean',
                isOnline: 'boolean | optional',
                lastSeen: 'Timestamp | optional',
                privacy: 'UserPrivacy | optional',
                settings: 'UserNotificationSettings | optional',
                role: 'string (athlete|parent|organization|coach) | optional',
                sports: 'array<string> | optional',
                eventTypes: 'array<string> | optional',
                position: 'string | optional',
                specializations: 'array<string> | optional',
                dateOfBirth: 'string | optional',
                gender: 'string | optional',
                height: 'string | optional',
                weight: 'string | optional',
                country: 'string | optional',
                state: 'string | optional',
                city: 'string | optional',
                phone: 'string | optional',
                mobile: 'string | optional',
                languagePreference: 'string (ISO code) | optional',
                languagePreferenceUpdatedAt: 'Timestamp | optional',
            });
        }
        log('✅ USERS collection schema ready\n');
        // 2. POSTS Collection
        log('📝 Creating POSTS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.POSTS).doc('_schema').set({
                userId: 'string',
                userDisplayName: 'string',
                userPhotoURL: 'string | null',
                userRole: 'string | optional',
                userSport: 'string | optional',
                userPosition: 'string | optional',
                caption: 'string',
                mediaUrl: 'string | null | optional',
                mediaType: 'string (image|video) | optional',
                mediaMetadata: {
                    size: 'number',
                    type: 'string',
                    name: 'string',
                    uploadedAt: 'string',
                    thumbnail: 'string | optional',
                },
                timestamp: 'Timestamp',
                likes: 'array<{userId: string, userName: string, userPhotoURL: string, timestamp: Timestamp}>',
                likesCount: 'number',
                comments: 'array<Comment>',
                commentsCount: 'number',
                shares: 'array<string>',
                sharesCount: 'number',
                visibility: 'string (public|friends|private)',
                location: 'string | optional',
                tags: 'array<string> | optional',
                isActive: 'boolean',
                deletedAt: 'string | optional',
                isLiked: 'boolean (computed) | optional',
                hasShared: 'boolean (computed) | optional',
            });
        }
        log('✅ POSTS collection schema ready\n');
        // 3. STORIES Collection
        log('📝 Creating STORIES collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.STORIES).doc('_schema').set({
                userId: 'string',
                userDisplayName: 'string',
                userPhotoURL: 'string',
                mediaType: 'string (image|video)',
                mediaUrl: 'string',
                thumbnail: 'string | null | optional',
                caption: 'string',
                timestamp: 'Timestamp',
                expiresAt: 'Timestamp (24 hours from creation)',
                viewCount: 'number',
                viewers: 'array<string> (user IDs)',
                isHighlight: 'boolean',
                highlightId: 'string | null',
                sharingEnabled: 'boolean',
                publicLink: 'string',
            });
        }
        log('✅ STORIES collection schema ready\n');
        // 4. MOMENTS Collection
        log('📝 Creating MOMENTS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.MOMENTS).doc('_schema').set({
                userId: 'string',
                userDisplayName: 'string',
                userPhotoURL: 'string | null',
                videoUrl: 'string',
                thumbnailUrl: 'string',
                caption: 'string',
                duration: 'number (seconds)',
                metadata: {
                    width: 'number',
                    height: 'number',
                    fileSize: 'number',
                    format: 'string',
                    bitrate: 'number | optional',
                    frameRate: 'number | optional',
                    aspectRatio: 'string (9:16|16:9|etc)',
                    uploadedAt: 'string',
                    processingStatus: 'string (pending|processing|completed|failed) | optional',
                    qualityVersions: 'array<VideoQualityVersion> | optional',
                },
                engagement: {
                    likes: 'array<VideoLike>',
                    likesCount: 'number',
                    comments: 'array<VideoComment>',
                    commentsCount: 'number',
                    shares: 'array<string>',
                    sharesCount: 'number',
                    views: 'number',
                    watchTime: 'number (seconds)',
                    completionRate: 'number (percentage)',
                },
                createdAt: 'Timestamp',
                updatedAt: 'Timestamp',
                isActive: 'boolean',
                moderationStatus: 'string (pending|approved|rejected)',
                isTalentVideo: 'boolean | optional',
                isPostVideo: 'boolean | optional',
                isLiked: 'boolean (computed) | optional',
                hasShared: 'boolean (computed) | optional',
            });
        }
        log('✅ MOMENTS collection schema ready\n');
        // 5. COMMENTS Collection (Centralized)
        log('📝 Creating COMMENTS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.COMMENTS).doc('_schema').set({
                text: 'string',
                userId: 'string',
                userDisplayName: 'string',
                userPhotoURL: 'string | null',
                contentId: 'string (post/story/moment ID)',
                contentType: 'string (post|story|moment)',
                timestamp: 'string (ISO timestamp)',
                likes: 'array<string> (user IDs)',
                likesCount: 'number',
                replies: 'array<unknown> | optional',
                edited: 'boolean | optional',
                editedAt: 'string | optional',
            });
        }
        log('✅ COMMENTS collection schema ready\n');
        // 6. SHARES Collection
        log('📝 Creating SHARES collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.SHARES).doc('_schema').set({
                contentId: 'string',
                contentType: 'string (post|story|moment)',
                userId: 'string',
                sharedWith: 'array<string> (user IDs)',
                sharedInGroups: 'array<string> (group IDs)',
                timestamp: 'Timestamp',
                message: 'string | optional',
            });
        }
        log('✅ SHARES collection schema ready\n');
        // 7. FRIENDSHIPS Collection
        log('📝 Creating FRIENDSHIPS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.FRIENDSHIPS).doc('_schema').set({
                requesterId: 'string',
                requesterName: 'string',
                requesterPhotoURL: 'string',
                recipientId: 'string',
                recipientName: 'string',
                recipientPhotoURL: 'string',
                status: 'string (accepted|pending|rejected|blocked)',
                createdAt: 'Timestamp',
                updatedAt: 'Timestamp | optional',
            });
        }
        log('✅ FRIENDSHIPS collection schema ready\n');
        // 8. FRIEND_REQUESTS Collection
        log('📝 Creating FRIEND_REQUESTS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.FRIEND_REQUESTS).doc('_schema').set({
                requesterId: 'string',
                requesterName: 'string',
                requesterPhotoURL: 'string',
                recipientId: 'string',
                status: 'string (pending|accepted|rejected)',
                createdAt: 'Timestamp',
            });
        }
        log('✅ FRIEND_REQUESTS collection schema ready\n');
        // 9. ORGANIZATION_CONNECTIONS Collection
        log('📝 Creating ORGANIZATION_CONNECTIONS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.ORGANIZATION_CONNECTIONS).doc('_schema').set({
                connectionType: 'string (org_to_athlete|coach_to_org)',
                senderId: 'string',
                senderName: 'string',
                senderPhotoURL: 'string',
                senderRole: 'string (organization|coach)',
                recipientId: 'string',
                recipientName: 'string',
                recipientPhotoURL: 'string',
                recipientRole: 'string (athlete|organization)',
                status: 'string (pending|accepted|rejected)',
                createdAt: 'Timestamp',
                acceptedAt: 'Timestamp | optional',
                rejectedAt: 'Timestamp | optional',
                friendshipId: 'string | optional',
                createdViaConnection: 'boolean',
            });
        }
        log('✅ ORGANIZATION_CONNECTIONS collection schema ready\n');
        // 10. CONNECTION_ACTIVITY Collection
        log('📝 Creating CONNECTION_ACTIVITY collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.CONNECTION_ACTIVITY).doc('_schema').set({
                connectionId: 'string',
                action: 'string (request_sent|request_accepted|request_rejected|request_cancelled|message_sent|call_initiated)',
                actorId: 'string',
                targetId: 'string',
                timestamp: 'Timestamp',
                metadata: 'object | optional',
            });
        }
        log('✅ CONNECTION_ACTIVITY collection schema ready\n');
        // 11. FOLLOWS Collection
        log('📝 Creating FOLLOWS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.FOLLOWS).doc('_schema').set({
                followerId: 'string',
                followerName: 'string',
                followerPhotoURL: 'string',
                followingId: 'string',
                followingName: 'string',
                followingPhotoURL: 'string',
                createdAt: 'Timestamp',
            });
        }
        log('✅ FOLLOWS collection schema ready\n');
        // 12. VERIFICATION_REQUESTS Collection
        log('📝 Creating VERIFICATION_REQUESTS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.VERIFICATION_REQUESTS).doc('_schema').set({
                userId: 'string',
                userDisplayName: 'string',
                userPhotoURL: 'string',
                userRole: 'string',
                userInfo: {
                    name: 'string',
                    age: 'number | null',
                    bio: 'string',
                    location: 'string',
                    sport: 'string',
                    achievements: 'array<string>',
                    certificates: 'array<string>',
                },
                showcaseVideos: 'array<ShowcaseVideo>',
                verificationCount: 'number',
                verificationGoal: 'number',
                verifiedBy: 'array<unknown>',
                status: 'string (pending|verified|rejected|expired)',
                createdAt: 'Timestamp',
                expiresAt: 'Date (30 days from creation)',
                isPublic: 'boolean',
                shareableLink: 'string',
                verificationIPs: 'array<string>',
                flagged: 'boolean',
                flagReason: 'string | null',
            });
        }
        log('✅ VERIFICATION_REQUESTS collection schema ready\n');
        // 13. VERIFICATIONS Collection
        log('📝 Creating VERIFICATIONS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.VERIFICATIONS).doc('_schema').set({
                verificationRequestId: 'string',
                voterId: 'string',
                voterName: 'string',
                voterPhotoURL: 'string',
                verificationId: 'string',
                vote: 'boolean (true = verified, false = not verified)',
                comment: 'string | optional',
                timestamp: 'Timestamp',
                ipAddress: 'string (for fraud prevention)',
            });
        }
        log('✅ VERIFICATIONS collection schema ready\n');
        // 14. MESSAGES Collection
        log('📝 Creating MESSAGES collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.MESSAGES).doc('_schema').set({
                senderId: 'string',
                senderName: 'string',
                senderPhotoURL: 'string | null',
                receiverId: 'string',
                receiverName: 'string',
                message: 'string',
                timestamp: 'Timestamp',
                isRead: 'boolean | optional',
                attachments: 'array<{url: string, type: string}> | optional',
            });
        }
        log('✅ MESSAGES collection schema ready\n');
        // 15. CONVERSATIONS Collection
        log('📝 Creating CONVERSATIONS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.CONVERSATIONS).doc('_schema').set({
                participantIds: 'array<string>',
                participantNames: 'array<string>',
                lastMessage: 'string',
                lastMessageTime: 'Timestamp',
                lastMessageSenderId: 'string',
                createdAt: 'Timestamp',
                updatedAt: 'Timestamp',
                isGroupChat: 'boolean',
                groupName: 'string | optional',
                groupIcon: 'string | optional',
            });
        }
        log('✅ CONVERSATIONS collection schema ready\n');
        // 16. NOTIFICATIONS Collection
        log('📝 Creating NOTIFICATIONS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.NOTIFICATIONS).doc('_schema').set({
                type: 'string (like|comment|follow|friendRequest|share|message)',
                senderId: 'string',
                senderName: 'string',
                receiverId: 'string',
                message: 'string',
                contentId: 'string | optional',
                contentType: 'string | optional',
                timestamp: 'Timestamp',
                isRead: 'boolean | optional',
                actionUrl: 'string | optional',
            });
        }
        log('✅ NOTIFICATIONS collection schema ready\n');
        // 17. GROUPS Collection
        log('📝 Creating GROUPS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.GROUPS).doc('_schema').set({
                name: 'string',
                description: 'string',
                icon: 'string | optional',
                creatorId: 'string',
                createdAt: 'Timestamp',
                members: 'array<string> (user IDs)',
                admins: 'array<string> (user IDs)',
                privacy: 'string (public|private|closed)',
                postingPermissions: 'string (members|admins|public)',
                memberCount: 'number',
                isActive: 'boolean',
            });
        }
        log('✅ GROUPS collection schema ready\n');
        // 18. REPORTS Collection
        log('📝 Creating REPORTS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.REPORTS).doc('_schema').set({
                contentId: 'string',
                contentType: 'string (post|story|moment|comment|user)',
                reporterId: 'string',
                reporterName: 'string',
                reasons: 'array<string> (inappropriate|spam|harassment|copyright|other)',
                description: 'string | optional',
                timestamp: 'Timestamp',
                status: 'string (pending|reviewed|resolved|dismissed)',
                adminNotes: 'string | optional',
                actionTaken: 'string (removed|warning|ban) | optional',
                resolvedAt: 'Timestamp | optional',
                resolvedBy: 'string (admin ID) | optional',
            });
        }
        log('✅ REPORTS collection schema ready\n');
        // 19. ADMIN_LOGS Collection
        log('📝 Creating ADMIN_LOGS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.ADMIN_LOGS).doc('_schema').set({
                adminId: 'string',
                adminName: 'string',
                action: 'string (create|read|update|delete|approve|reject|ban)',
                collection: 'string (posts|users|comments|etc)',
                documentId: 'string',
                changes: 'object | optional',
                timestamp: 'Timestamp',
                ipAddress: 'string | optional',
                userAgent: 'string | optional',
            });
        }
        log('✅ ADMIN_LOGS collection schema ready\n');
        // 20. ADMINS Collection
        log('📝 Creating ADMINS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.ADMINS).doc('_schema').set({
                userId: 'string',
                displayName: 'string',
                email: 'string',
                photoURL: 'string | null',
                role: 'string (super_admin|admin|moderator|content_moderator)',
                permissions: 'array<string>',
                active: 'boolean',
                createdAt: 'Timestamp',
                lastLoginAt: 'Timestamp | optional',
            });
        }
        log('✅ ADMINS collection schema ready\n');
        // 21. VIDEOS Collection
        log('📝 Creating VIDEOS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.VIDEOS).doc('_schema').set({
                userId: 'string',
                userName: 'string',
                userPhotoURL: 'string | null',
                title: 'string',
                description: 'string | optional',
                videoUrl: 'string',
                thumbnail: 'string',
                uploadDate: 'Timestamp',
                duration: 'number (seconds)',
                sport: 'string | optional',
                likes: 'number',
                views: 'number',
                shares: 'number',
                comments: 'array<string>',
                isPublic: 'boolean',
                verificationStatus: 'string (pending|verified|rejected)',
                tags: 'array<string> | optional',
            });
        }
        log('✅ VIDEOS collection schema ready\n');
        // 22. TALENT_VIDEOS Collection
        log('📝 Creating TALENT_VIDEOS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.TALENT_VIDEOS).doc('_schema').set({
                userId: 'string',
                userName: 'string',
                userPhotoURL: 'string | null',
                title: 'string',
                videoUrl: 'string',
                thumbnail: 'string',
                uploadDate: 'Timestamp',
                sport: 'string',
                likes: 'number',
                views: 'number',
                isApproved: 'boolean',
                approvedBy: 'string (admin ID) | optional',
                approvedAt: 'Timestamp | optional',
                isHighlight: 'boolean',
            });
        }
        log('✅ TALENT_VIDEOS collection schema ready\n');
        // 23. MOMENT_INTERACTIONS Collection
        log('📝 Creating MOMENT_INTERACTIONS collection schema...');
        if (!dryRun) {
            await db.collection(COLLECTIONS.MOMENT_INTERACTIONS).doc('_schema').set({
                momentId: 'string',
                userId: 'string',
                interactionType: 'string (view|like|share|comment|download)',
                timestamp: 'Timestamp',
                duration: 'number (seconds for views) | optional',
                metadata: 'object | optional',
            });
        }
        log('✅ MOMENT_INTERACTIONS collection schema ready\n');
        log('\n' + '='.repeat(60));
        log('✨ ALL COLLECTIONS INITIALIZED SUCCESSFULLY!');
        log('='.repeat(60));
        log('\n📊 Summary:');
        log(`✅ Content Collections: 5 (posts, stories, moments, videos, talentVideos)`);
        log(`✅ Comments & Engagement: 2 (comments, shares)`);
        log(`✅ Users & Relationships: 6 (users, friendships, friendRequests, organizationConnections, connectionActivity, follows)`);
        log(`✅ Verification: 2 (verificationRequests, verifications)`);
        log(`✅ Messaging & Notifications: 3 (messages, conversations, notifications)`);
        log(`✅ Community & Admin: 5 (groups, reports, adminLogs, admins, momentInteractions)`);
        log(`\n📍 Total Collections Created: 23\n`);
        if (dryRun) {
            log('⚠️  DRY RUN COMPLETE - No actual changes were made');
        }
    }
    catch (error) {
        console.error('❌ ERROR during initialization:', error);
        process.exit(1);
    }
}
// Run the initialization
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = !args.includes('--quiet');
createCollectionsWithSchema({ dryRun: isDryRun, verbose: isVerbose })
    .then(() => {
    log('👋 Script completed successfully');
    process.exit(0);
})
    .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}
//# sourceMappingURL=initializeDatabase.js.map