import { supabase } from '../lib/supabase';
import { messaging, getToken, onMessage } from '../lib/firebase';
import { Messaging } from 'firebase/messaging';

type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'message'
  | 'story_like'
  | 'story_view'
  | 'story_comment'
  | 'friend_request'
  | 'share_to_friend'
  | 'share_to_group'
  | 'post_shared'
  | 'connection_request'
  | 'connection_accepted'
  | 'connection_rejected';

interface NotificationData {
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
  type: NotificationType;
  message: string;
  title?: string;
  postId?: string | null;
  storyId?: string | null;
  momentId?: string | null;
  groupId?: string;
  url?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

class NotificationService {
  private token: string | null = null;
  private isSupported: boolean = false;
  private initialized: boolean = false;

  async initialize(userId?: string): Promise<void> {
    if (this.initialized) return;
    try {
      this.isSupported = 'Notification' in window && 'serviceWorker' in navigator && !!messaging;
      if (!this.isSupported) {
        this.initialized = true;
        return;
      }
      const permission = Notification.permission;
      if (permission === 'granted') {
        await this.getAndSaveToken(userId || null);
      }
      this.setupForegroundListener();
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      this.initialized = true;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    try {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          await this.getAndSaveToken();
        }
        return permission;
      }
      return Notification.permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  async getAndSaveToken(userId: string | null = null): Promise<string | null> {
    try {
      if (!messaging) return null;
      const vapidKey = process.env.REACT_APP_VAPID_KEY;
      if (!vapidKey || vapidKey === 'your-vapid-key-here') return null;

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return null;

      const fcmToken = await getToken(messaging as Messaging, {
        vapidKey,
        serviceWorkerRegistration: registration
      });

      if (fcmToken) {
        this.token = fcmToken;
        if (userId) {
          await this.saveTokenToDatabase(userId, fcmToken);
        }
        return fcmToken;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async saveTokenToDatabase(userId: string, token: string): Promise<void> {
    try {
      // Get existing user settings/metadata
      const { data: user } = await supabase.from('users').select('settings').eq('uid', userId).single();
      if (!user) return;

      const settings = user.settings || {};
      const tokens = settings.fcm_tokens || [];
      
      if (!tokens.includes(token)) {
        tokens.push(token);
        await supabase
          .from('users')
          .update({ 
            settings: { ...settings, fcm_tokens: tokens },
            updated_at: new Date().toISOString()
          })
          .eq('uid', userId);
      }
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  setupForegroundListener(): void {
    if (!messaging) return;
    onMessage(messaging as Messaging, (payload) => {
      this.showCustomNotification({
        title: payload.notification?.title || 'AmaPlayer',
        body: payload.notification?.body || 'You have a new notification',
        icon: '/logo192.png',
        data: payload.data
      });
    });
  }

  showCustomNotification({ title, body, icon, data }: { title: string; body: string; icon: string; data?: any }): void {
    if (!this.isSupported) return;
    const n = new Notification(title, { body, icon, data });
    n.onclick = () => {
      window.focus();
      if (data?.url) window.location.href = data.url;
      n.close();
    };
  }

  async sendNotificationToUser(receiverUserId: string, notification: NotificationData): Promise<void> {
    try {
      // 1. Resolve users
      const { data: sender } = await supabase.from('users').select('id').eq('uid', notification.senderId).single();
      const { data: receiver } = await supabase.from('users').select('id').eq('uid', receiverUserId).single();
      
      if (!receiver) return;

      // 2. Insert into notifications table
      await supabase.from('notifications').insert({
        receiver_id: receiver.id,
        sender_id: sender?.id || null,
        type: notification.type,
        message: notification.message,
        content_id: (notification.postId || notification.storyId || notification.momentId) as any,
        is_read: false,
        created_at: new Date().toISOString()
      });

      // 3. Push Logic (Triggered by Edge Function in real app, or here if we have tokens)
      // For now, we rely on the DB entry for in-app notifications.
    } catch (error) {
      console.error('❌ Error sending notification:', error);
    }
  }

  async enableNotifications(userId: string): Promise<boolean> {
    const permission = await this.requestPermission();
    if (permission === 'granted' && userId) {
      await this.getAndSaveToken(userId);
      return true;
    }
    return false;
  }

  async sendStoryLikeNotification(likerUid: string, likerName: string, likerPhoto: string, ownerUid: string, storyId: string, storyData?: any): Promise<void> {
    await this.sendLikeNotification(likerUid, likerName, likerPhoto, ownerUid, storyId, { contentType: 'story', ...storyData });
  }

  async sendStoryCommentNotification(uid: string, name: string, photo: string, ownerUid: string, storyId: string, text: string, storyData?: any): Promise<void> {
    if (uid === ownerUid) return;
    await this.sendNotificationToUser(ownerUid, {
      senderId: uid,
      senderName: name,
      senderPhotoURL: photo,
      type: 'story_comment',
      message: `${name} commented on your story: "${text.substring(0, 30)}..."`,
      storyId: storyId,
      url: `/story/${storyId}`
    });
  }

  // Simplified helpers that call sendNotificationToUser
  async sendLikeNotification(likerUid: string, likerName: string, likerPhoto: string, ownerUid: string, contentId: string, contentData: any): Promise<void> {
    if (likerUid === ownerUid) return;
    const type = contentData?.contentType || 'post';
    await this.sendNotificationToUser(ownerUid, {
      senderId: likerUid,
      senderName: likerName,
      senderPhotoURL: likerPhoto,
      type: 'like',
      message: `${likerName} liked your ${type}`,
      postId: type === 'post' ? contentId : null,
      momentId: type === 'moment' ? contentId : null,
      url: type === 'moment' ? `/moments/${contentId}` : `/post/${contentId}`
    });
  }

  async sendCommentNotification(uid: string, name: string, photo: string, ownerUid: string, postId: string, text: string): Promise<void> {
    if (uid === ownerUid) return;
    await this.sendNotificationToUser(ownerUid, {
      senderId: uid,
      senderName: name,
      senderPhotoURL: photo,
      type: 'comment',
      message: `${name} commented: "${text.substring(0, 30)}..."`,
      postId: postId,
      url: `/post/${postId}`
    });
  }

  async sendFollowNotification(uid: string, name: string, photo: string, followedUid: string): Promise<void> {
    await this.sendNotificationToUser(followedUid, {
      senderId: uid,
      senderName: name,
      senderPhotoURL: photo,
      type: 'follow',
      message: `${name} started following you`,
      url: `/profile/${uid}`
    });
  }
  
  // Add other notification methods as needed (story_like, connection_request, etc.)
  async sendConnectionRequestNotification(
    recipientId: string,
    senderName: string,
    senderRole: string,
    senderPhotoURL: string,
    connectionType: string
  ): Promise<void> {
    await this.sendNotificationToUser(recipientId, {
      senderId: 'system', 
      senderName,
      senderPhotoURL,
      type: 'connection_request',
      message: `${senderName} wants to connect with you`,
      data: { connectionType, senderRole }
    });
  }
}

export default new NotificationService();
