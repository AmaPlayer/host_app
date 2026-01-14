// Push Notification Functions
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Send notification when a post is liked
 */
export const sendLikeNotification = functions.firestore
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
        
      if (!postDoc.exists) return;
      
      const postData = postDoc.data();
      const postOwnerId = postData?.userId;
      const likerUserId = likeData.userId;
      
      // Don't send notification if user liked their own post
      if (postOwnerId === likerUserId) return;
      
      // Get liker's profile for notification details
      const likerDoc = await admin.firestore()
        .collection('users')
        .doc(likerUserId)
        .get();
        
      if (!likerDoc.exists) return;
      
      const likerData = likerDoc.data();
      
      // Get post owner's FCM tokens
      const ownerDoc = await admin.firestore()
        .collection('users')
        .doc(postOwnerId)
        .get();
        
      if (!ownerDoc.exists) return;
      
      const ownerData = ownerDoc.data();
      const fcmTokens = ownerData?.fcmTokens || [];
      
      if (fcmTokens.length === 0) return;
      
      // Create notification payload
      const notification = {
        title: 'New Like!',
        body: `${likerData?.name || 'Someone'} liked your post`,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: {
          type: 'like',
          postId: postId,
          likerUserId: likerUserId,
          likerName: likerData?.name || 'Unknown User',
          timestamp: Date.now().toString()
        }
      };
      
      // Send to all user's devices
      const promises = fcmTokens.map(async (token: string) => {
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
        } catch (error: any) {
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
          receiverId: postOwnerId,
          type: 'like',
          postId: postId,
          fromUserId: likerUserId,
          fromUserName: likerData?.name || 'Unknown User',
          fromUserPhoto: likerData?.photoURL || null,
          message: `${likerData?.name || 'Someone'} liked your post`,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
      console.error('Error sending like notification:', error);
    }
  });

/**
 * Send notification when a user is followed
 */
export const sendFollowNotification = functions.firestore
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
        
      if (!followerDoc.exists) return;
      
      const followerData = followerDoc.data();
      
      // Get followed user's FCM tokens
      const followedDoc = await admin.firestore()
        .collection('users')
        .doc(followedId)
        .get();
        
      if (!followedDoc.exists) return;
      
      const followedData = followedDoc.data();
      const fcmTokens = followedData?.fcmTokens || [];
      
      if (fcmTokens.length === 0) return;
      
      // Create notification payload
      const notification = {
        title: 'New Follower!',
        body: `${followerData?.name || 'Someone'} started following you`,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: {
          type: 'follow',
          followerId: followerId,
          followerName: followerData?.name || 'Unknown User',
          timestamp: Date.now().toString()
        }
      };
      
      // Send to all user's devices
      const promises = fcmTokens.map(async (token: string) => {
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
        } catch (error: any) {
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
          receiverId: followedId,
          type: 'follow',
          fromUserId: followerId,
          fromUserName: followerData?.name || 'Unknown User',
          fromUserPhoto: followerData?.photoURL || null,
          message: `${followerData?.name || 'Someone'} started following you`,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
      console.error('Error sending follow notification:', error);
    }
  });

/**
 * Send notification for new messages
 */
export const sendMessageNotification = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const messageData = snap.data();
    const senderId = messageData.senderId;
    const receiverId = messageData.receiverId;
    
    try {
      // Get sender's profile
      const senderDoc = await admin.firestore()
        .collection('users')
        .doc(senderId)
        .get();
        
      if (!senderDoc.exists) return;
      
      const senderData = senderDoc.data();
      
      // Get receiver's FCM tokens
      const receiverDoc = await admin.firestore()
        .collection('users')
        .doc(receiverId)
        .get();
        
      if (!receiverDoc.exists) return;
      
      const receiverData = receiverDoc.data();
      const fcmTokens = receiverData?.fcmTokens || [];
      
      if (fcmTokens.length === 0) return;
      
      // Create notification payload
      const messagePreview = messageData.message?.substring(0, 50) || 'Sent a message';
      const notification = {
        title: `Message from ${senderData?.name || 'Someone'}`,
        body: messagePreview,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: {
          type: 'message',
          senderId: senderId,
          senderName: senderData?.name || 'Unknown User',
          messageId: context.params.messageId,
          timestamp: Date.now().toString()
        }
      };
      
      // Send to all user's devices
      const promises = fcmTokens.map(async (token: string) => {
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
        } catch (error: any) {
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

      // Store notification in Firestore for in-app display
      await admin.firestore()
        .collection('notifications')
        .add({
          userId: receiverId,
          receiverId: receiverId,
          type: 'message',
          fromUserId: senderId,
          fromUserName: senderData?.name || 'Unknown User',
          fromUserPhoto: senderData?.photoURL || null,
          message: messagePreview,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            messageId: context.params.messageId
          }
        });
      
    } catch (error) {
      console.error('Error sending message notification:', error);
    }
  });

/**
 * Clean up old notifications (runs daily)
 */
export const cleanupOldNotifications = functions.pubsub
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
      
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  });