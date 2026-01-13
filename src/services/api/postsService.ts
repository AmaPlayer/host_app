import { supabase } from '../../lib/supabase';
import type { Post, CreatePostData, Like, Comment as PostComment, MediaType } from '../../types/models/post';
import { storageService } from '../storage';
import userService from './userService';

interface PostsQueryOptions {
  limit?: number;
  page?: number;
  currentUserId?: string;
  userId?: string;
  startAfter?: any;
  includeEngagementMetrics?: boolean;
}

/**
 * Supabase implementation of PostsService
 */
class PostsService {

  /**
   * Get paginated posts with engagement status for current user
   */
  async getPosts(options: PostsQueryOptions = {}): Promise<{ posts: Post[]; hasMore: boolean; total?: number; lastDocument?: any }> {
    try {
      const { limit = 20, page = 0, currentUserId, userId } = options;
      const offset = page * limit;

      let query = supabase
        .from('posts')
        .select(`
          *,
          user:users!user_id (
            uid, display_name, photo_url, role, is_verified
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (userId) {
        // We need to resolve Firebase UID to Supabase ID if the passed userId is a UID
        // Assuming userId passed is Firebase UID for consistency with the rest of the app
        const { data: user } = await supabase.from('users').select('id').eq('uid', userId).maybeSingle();
        if (user) {
          query = query.eq('user_id', user.id);
        } else {
          return { posts: [], hasMore: false, lastDocument: null };
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) {
        return { posts: [], hasMore: false, lastDocument: null };
      }

      // Batch fetch engagement status (isLiked)
      let likedPostIds = new Set<string>();
      if (currentUserId) {
        const { data: user } = await supabase.from('users').select('id').eq('uid', currentUserId).maybeSingle();
        if (user) {
          const postIds = data.map(p => p.id);
          const { data: likes } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds);

          if (likes) {
            likes.forEach(l => likedPostIds.add(l.post_id));
          }
        }
      }

      // Map posts
      const posts = await Promise.all(data.map(async (row: any) => {
        return this.mapSupabasePostToModel(row, likedPostIds.has(row.id));
      }));

      const lastDocument = posts.length > 0 ? posts[posts.length - 1] : null;

      return {
        posts,
        hasMore: data.length === limit,
        lastDocument
      };
    } catch (error) {
      console.error('PostsService.getPosts error:', error);
      throw error;
    }
  }

  /**
   * Get feed posts (posts from following + friends + self + REPOSTS)
   */
  async getFeedPosts(userId: string, followingList: string[] = [], limit: number = 20, startAfter?: any): Promise<Post[]> {
    try {
      // 1. Get current user's internal ID
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).maybeSingle();
      if (!user) return [];

      // 2. Get list of users to fetch posts from
      const { data: following } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];

      const { data: friends1 } = await supabase
        .from('friendships')
        .select('user2_id')
        .eq('user1_id', user.id)
        .eq('status', 'active');

      const { data: friends2 } = await supabase
        .from('friendships')
        .select('user1_id')
        .eq('user2_id', user.id)
        .eq('status', 'active');

      const friendIds = [
        ...(friends1?.map(f => f.user2_id) || []),
        ...(friends2?.map(f => f.user1_id) || [])
      ];

      // Combine all IDs (Self + Following + Friends)
      const targetUserIds = [...new Set([user.id, ...followingIds, ...friendIds])];

      // 3. Query POSTS - MODIFIED TO BE GLOBAL
      let query = supabase
        .from('posts')
        .select(`
          *,
          user:users!user_id (
            uid, display_name, photo_url, role, is_verified
          )
        `)
        // Filter removed to show global feed
        // .in('user_id', targetUserIds) 
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply pagination cursor if provided
      if (startAfter) {
        // If startAfter is a full post object, use createdAt
        const cursorValues = (startAfter as Post).createdAt ? [(startAfter as Post).createdAt] :
          (startAfter as any).created_at ? [(startAfter as any).created_at] : null;

        if (cursorValues) {
          query = query.lt('created_at', cursorValues[0]);
        }
      }

      const { data: postsData, error: postsError } = await query;

      if (postsError) throw postsError;

      // 4. Query REPOSTS - Keep strictly social for now or ignore?
      // For a global feed, reposts are less relevant unless we have a global repost view.
      // Let's keep potential social reposts but prioritize global content
      let repostsQuery = supabase
        .from('repost_feed_view')
        .select('*')
        .in('sharer_id', targetUserIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (startAfter) {
        const cursorValues = (startAfter as Post).createdAt ? [(startAfter as Post).createdAt] :
          (startAfter as any).created_at ? [(startAfter as any).created_at] : null;
        if (cursorValues) {
          repostsQuery = repostsQuery.lt('created_at', cursorValues[0]);
        }
      }

      const { data: repostsData, error: repostsError } = await repostsQuery;

      if (repostsError) throw repostsError;

      // 5. Batch fetch liked status for ALL posts (regular + original posts of reposts)
      const allPostIds = new Set<string>();
      postsData?.forEach(p => allPostIds.add(p.id));
      repostsData?.forEach(r => {
        if (r.original_post_id) allPostIds.add(r.original_post_id);
      });

      let likedPostIds = new Set<string>();
      if (allPostIds.size > 0) {
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', Array.from(allPostIds));

        if (likes) {
          likes.forEach(l => likedPostIds.add(l.post_id));
        }
      }

      // 6. Map Regular Posts
      const mappedPosts = await Promise.all((postsData || []).map(row => this.mapSupabasePostToModel(row, likedPostIds.has(row.id))));

      // 7. Map Reposts
      const mappedReposts = (repostsData || []).map(r => this.mapRepostToPostModel(r, likedPostIds.has(r.original_post_id)));

      // 8. Merge and Sort by created_at (Prioritize Reposts if they match global timeline? For now just mix)
      const combined = [...mappedPosts, ...mappedReposts].sort((a, b) => {
        const dateA = new Date(a.createdAt as string).getTime();
        const dateB = new Date(b.createdAt as string).getTime();
        return dateB - dateA;
      });

      return combined.slice(0, limit);

    } catch (error) {
      console.error('PostsService.getFeedPosts error:', error);
      return []; // Return empty on error to handle gracefully
    }
  }

  /**
   * Update share count and metadata
   */
  async updateShare(postId: string, userId: string, shareType: 'friends' | 'feeds' | 'groups', isAdding: boolean): Promise<void> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).maybeSingle();
      if (!user) throw new Error('User not found');

      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('metadata')
        .eq('id', postId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentMetadata = post.metadata || {};
      const shareBreakdown = currentMetadata.shareBreakdown || { friends: 0, feeds: 0, groups: 0 };

      if (isAdding) {
        const { error: insertError } = await supabase
          .from('post_shares')
          .insert({ post_id: postId, user_id: user.id });

        if (insertError && insertError.code !== '23505') throw insertError;
        shareBreakdown[shareType] = (shareBreakdown[shareType] || 0) + 1;
      } else {
        const { error: deleteError } = await supabase
          .from('post_shares')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
        shareBreakdown[shareType] = Math.max(0, (shareBreakdown[shareType] || 0) - 1);
      }

      const newMetadata = {
        ...currentMetadata,
        shareBreakdown,
        lastSharedAt: isAdding ? new Date().toISOString() : currentMetadata.lastSharedAt
      };

      const { error: updateError } = await supabase
        .from('posts')
        .update({ metadata: newMetadata })
        .eq('id', postId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('PostsService.updateShare error:', error);
      throw error;
    }
  }

  /**
   * Create a new post
   */
  async createPost(postData: CreatePostData, currentUserId?: string): Promise<Post> {
    try {
      const uid = currentUserId || postData.userId;
      let mediaUrl = null;
      let mediaMetadata = null;
      let mediaType = 'text';

      if (postData.mediaFile) {
        const file = postData.mediaFile;
        const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`; // Sanitize filename
        const path = `posts/${filename}`;

        // Upload to R2
        const result = await storageService.uploadFile(path, file);
        mediaUrl = result.url;

        mediaMetadata = {
          size: file.size,
          type: file.type,
          name: file.name,
          uploadedAt: new Date().toISOString(),
          path: path // Store R2 path for easier deletion
        };

        if (file.type.startsWith('video/')) mediaType = 'video';
        else if (file.type.startsWith('image/')) mediaType = 'image';
      }

      const { data: user } = await supabase.from('users').select('id').eq('uid', uid).maybeSingle();
      if (!user) throw new Error('User not found');

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: postData.caption,
          media_url: mediaUrl,
          media_type: mediaType,
          location: postData.location,
          visibility: postData.visibility || 'public',
          tags: postData.tags || [],
          metadata: {
            mediaMetadata,
            type: mediaType,
            duration: postData.duration
          }
        })
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url)
        `)
        .maybeSingle();

      if (error) throw error;

      return this.mapSupabasePostToModel(post, false);
    } catch (error) {
      console.error('PostsService.createPost error:', error);
      throw error;
    }
  }

  /**
   * Update post
   */
  async updatePost(
    postId: string,
    updates: { caption?: string; visibility?: 'public' | 'friends' | 'private' },
    currentUserId: string
  ): Promise<Post> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', currentUserId).maybeSingle();
      if (!user) throw new Error('User not found');

      const { data: post, error } = await supabase
        .from('posts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .eq('user_id', user.id)
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url)
        `)
        .maybeSingle();

      if (error) throw error;
      if (!post) throw new Error('Post not found or unauthorized');

      // Check like status
      const { data: like } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      return this.mapSupabasePostToModel(post, !!like);
    } catch (error) {
      console.error('PostsService.updatePost error:', error);
      throw error;
    }
  }

  /**
   * Delete post
   */
  async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).maybeSingle();
      if (!user) throw new Error('User not found');

      // Check ownership
      const { data: post } = await supabase
        .from('posts')
        .select('user_id, media_url')
        .eq('id', postId)
        .maybeSingle();

      if (!post) throw new Error('Post not found');
      if (post.user_id !== user.id) throw new Error('Unauthorized to delete this post');

      // Delete media from storage if exists
      if (post.media_url) {
        try {
          // If we have the path in metadata (ideal), use it. 
          // Otherwise try to derive it or delete by URL if service supports it.
          // For now, if we don't have metadata.path, we might need to parse URL or skip.
          // Since we just added path to metadata, old posts might fail to delete media nicely unless we fallback.

          let storagePath = null;
          // Query again to get metadata if needed, but select didn't fetch it above.
          // Let's rely on valid URL for now assuming R2 service can handle full URL or we fallback.

          await storageService.deleteFile(post.media_url);
        } catch (e) {
          console.warn('Failed to delete media from storage', e);
        }
      }

      // Delete from DB
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('PostsService.deletePost error:', error);
      throw error;
    }
  }

  /**
   * Toggle Like
   */
  async toggleLike(
    postId: string,
    currentUserId: string,
    userInfo?: { displayName?: string; photoURL?: string | null; email?: string | null },
    intent?: 'like' | 'unlike'
  ): Promise<{ liked: boolean; likesCount: number }> {
    try {
      let { data: user } = await supabase.from('users').select('id').eq('uid', currentUserId).maybeSingle();

      // JIT Fix: If user missing, try to create them via ensureUserExists
      if (!user) {
        console.warn(`toggleLike: User ${currentUserId} not found in Supabase, attempting JIT creation...`);
        try {
          // Try to get Firebase Auth user for email if not in userInfo
          let email = userInfo?.email;
          if (!email) {
            try {
              const { auth } = await import('../../lib/firebase');
              const currentAuthUser = auth.currentUser;
              if (currentAuthUser?.uid === currentUserId) {
                email = currentAuthUser.email;
              }
            } catch (authError) {
              console.warn('Could not get email from Firebase Auth:', authError);
            }
          }

          const syncedUser = await userService.ensureUserExists(currentUserId, {
            displayName: userInfo?.displayName || 'User',
            photoURL: userInfo?.photoURL,
            email: email || '', // Will be converted to unique placeholder if empty
            role: 'athlete'
          });
          user = { id: syncedUser.id };
        } catch (syncError) {
          console.error('toggleLike: Failed to JIT sync user:', syncError);
          throw new Error('User not found and sync failed');
        }
      }

      if (!user) throw new Error('User not found');

      const { data: existing } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      let liked: boolean;
      if (existing) {
        if (intent === 'like') {
          // Already liked, do nothing
          liked = true;
        } else {
          await supabase.from('post_likes').delete().eq('id', existing.id);
          liked = false;
        }
      } else {
        if (intent === 'unlike') {
          // Already unliked, do nothing
          liked = false;
        } else {
          await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
          liked = true;
        }
      }

      const { data: post } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .maybeSingle();

      return {
        liked,
        likesCount: post?.likes_count || 0
      };
    } catch (error) {
      console.error('PostsService.toggleLike error:', error);
      throw error;
    }
  }

  /**
   * Add Comment
   */
  async addComment(
    postId: string,
    textOrCommentData: string | { text: string; userId: string; userDisplayName?: string; userPhotoURL?: string },
    currentUserId?: string
  ): Promise<PostComment> {
    try {
      let text: string;
      let userId: string;
      let userDisplayName: string | undefined;
      let userPhotoURL: string | null | undefined;

      if (typeof textOrCommentData === 'string') {
        text = textOrCommentData;
        userId = currentUserId!;
      } else {
        text = textOrCommentData.text;
        userId = textOrCommentData.userId;
        userDisplayName = textOrCommentData.userDisplayName;
        userPhotoURL = textOrCommentData.userPhotoURL;
      }

      let { data: user } = await supabase.from('users').select('id, display_name, photo_url').eq('uid', userId).maybeSingle();

      // JIT Fix: If user missing, try to create them via ensureUserExists
      if (!user) {
        console.warn(`addComment: User ${userId} not found in Supabase, attempting JIT creation...`);
        try {
          // Try to get Firebase Auth user for email
          let email = '';
          try {
            const { auth } = await import('../../lib/firebase');
            const currentAuthUser = auth.currentUser;
            if (currentAuthUser?.uid === userId) {
              email = currentAuthUser.email || '';
            }
          } catch (authError) {
            console.warn('Could not get email from Firebase Auth:', authError);
          }

          const syncedUser = await userService.ensureUserExists(userId, {
            displayName: userDisplayName || 'User',
            photoURL: userPhotoURL,
            email: email, // Will be converted to unique placeholder if empty
            role: 'athlete'
          });
          user = {
            id: syncedUser.id,
            display_name: syncedUser.displayName,
            photo_url: syncedUser.photoURL
          };
        } catch (syncError) {
          console.error('addComment: Failed to JIT sync user:', syncError);
          throw new Error('User not found and sync failed');
        }
      }

      if (!user) throw new Error('User not found');

      const { data: comment, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          text
        })
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url)
        `)
        .maybeSingle();

      if (error) throw error;

      return {
        id: comment.id,
        text: comment.text,
        userId: comment.user.uid,
        userDisplayName: comment.user.display_name || userDisplayName || 'Unknown',
        userPhotoURL: comment.user.photo_url || userPhotoURL || null,
        timestamp: comment.created_at,
        likes: [],
        replies: []
      };
    } catch (error) {
      console.error('PostsService.addComment error:', error);
      throw error;
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(postId: string, commentId: string, userId: string): Promise<void> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).maybeSingle();
      if (!user) throw new Error('User not found');

      // Note: We ignore postId in the delete query because ID is unique, 
      // but we could enforce it if needed.
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('PostsService.deleteComment error:', error);
      throw error;
    }
  }

  /**
   * Edit comment
   */
  async editComment(postId: string, commentId: string, userId: string, newText: string): Promise<void> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).maybeSingle();
      if (!user) throw new Error('User not found');

      const { error } = await supabase
        .from('post_comments')
        .update({ text: newText })
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('PostsService.editComment error:', error);
      throw error;
    }
  }

  /**
   * Toggle comment like
   */
  async toggleCommentLike(postId: string, commentId: string, userId: string): Promise<void> {
    console.warn('Like comment not implemented yet in Supabase schema');
    // Placeholder to prevent crash, but does nothing
    return Promise.resolve();
  }

  /**
   * Get single post by ID
   */
  async getPostById(postId: string, currentUserId?: string): Promise<Post | null> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url, role, is_verified)
        `)
        .eq('id', postId)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      let isLiked = false;
      if (currentUserId) {
        const { data: user } = await supabase.from('users').select('id').eq('uid', currentUserId).maybeSingle();
        if (user) {
          const { data: like } = await supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
          isLiked = !!like;
        }
      }

      return this.mapSupabasePostToModel(data, isLiked);
    } catch (error) {
      console.error('PostsService.getPostById error:', error);
      return null;
    }
  }

  /**
   * Get posts by specific user
   */
  /**
   * Get posts by specific user (including Reposts)
   */
  async getUserPosts(userId: string, limit: number = 20, currentUserId?: string): Promise<Post[]> {
    try {
      // 1. Resolve Firebase UID to Supabase ID
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).maybeSingle();
      if (!user) return []; // User must exist

      // 2. Fetch Regular Posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url, role, is_verified)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      // 3. Fetch Reposts using the View
      const { data: repostsData } = await supabase
        .from('repost_feed_view')
        .select('*')
        .eq('sharer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      // 4. Batch fetch liked status for ALL posts (regular + original posts of reposts)
      const allPostIds = new Set<string>();
      postsData?.forEach(p => allPostIds.add(p.id));
      repostsData?.forEach(r => {
        if (r.original_post_id) allPostIds.add(r.original_post_id);
      });

      let likedPostIds = new Set<string>();
      if (currentUserId && allPostIds.size > 0) {
        const { data: currentUser } = await supabase.from('users').select('id').eq('uid', currentUserId).maybeSingle();
        if (currentUser) {
          const { data: likes } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', currentUser.id)
            .in('post_id', Array.from(allPostIds));
          likes?.forEach(l => likedPostIds.add(l.post_id));
        }
      }

      // 5. Map Regular Posts
      const mappedPosts = await Promise.all((postsData || []).map(p => this.mapSupabasePostToModel(p, likedPostIds.has(p.id))));

      // 6. Map Reposts
      const mappedReposts = (repostsData || []).map(r => this.mapRepostToPostModel(r, likedPostIds.has(r.original_post_id)));

      // 7. Merge and Sort
      const combined = [...mappedPosts, ...mappedReposts].sort((a, b) => {
        const dateA = new Date(a.createdAt as string).getTime();
        const dateB = new Date(b.createdAt as string).getTime();
        return dateB - dateA;
      });

      return combined.slice(0, limit);
    } catch (error) {
      console.error('PostsService.getUserPosts error:', error);
      return [];
    }
  }

  /**
   * Get trending posts
   */
  async getTrendingPosts(limit: number = 20, currentUserId?: string): Promise<Post[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url, role, is_verified)
        `)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('likes_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      let likedPostIds = new Set<string>();
      if (currentUserId && data && data.length > 0) {
        const { data: user } = await supabase.from('users').select('id').eq('uid', currentUserId).single();
        if (user) {
          const postIds = data.map(p => p.id);
          const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds);
          likes?.forEach(l => likedPostIds.add(l.post_id));
        }
      }

      return Promise.all((data || []).map(row => this.mapSupabasePostToModel(row, likedPostIds.has(row.id))));
    } catch (error) {
      console.error('PostsService.getTrendingPosts error:', error);
      return [];
    }
  }

  /**
   * Alias for getPosts
   */
  async getPostsWithEngagement(options: PostsQueryOptions = {}): Promise<{ posts: Post[]; hasMore: boolean; total?: number; lastDocument?: any }> {
    return this.getPosts(options);
  }

  /**
   * Search Posts
   */
  async searchPosts(queryStr: string, limit: number = 20, currentUserId?: string): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
           *,
           user:users!user_id (uid, display_name, photo_url)
        `)
        .textSearch('caption', queryStr)
        .limit(limit);

      if (error) throw error;

      // Simplification: Not checking likes for search results to save bandwidth/logic complexity
      // unless strictly needed.
      return Promise.all((data || []).map(row => this.mapSupabasePostToModel(row, false)));
    } catch (error) {
      console.error('PostsService.searchPosts error:', error);
      return [];
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private async mapSupabasePostToModel(row: any, isLiked: boolean): Promise<Post> {
    // Get users who shared this post (Optional: load lazily if performance issues arise)
    // For now, returning empty or limited shares
    const shares: string[] = []; // Implementing full share fetching might be heavy for lists

    return {
      id: row.id,
      userId: row.user?.uid || '',
      userDisplayName: row.user?.display_name || 'Unknown',
      userPhotoURL: row.user?.photo_url || null,
      userRole: row.user?.role || 'athlete', // Map the role from the user join
      // Map banner fields
      userSport: (() => {
        // 1. Try athlete_profile join (most accurate for athletes)
        const athleteProfile = Array.isArray(row.user?.athlete_profile) ? row.user?.athlete_profile[0] : row.user?.athlete_profile;
        if (athleteProfile?.sports) {
          // Handle text[] array from DB
          if (Array.isArray(athleteProfile.sports) && athleteProfile.sports.length > 0) return athleteProfile.sports[0];
        }

        // 2. Fallback to users table field
        if (Array.isArray(row.user?.sports) && row.user.sports.length > 0) return row.user.sports[0];
        if (typeof row.user?.sports === 'string') return row.user.sports;

        return undefined;
      })(),
      userPosition: (() => {
        const athleteProfile = Array.isArray(row.user?.athlete_profile) ? row.user?.athlete_profile[0] : row.user?.athlete_profile;
        return athleteProfile?.position || row.user?.position_name;
      })(),
      userPlayerType: row.user?.player_type,
      userOrganizationType: row.user?.organization_type,
      userSpecializations: row.user?.specializations,
      caption: row.caption,
      mediaUrl: row.media_url,
      mediaType: row.media_type as MediaType,
      timestamp: row.created_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      likesCount: row.likes_count || 0,
      commentsCount: row.comments_count || 0,
      sharesCount: row.shares_count || 0,
      likes: [], // We don't load full like list for feed
      comments: [], // We don't load comments for feed
      shares: shares,
      visibility: row.visibility,
      location: row.location,
      tags: row.tags || [],
      isActive: true,
      isLiked,
      metadata: row.metadata
    } as Post;
  }

  private mapRepostToPostModel(row: any, isLiked: boolean): Post {
    const originalPost: Post = {
      id: row.original_post_id,
      userId: row.original_author_id,
      userDisplayName: row.original_author_name,
      userPhotoURL: row.original_author_photo_url,
      userRole: row.original_author_role as any,
      caption: row.original_post_caption || '',
      mediaUrl: row.original_post_media_url,
      mediaType: row.original_post_media_type as MediaType,
      timestamp: row.original_post_created_at,
      createdAt: row.original_post_created_at,
      updatedAt: row.original_post_created_at,
      likesCount: row.original_post_likes || 0,
      commentsCount: row.original_post_comments || 0,
      sharesCount: row.original_post_shares || 0,
      likes: [],
      comments: [],
      shares: [],
      visibility: 'public',
      isActive: true,
      isLiked: isLiked
    } as Post;

    return {
      id: row.id,
      userId: row.sharer_id,
      userDisplayName: row.sharer_name,
      userPhotoURL: row.sharer_photo_url,
      userRole: row.sharer_role as any,
      caption: row.message || '',
      timestamp: row.created_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      likesCount: row.likes_count,
      commentsCount: row.comments_count,
      sharesCount: 0,
      likes: [],
      comments: [],
      shares: [],
      visibility: row.privacy as any,
      isActive: true,
      isRepost: true,
      sharerId: row.sharer_id,
      sharerName: row.sharer_name,
      sharerPhotoURL: row.sharer_photo_url,
      originalPostId: row.original_post_id,
      originalPost: originalPost
    } as Post;
  }
}

export default new PostsService();
