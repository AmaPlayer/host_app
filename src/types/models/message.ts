import { Timestamp } from 'firebase/firestore';

/**
 * Core Message interface for chat messages
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  // receiverId removed - messages belong to conversation
  message: string;
  timestamp: Timestamp | Date | string;
  readBy: string[]; // Changed from read boolean to array of IDs
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  isSystemMessage?: boolean;
}

/**
 * Chat conversation with latest message
 */
export interface ChatConversation {
  id: string;
  isGroup: boolean;
  groupId?: string;
  groupName?: string;
  userId?: string; // For 1:1, the other user
  displayName: string; // Group name or User name
  photoURL: string | null;
  lastMessage: string;
  lastMessageTime: Timestamp | Date | string;
  unreadCount: number;
  isOnline?: boolean;
  participants: string[];
}

/**
 * Data for sending a new message
 */
export interface SendMessageData {
  senderId: string;
  receiverId: string;
  message: string;
}

/**
 * Data for updating a message
 */
export interface UpdateMessageData {
  message: string;
}

/**
 * Message delete options
 */
export type MessageDeleteType = 'me' | 'everyone';

/**
 * Message violation warning
 */
export interface MessageViolation {
  type: 'spam' | 'inappropriate' | 'warning';
  message: string;
  score?: number;
  reasons?: string[];
}
