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
exports.cleanupOldNotifications = exports.sendMessageNotification = exports.sendFollowNotification = exports.sendLikeNotification = void 0;
// Push Notification Functions
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Send notification when a post is liked
 */
exports.sendLikeNotification = functions.firestore
    .document('posts/{postId}/likes/{likeId}')
    .onCreate(async (snap, context) => {
    const likeData = snap.data();
    const postId = context.params.postId;
    try {
        // Get post data to find the owner
        const postDoc = await admin.firestore()
            .collection('posts')
            .doc(postId)
            .get();
        if (!postDoc.exists)
            return;
        const postData = postDoc.data();
        const postOwnerId = postData === null || postData === void 0 ? void 0 : postData.userId;
        const likerUserId = likeData.userId;
        // Don't send notification if user liked their own post
        if (postOwnerId === likerUserId)
            return;
        // Get liker's profile for notification details
        const likerDoc = await admin.firestore()
            .collection('users')
            .doc(likerUserId)
            .get();
        if (!likerDoc.exists)
            return;
        const likerData = likerDoc.data();
        // Get post owner's FCM tokens
        const ownerDoc = await admin.firestore()
            .collection('users')
            .doc(postOwnerId)
            .get();
        if (!ownerDoc.exists)
            return;
        const ownerData = ownerDoc.data();
        const fcmTokens = (ownerData === null || ownerData === void 0 ? void 0 : ownerData.fcmTokens) || [];
        if (fcmTokens.length === 0)
            return;
        // Create notification payload
        const notification = {
            title: 'New Like!',
            body: `${(likerData === null || likerData === void 0 ? void 0 : likerData.name) || 'Someone'} liked your post`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: {
                type: 'like',
                postId: postId,
                likerUserId: likerUserId,
                likerName: (likerData === null || likerData === void 0 ? void 0 : likerData.name) || 'Unknown User',
                timestamp: Date.now().toString()
            }
        };
        // Send to all user's devices
        const promises = fcmTokens.map(async (token) => {
            try {
                await admin.messaging().send({
                    token: token,
                    notification: {
                        title: notification.title,
                        body: notification.body
                    },
                    data: notification.data,
                    webpush: {
                        notification: {
                            icon: notification.icon,
                            badge: notification.badge,
                            requireInteraction: false,
                            tag: `like-${postId}`
                        }
                    }
                });
            }
            catch (error) {
                console.error('Failed to send notification to token:', token, error);
                // Remove invalid tokens
                if (error.code === 'messaging/registration-token-not-registered') {
                    await admin.firestore()
                        .collection('users')
                        .doc(postOwnerId)
                        .update({
                        fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
                    });
                }
            }
        });
        await Promise.all(promises);
        // Store notification in Firestore for in-app display
        await admin.firestore()
            .collection('notifications')
            .add({
            userId: postOwnerId,
            type: 'like',
            postId: postId,
            fromUserId: likerUserId,
            fromUserName: (likerData === null || likerData === void 0 ? void 0 : likerData.name) || 'Unknown User',
            fromUserPhoto: (likerData === null || likerData === void 0 ? void 0 : likerData.photoURL) || null,
            message: `${(likerData === null || likerData === void 0 ? void 0 : likerData.name) || 'Someone'} liked your post`,
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        console.error('Error sending like notification:', error);
    }
});
/**
 * Send notification when a user is followed
 */
exports.sendFollowNotification = functions.firestore
    .document('follows/{followId}')
    .onCreate(async (snap, context) => {
    const followData = snap.data();
    const followerId = followData.followerId;
    const followedId = followData.followedId;
    try {
        // Get follower's profile
        const followerDoc = await admin.firestore()
            .collection('users')
            .doc(followerId)
            .get();
        if (!followerDoc.exists)
            return;
        const followerData = followerDoc.data();
        // Get followed user's FCM tokens
        const followedDoc = await admin.firestore()
            .collection('users')
            .doc(followedId)
            .get();
        if (!followedDoc.exists)
            return;
        const followedData = followedDoc.data();
        const fcmTokens = (followedData === null || followedData === void 0 ? void 0 : followedData.fcmTokens) || [];
        if (fcmTokens.length === 0)
            return;
        // Create notification payload
        const notification = {
            title: 'New Follower!',
            body: `${(followerData === null || followerData === void 0 ? void 0 : followerData.name) || 'Someone'} started following you`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: {
                type: 'follow',
                followerId: followerId,
                followerName: (followerData === null || followerData === void 0 ? void 0 : followerData.name) || 'Unknown User',
                timestamp: Date.now().toString()
            }
        };
        // Send to all user's devices
        const promises = fcmTokens.map(async (token) => {
            try {
                await admin.messaging().send({
                    token: token,
                    notification: {
                        title: notification.title,
                        body: notification.body
                    },
                    data: notification.data,
                    webpush: {
                        notification: {
                            icon: notification.icon,
                            badge: notification.badge,
                            requireInteraction: false,
                            tag: `follow-${followerId}`
                        }
                    }
                });
            }
            catch (error) {
                console.error('Failed to send follow notification:', error);
                // Remove invalid tokens
                if (error.code === 'messaging/registration-token-not-registered') {
                    await admin.firestore()
                        .collection('users')
                        .doc(followedId)
                        .update({
                        fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
                    });
                }
            }
        });
        await Promise.all(promises);
        // Store notification in Firestore for in-app display
        await admin.firestore()
            .collection('notifications')
            .add({
            userId: followedId,
            type: 'follow',
            fromUserId: followerId,
            fromUserName: (followerData === null || followerData === void 0 ? void 0 : followerData.name) || 'Unknown User',
            fromUserPhoto: (followerData === null || followerData === void 0 ? void 0 : followerData.photoURL) || null,
            message: `${(followerData === null || followerData === void 0 ? void 0 : followerData.name) || 'Someone'} started following you`,
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        console.error('Error sending follow notification:', error);
    }
});
/**
 * Send notification for new messages
 */
exports.sendMessageNotification = functions.firestore
    .document('messages/{messageId}')
    .onCreate(async (snap, context) => {
    var _a;
    const messageData = snap.data();
    const senderId = messageData.senderId;
    const receiverId = messageData.receiverId;
    try {
        // Get sender's profile
        const senderDoc = await admin.firestore()
            .collection('users')
            .doc(senderId)
            .get();
        if (!senderDoc.exists)
            return;
        const senderData = senderDoc.data();
        // Get receiver's FCM tokens
        const receiverDoc = await admin.firestore()
            .collection('users')
            .doc(receiverId)
            .get();
        if (!receiverDoc.exists)
            return;
        const receiverData = receiverDoc.data();
        const fcmTokens = (receiverData === null || receiverData === void 0 ? void 0 : receiverData.fcmTokens) || [];
        if (fcmTokens.length === 0)
            return;
        // Create notification payload
        const messagePreview = ((_a = messageData.message) === null || _a === void 0 ? void 0 : _a.substring(0, 50)) || 'Sent a message';
        const notification = {
            title: `Message from ${(senderData === null || senderData === void 0 ? void 0 : senderData.name) || 'Someone'}`,
            body: messagePreview,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: {
                type: 'message',
                senderId: senderId,
                senderName: (senderData === null || senderData === void 0 ? void 0 : senderData.name) || 'Unknown User',
                messageId: context.params.messageId,
                timestamp: Date.now().toString()
            }
        };
        // Send to all user's devices
        const promises = fcmTokens.map(async (token) => {
            try {
                await admin.messaging().send({
                    token: token,
                    notification: {
                        title: notification.title,
                        body: notification.body
                    },
                    data: notification.data,
                    webpush: {
                        notification: {
                            icon: notification.icon,
                            badge: notification.badge,
                            requireInteraction: true,
                            tag: `message-${senderId}`
                        }
                    }
                });
            }
            catch (error) {
                console.error('Failed to send message notification:', error);
                // Remove invalid tokens
                if (error.code === 'messaging/registration-token-not-registered') {
                    await admin.firestore()
                        .collection('users')
                        .doc(receiverId)
                        .update({
                        fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
                    });
                }
            }
        });
        await Promise.all(promises);
    }
    catch (error) {
        console.error('Error sending message notification:', error);
    }
});
/**
 * Clean up old notifications (runs daily)
 */
exports.cleanupOldNotifications = functions.pubsub
    .schedule('0 2 * * *') // Run at 2 AM daily
    .timeZone('UTC')
    .onRun(async (context) => {
    try {
        // Delete notifications older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const oldNotifications = await admin.firestore()
            .collection('notifications')
            .where('timestamp', '<', thirtyDaysAgo)
            .limit(500)
            .get();
        if (oldNotifications.empty) {
            console.log('No old notifications to cleanup');
            return;
        }
        const batch = admin.firestore().batch();
        oldNotifications.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Cleaned up ${oldNotifications.size} old notifications`);
    }
    catch (error) {
        console.error('Error cleaning up old notifications:', error);
    }
});
//# sourceMappingURL=notifications.js.map