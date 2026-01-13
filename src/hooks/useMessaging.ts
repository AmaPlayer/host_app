import { useCallback } from 'react';
import messagingService from '../services/api/messagingService';
import { Message, SendMessageData } from '../types/models/message';

export const useMessaging = () => {
    const getGroupConversationId = useCallback(async (groupId: string) => {
        return await messagingService.getGroupConversationId(groupId);
    }, []);

    const getMessages = useCallback(async (conversationId: string, limit?: number) => {
        return await messagingService.getMessages(conversationId, limit);
    }, []);

    const sendMessage = useCallback(async (conversationId: string, data: SendMessageData) => {
        return await messagingService.sendMessage(conversationId, data);
    }, []);

    const subscribeToMessages = useCallback((conversationId: string, onMessage: (msg: Message) => void) => {
        return messagingService.subscribeToMessages(conversationId, onMessage);
    }, []);

    const unsubscribe = useCallback((conversationId: string) => {
        return messagingService.unsubscribe(conversationId);
    }, []);

    return {
        getGroupConversationId,
        getMessages,
        sendMessage,
        subscribeToMessages,
        unsubscribe,
        isMock: false
    };
};
