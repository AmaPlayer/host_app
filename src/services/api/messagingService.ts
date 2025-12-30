
import { supabase } from '../../lib/supabase';
import { Message, ChatConversation, SendMessageData } from '../../types/models/message';
import { RealtimeChannel } from '@supabase/supabase-js';

class MessagingService {
    private activeSubscriptions = new Map<string, RealtimeChannel>();

    /**
     * Get list of conversations for a user
     */
    async getConversations(userId: string): Promise<ChatConversation[]> {
        try {
            // Get internal ID first
            const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
            if (!user) return [];

            // Fetch conversations where user is a participant
            const { data, error } = await supabase
                .from('conversation_participation')
                .select(`
          conversation:conversations (
            id, last_message_text, last_message_time, 
            is_group, group_id, group_name
          )
        `)
                .eq('user_id', user.id)
                .order('last_read_at', { ascending: false }); // Heuristic sorting, ideally sort by conv.last_message_time

            if (error) throw error;
            if (!data) return [];

            // We need to fetch details for each conversation (like other participant for 1:1)
            const conversations: ChatConversation[] = [];

            for (const item of data) {
                const conv = item.conversation as any;

                let displayName = 'Chat';
                let photoURL = null;
                let otherUserId = undefined;

                if (conv.is_group) {
                    displayName = conv.group_name || 'Group Chat';
                    // Could fetch group photo here if needed
                } else {
                    // 1:1 Chat - find the other participant
                    const { data: other } = await supabase
                        .from('conversation_participation')
                        .select('user:users(uid, display_name, photo_url)')
                        .eq('conversation_id', conv.id)
                        .neq('user_id', user.id)
                        .single();

                    if (other?.user) {
                        displayName = (other.user as any).display_name;
                        photoURL = (other.user as any).photo_url;
                        otherUserId = (other.user as any).uid;
                    }
                }

                conversations.push({
                    id: conv.id,
                    isGroup: conv.is_group || false,
                    groupId: conv.group_id,
                    groupName: conv.group_name,
                    userId: otherUserId,
                    displayName,
                    photoURL,
                    lastMessage: conv.last_message_text || '',
                    lastMessageTime: conv.last_message_time,
                    unreadCount: 0, // TODO: Implement unread count logic
                    participants: [], // Populated if detailed info needed
                });
            }

            // Client-side sort by last message time
            return conversations.sort((a, b) =>
                new Date(b.lastMessageTime as string).getTime() - new Date(a.lastMessageTime as string).getTime()
            );

        } catch (error) {
            console.error('Error getting conversations:', error);
            return [];
        }
    }

    /**
     * Get messages for a conversation
     */
    async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                *,
                sender:users!sender_id (uid)
            `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false }) // Newest first
                .range(offset, offset + limit - 1);

            if (error) throw error;

            return (data || []).map((m: any) => ({
                id: m.id,
                conversationId: m.conversation_id,
                senderId: m.sender?.uid || 'unknown',
                message: m.text,
                timestamp: m.created_at,
                readBy: m.read_by || [],
                mediaUrl: m.media_url,
                mediaType: m.media_type,
                isSystemMessage: m.is_system_message
            })).reverse(); // Return oldest first for UI rendering usually

        } catch (error) {
            console.error('Error getting messages:', error);
            return [];
        }
    }

    /**
     * Send a message
     */
    async sendMessage(conversationId: string, data: SendMessageData): Promise<Message> {
        try {
            const { data: user } = await supabase.from('users').select('id').eq('uid', data.senderId).single();
            if (!user) throw new Error('User not found');

            const { data: msg, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: user.id,
                    text: data.message,
                    media_url: '', // User requested no storage for now
                })
                .select('*, sender:users!sender_id(uid)')
                .single();

            if (error) throw error;

            // Update conversation last message
            await supabase.from('conversations').update({
                last_message_text: data.message,
                last_message_time: new Date().toISOString()
            }).eq('id', conversationId);

            return {
                id: msg.id,
                conversationId: msg.conversation_id,
                senderId: msg.sender?.uid || data.senderId,
                message: msg.text,
                timestamp: msg.created_at,
                readBy: [],
                mediaUrl: msg.media_url,
                mediaType: msg.media_type,
                isSystemMessage: msg.is_system_message
            };
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    /**
     * Create or get direct conversation
     */
    async createDirectConversation(currentUserId: string, otherUserId: string): Promise<string> {
        // simplistic check: find common conversation
        // In real app, complex join. For now, create new.
        // Or check conversation_participation for overlap.

        const { data: currentUser } = await supabase.from('users').select('id').eq('uid', currentUserId).single();
        const { data: otherUser } = await supabase.from('users').select('id').eq('uid', otherUserId).single();

        if (!currentUser || !otherUser) throw new Error('User not found');

        // Check existence (simplified: assume new for MVP or strict check later)
        // Strict check:
        const { data: existing } = await supabase.rpc('find_common_conversation', {
            user1: currentUser.id,
            user2: otherUser.id
        });
        // If RPC doesn't exist, we fallback to creation, might create duplicates without unique constraint logic.
        // Let's assume we create a new one for safety if RPC missing.

        // Create conversation
        const { data: conv } = await supabase
            .from('conversations')
            .insert({ is_group: false })
            .select('id')
            .single();

        if (!conv) throw new Error('Failed to create conversation');

        // Add participants
        await supabase.from('conversation_participation').insert([
            { conversation_id: conv.id, user_id: currentUser.id },
            { conversation_id: conv.id, user_id: otherUser.id }
        ]);

        return conv.id;
    }

    /**
     * Retrieve or create group conversation
     */
    async getGroupConversationId(groupId: string): Promise<string> {
        // Check if conversation exists for this group
        const { data, error: fetchError } = await supabase
            .from('conversations')
            .select('id')
            .eq('group_id', groupId)
            .maybeSingle();

        if (fetchError) {
            console.error('Error fetching conversation:', fetchError);
        }

        if (data) return data.id;

        // Create if not exists
        const { data: group } = await supabase.from('groups').select('name').eq('id', groupId).single();

        const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({
                is_group: true,
                group_id: groupId,
                group_name: group?.name || 'Group Chat'
            })
            .select('id')
            .single();

        if (createError) {
            console.error('Failed to create group conversation (DB Error):', createError);
            throw createError;
        }

        if (!newConv) throw new Error('Failed to create group conversation (Unknown)');
        return newConv.id;
    }

    /**
     * Subscribe to messages
     */
    subscribeToMessages(conversationId: string, onMessage: (msg: Message) => void) {
        if (this.activeSubscriptions.has(conversationId)) return;

        const channel = supabase.channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                async (payload) => {
                    const newMsg = payload.new;
                    // Need to fetch sender UID since payload has UUID
                    const { data: sender } = await supabase.from('users').select('uid').eq('id', newMsg.sender_id).single();

                    const message: Message = {
                        id: newMsg.id,
                        conversationId: newMsg.conversation_id,
                        senderId: sender?.uid || 'unknown',
                        message: newMsg.text,
                        timestamp: newMsg.created_at,
                        readBy: newMsg.read_by || [],
                        mediaUrl: newMsg.media_url,
                        mediaType: newMsg.media_type,
                        isSystemMessage: newMsg.is_system_message
                    };
                    onMessage(message);
                }
            )
            .subscribe();

        this.activeSubscriptions.set(conversationId, channel);
    }

    unsubscribe(conversationId: string) {
        const channel = this.activeSubscriptions.get(conversationId);
        if (channel) {
            supabase.removeChannel(channel);
            this.activeSubscriptions.delete(conversationId);
        }
    }
}

export default new MessagingService();
