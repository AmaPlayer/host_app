import { supabase } from '../../lib/supabase';
import { Story } from '../../types/models/story';
import { db, storage } from '../../lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { storageService } from '../storage';

interface StoryCreationResult extends Omit<Story, 'timestamp' | 'expiresAt'> {
  timestamp: any;
  expiresAt: any;
}

interface Highlight {
  id: string;
  userId: string;
  title: string;
  coverImage: string;
  storyIds: string[];
  createdAt: any;
  updatedAt: any;
  isPublic: boolean;
}

export class StoriesService {

  /**
   * Create a new story (Firestore)
   */
  static async createStory(
    userId: string,
    userDisplayName: string,
    userPhotoURL: string | null,
    mediaFile: File,
    caption: string = '',
    mediaType: 'image' | 'video' = 'image'
  ): Promise<StoryCreationResult> {
    try {
      // 1. Get user internal ID from Supabase (Required for FK)
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) throw new Error('User not found in Supabase');

      // 2. Upload media (Firebase Storage)
      const mediaUrl = await this.uploadStoryMedia(mediaFile, userId, mediaType);

      let thumbnail: string | null = null;
      if (mediaType === 'video') {
        thumbnail = await this.generateVideoThumbnail(mediaFile);
      }

      // 3. Generate UUID for consistency across Firestore & Supabase
      const storyId = this.uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000));

      // 4. Insert into Supabase (Shadow Record)
      const { error: supabaseError } = await supabase.from('stories').insert({
        id: storyId,
        user_id: user.id, // Foreign Key
        media_url: mediaUrl,
        media_type: mediaType,
        caption: caption.trim(),
        expires_at: expiresAt.toISOString()
        // created_at defaults to NOW()
      });

      if (supabaseError) {
        console.error('❌ Error creating Supabase story shadow record:', supabaseError);
        // We could abort here, but sticking to "Firestore First" philosophy for resilience? 
        // No, if Supabase fails, Foreign Keys for Views will fail. We should probably abort or tolerate partial failure.
        // Choosing to Log & Throw to ensure data consistency.
        throw new Error(`Failed to sync story to Supabase: ${supabaseError.message}`);
      }

      const storyData = {
        userId, // Firebase UID
        userDisplayName,
        userPhotoURL: userPhotoURL || '',
        mediaUrl,
        mediaType,
        thumbnail,
        caption: caption.trim(),
        timestamp: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        viewCount: 0,
        viewers: [],
        sharingEnabled: true
      };

      // 5. Insert into Firestore with same UUID
      await setDoc(doc(db, 'stories', storyId), storyData);

      return {
        id: storyId,
        ...storyData,
        timestamp: now, // Optimistic return
        expiresAt: expiresAt,
        isHighlight: false,
        highlightId: null,
        publicLink: `${window.location.origin}/story/${storyId}`
      };
    } catch (error) {
      console.error('❌ Error creating story:', error);
      throw error;
    }
  }

  static async uploadStoryMedia(mediaFile: File, userId: string, mediaType: 'image' | 'video'): Promise<string> {
    try {
      const safeFileName = mediaFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `stories/${mediaType}s/${userId}/${Date.now()}-${safeFileName}`;
      const result = await storageService.uploadFile(path, mediaFile);
      return result.url;
    } catch (error) {
      console.error('❌ Error uploading story media:', error);
      throw error;
    }
  }

  static async generateVideoThumbnail(_videoFile: File): Promise<string> {
    // Basic placeholder for now, could implement canvas generation later
    return '/assets/placeholders/default-post.svg';
  }

  /**
   * Get active stories (Firestore)
   */
  static async getActiveStories(): Promise<Story[]> {
    try {
      const now = Timestamp.now();
      const q = query(
        collection(db, 'stories'),
        where('expiresAt', '>', now),
        orderBy('expiresAt', 'asc') // Firestore requires index on expiresAt
      );

      const snapshot = await getDocs(q);
      const stories = snapshot.docs.map(doc => this.mapFirestoreStoryToModel(doc));

      // Sort by creation time (desc) in memory as secondary sort
      return stories.sort((a, b) => this.getTimeFromTimestamp(b.timestamp) - this.getTimeFromTimestamp(a.timestamp));
    } catch (error) {
      console.error('❌ Error fetching active stories:', error);
      return [];
    }
  }

  /**
   * Get stories by user ID (Firestore)
   */
  static async getUserStories(userId: string): Promise<Story[]> {
    try {
      const now = Timestamp.now();
      const q = query(
        collection(db, 'stories'),
        where('userId', '==', userId),
        where('expiresAt', '>', now),
        orderBy('expiresAt', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => this.mapFirestoreStoryToModel(doc))
        .sort((a, b) => this.getTimeFromTimestamp(b.timestamp) - this.getTimeFromTimestamp(a.timestamp));
    } catch (error) {
      console.error('❌ Error fetching user stories:', error);
      return [];
    }
  }

  /**
   * View a story (Hybrid: Supabase View + Firestore Counter)
   */
  static async viewStory(storyId: string, viewerUid: string): Promise<void> {
    try {
      // 1. Get user internal ID for Supabase
      const { data: user } = await supabase.from('users').select('id').eq('uid', viewerUid).single();

      // If user exists in Supabase
      if (user) {
        // 2. Validate Story ID format (Must be UUID for Supabase)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storyId);

        if (isUuid) {
          // 3. Insert into Supabase story_views
          const { error } = await supabase
            .from('story_views')
            .insert({
              story_id: storyId,
              viewer_id: user.id
            });

          if (error) {
            // Log but don't crash - likely FK constraint if story sync failed or delay
            console.warn('⚠️ Could not record story view in Supabase:', error.message);
          }
        } else {
          console.log('ℹ️ Skipping Supabase view tracking for legacy story ID (Not UUID):', storyId);
        }
      }

      // 3. Increment Counter in Firestore (Realtime UI)
      const storyRef = doc(db, 'stories', storyId);
      await updateDoc(storyRef, {
        viewCount: increment(1),
        // viewers: arrayUnion(viewerUid) // Optional if we want full list in Firestore
      });

    } catch (error) {
      console.error('❌ Error in viewStory:', error);
    }
  }

  // Helper to ensure compatibility
  private static uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Delete a story (Firestore)
   */
  static async deleteStory(storyId: string, userId: string): Promise<void> {
    try {
      const storyRef = doc(db, 'stories', storyId);
      const storySnap = await getDoc(storyRef);

      if (!storySnap.exists()) throw new Error('Story not found');
      const story = storySnap.data();

      if (story.userId !== userId) throw new Error('Not authorized');

      // Delete media
      if (story.mediaUrl) {
        try {
          await storageService.deleteFile(story.mediaUrl);
        } catch (e) {
          console.warn('Failed to delete media', e);
        }
      }

      // Delete from Firestore
      await deleteDoc(storyRef);

      // Try to delete from Supabase (shadow record) if it exists
      try {
        await supabase.from('stories').delete().eq('id', storyId);
      } catch (e) {
        // ignore
      }

    } catch (error) {
      console.error('❌ Error deleting story:', error);
      throw error;
    }
  }

  /**
   * Get expired stories (Not implemented)
   */
  static async getExpiredStories(): Promise<Story[]> {
    return [];
  }

  /**
   * Real-time listener (Firestore)
   */
  static onActiveStoriesUpdate(callback: (stories: Story[]) => void): () => void {
    const now = Timestamp.now();
    const q = query(
      collection(db, 'stories'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stories = snapshot.docs
        .map(doc => this.mapFirestoreStoryToModel(doc))
        .sort((a, b) => this.getTimeFromTimestamp(b.timestamp) - this.getTimeFromTimestamp(a.timestamp));

      callback(stories);
    }, (error) => {
      console.error('❌ Error in stories listener:', error);
    });

    return unsubscribe;
  }

  // Helper to extract numeric time from various timestamp formats
  private static getTimeFromTimestamp(timestamp: any): number {
    if (!timestamp) return 0;
    if (timestamp instanceof Date) return timestamp.getTime();
    if (typeof timestamp === 'object' && 'toDate' in timestamp) return timestamp.toDate().getTime();
    if (typeof timestamp === 'string') return new Date(timestamp).getTime();
    return 0;
  }

  /**
   * Toggle like on a story (Firestore)
   */
  static async toggleLike(storyId: string, userId: string, isLiked: boolean): Promise<{ likesCount: number; isLiked: boolean }> {
    try {
      const storyRef = doc(db, 'stories', storyId);

      if (isLiked) {
        // Unlike
        await updateDoc(storyRef, {
          likes: arrayRemove(userId),
          likesCount: increment(-1)
        });
        return { likesCount: -1, isLiked: false }; // Return change delta or absolute? Returning delta is safer for UI count
      } else {
        // Like
        await updateDoc(storyRef, {
          likes: arrayUnion(userId),
          likesCount: increment(1)
        });
        return { likesCount: 1, isLiked: true };
      }
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      throw error;
    }
  }

  /**
   * Get story comments (Firestore)
   */
  static async getStoryComments(storyId: string): Promise<any[]> {
    try {
      const commentsQuery = query(
        collection(db, 'storyComments'),
        where('storyId', '==', storyId)
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      return commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error fetching story comments:', error);
      return [];
    }
  }

  /**
   * Add a comment to a story (Firestore)
   */
  static async addComment(storyId: string, commentData: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'storyComments'), {
        storyId,
        ...commentData,
        timestamp: serverTimestamp() // Use server timestamp
      });
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding story comment:', error);
      throw error;
    }
  }

  /**
   * Delete a story comment (Firestore)
   */
  static async deleteComment(commentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'storyComments', commentId));
    } catch (error) {
      console.error('❌ Error deleting story comment:', error);
      throw error;
    }
  }

  // Mapper
  private static mapFirestoreStoryToModel(doc: any): Story {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      userDisplayName: data.userDisplayName,
      userPhotoURL: data.userPhotoURL,
      mediaType: data.mediaType,
      mediaUrl: data.mediaUrl,
      thumbnail: data.thumbnail,
      caption: data.caption,
      timestamp: data.timestamp?.toDate() || new Date(),
      expiresAt: data.expiresAt?.toDate() || new Date(),
      viewCount: data.viewCount || 0,
      viewers: data.viewers || [],
      likes: data.likes || [], // Ensure likes array exists
      likesCount: data.likesCount || 0,
      isHighlight: false,
      highlightId: null,
      sharingEnabled: data.sharingEnabled,
      publicLink: `${window.location.origin}/story/${doc.id}`
    };
  }
}

export class HighlightsService {
  static async createHighlight(userId: string, title: string, coverImage: string, storyIds: string[] = []): Promise<Highlight> {
    // throw new Error('Highlights not supported in Supabase schema yet'); 
    // Allowing placeholder return
    return {
      id: 'temp',
      userId,
      title,
      coverImage,
      storyIds,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: true
    };
  }

  static async getUserHighlights(userId: string): Promise<Highlight[]> {
    return [];
  }

  static async addStoryToHighlight(highlightId: string, storyId: string): Promise<void> { }

  static async removeStoryFromHighlight(highlightId: string, storyId: string): Promise<void> { }
}

export default StoriesService;
