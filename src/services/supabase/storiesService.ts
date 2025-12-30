import { supabase } from '../../lib/supabase';
import { Story } from '../../types/models/story';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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
   * Create a new story
   */
  static async createStory(
    userId: string,
    userDisplayName: string, // Unused in normalized DB but kept for signature
    userPhotoURL: string | null, // Unused in normalized DB but kept for signature
    mediaFile: File,
    caption: string = '',
    mediaType: 'image' | 'video' = 'image'
  ): Promise<StoryCreationResult> {
    try {
      // 1. Upload media (Firebase Storage)
      const mediaUrl = await this.uploadStoryMedia(mediaFile, userId, mediaType);
      
      let thumbnail: string | null = null;
      if (mediaType === 'video') {
        thumbnail = await this.generateVideoThumbnail(mediaFile);
      }
      
      // 2. Get user internal ID
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) throw new Error('User not found');

      // 3. Calculate expiry
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours

      // 4. Insert into Supabase
      const { data: story, error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          caption: caption.trim(),
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: story.id,
        userId: userId,
        userDisplayName,
        userPhotoURL: userPhotoURL || '',
        mediaType,
        mediaUrl,
        thumbnail,
        caption: story.caption,
        timestamp: story.created_at,
        expiresAt: story.expires_at,
        viewCount: 0,
        viewers: [],
        isHighlight: false,
        highlightId: null,
        sharingEnabled: true,
        publicLink: `${window.location.origin}/story/${story.id}`
      };
    } catch (error) {
      console.error('❌ Error creating story:', error);
      throw error;
    }
  }
  
  static async uploadStoryMedia(mediaFile: File, userId: string, mediaType: 'image' | 'video'): Promise<string> {
    try {
      const safeFileName = mediaFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageRef = ref(storage, `stories/${mediaType}s/${userId}/${Date.now()}-${safeFileName}`);
      const uploadResult = await uploadBytes(storageRef, mediaFile);
      return await getDownloadURL(uploadResult.ref);
    } catch (error) {
      console.error('❌ Error uploading story media:', error);
      throw error;
    }
  }
  
  static async generateVideoThumbnail(_videoFile: File): Promise<string> {
    return '/assets/placeholders/default-post.svg';
  }
  
  /**
   * Get active stories (not expired)
   */
  static async getActiveStories(): Promise<Story[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url)
        `)
        .gt('expires_at', now)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapSupabaseStoryToModel);
    } catch (error) {
      console.error('❌ Error fetching active stories:', error);
      return [];
    }
  }
  
  /**
   * Get stories by user ID
   */
  static async getUserStories(userId: string): Promise<Story[]> {
    try {
      const now = new Date().toISOString();
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) return [];

      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url)
        `)
        .eq('user_id', user.id)
        .gt('expires_at', now)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapSupabaseStoryToModel);
    } catch (error) {
      console.error('❌ Error fetching user stories:', error);
      return [];
    }
  }
  
  /**
   * View a story
   */
  static async viewStory(storyId: string, viewerId: string): Promise<void> {
    // console.warn('viewStory not implemented in Supabase schema (missing viewers table)');
    // Placeholder
  }
  
  /**
   * Delete a story
   */
  static async deleteStory(storyId: string, userId: string): Promise<void> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) throw new Error('User not found');

      const { data: story } = await supabase.from('stories').select('user_id, media_url').eq('id', storyId).single();
      if (!story) throw new Error('Story not found');
      if (story.user_id !== user.id) throw new Error('Not authorized');

      // Delete media
      if (story.media_url) {
        try {
          const mediaRef = ref(storage, story.media_url);
          await deleteObject(mediaRef);
        } catch (e) {
          console.warn('Failed to delete media', e);
        }
      }

      const { error } = await supabase.from('stories').delete().eq('id', storyId);
      if (error) throw error;
    } catch (error) {
      console.error('❌ Error deleting story:', error);
      throw error;
    }
  }
  
  /**
   * Get expired stories
   */
  static async getExpiredStories(): Promise<Story[]> {
    // Not implemented for now (admin/cleanup task)
    return [];
  }
  
  /**
   * Real-time listener
   */
  static onActiveStoriesUpdate(callback: (stories: Story[]) => void): () => void {
    // Realtime subscriptions are more complex in Supabase client for filtered queries
    // Returning dummy unsubscribe
    console.warn('onActiveStoriesUpdate not implemented for Supabase');
    return () => {};
  }

  // Mapper
  private static mapSupabaseStoryToModel(row: any): Story {
    return {
      id: row.id,
      userId: row.user?.uid || '',
      userDisplayName: row.user?.display_name || 'Unknown',
      userPhotoURL: row.user?.photo_url || '',
      mediaType: row.media_type,
      mediaUrl: row.media_url,
      thumbnail: null, // Not stored in schema currently
      caption: row.caption,
      timestamp: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      viewCount: 0,
      viewers: [],
      isHighlight: false,
      highlightId: null,
      sharingEnabled: true,
      publicLink: `${window.location.origin}/story/${row.id}`
    };
  }
}

export class HighlightsService {
  static async createHighlight(userId: string, title: string, coverImage: string, storyIds: string[] = []): Promise<Highlight> {
    throw new Error('Highlights not supported in Supabase schema yet');
  }
  
  static async getUserHighlights(userId: string): Promise<Highlight[]> {
    return [];
  }
  
  static async addStoryToHighlight(highlightId: string, storyId: string): Promise<void> {}
  
  static async removeStoryFromHighlight(highlightId: string, storyId: string): Promise<void> {}
}

export default StoriesService;
