import { db } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDoc,
  getCountFromServer
} from 'firebase/firestore';

export interface Notification {
  id: string;
  receiverId: string;
  senderId: string;
  senderName: string;
  type: string;
  message: string;
  timestamp: any;
  read: boolean;
  [key: string]: any;
}

export interface NotificationQueryOptions {
  limitCount?: number;
  onlyUnread?: boolean;
  afterTimestamp?: any;
}

export const notificationManagementService = {

  async getUserNotifications(userId: string, options: NotificationQueryOptions = {}): Promise<Notification[]> {
    try {
      let q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(options.limitCount || 20)
      );

      if (options.onlyUnread) {
        q = query(q, where('read', '==', false));
      }

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Normalize timestamp
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
        } as Notification;
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  async getNotification(notificationId: string): Promise<Notification | null> {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;
      const data = docSnap.data();
      return { id: docSnap.id, ...data } as Notification;
    } catch (e) {
      return null;
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all read:', error);
    }
  },

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  },

  async deleteAllRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId),
        where('read', '==', true)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },

  async deleteAllNotifications(userId: string): Promise<void> {
    try {
      // Deleting all might require multiple batches if count > 500
      // For simplicity in MVP, we delete fetched batch (up to 500)
      const q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId),
        limit(500)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  }
};

export default notificationManagementService;
