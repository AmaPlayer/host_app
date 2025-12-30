
import React, { useEffect, useState, useRef } from 'react';
import { Send, Image as ImageIcon, Smile } from 'lucide-react';
import messagingService from '../../../services/api/messagingService';
import { Message } from '../../../types/models/message';
import { useAuth } from '../../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

import './GroupChat.css';

interface GroupChatProps {
    groupId: string;
}

const GroupChat: React.FC<GroupChatProps> = ({ groupId }) => {
    const { currentUser: user } = useAuth();
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize conversation
    useEffect(() => {
        const initChat = async () => {
            try {
                const id = await messagingService.getGroupConversationId(groupId);
                setConversationId(id);

                // Load messages
                const history = await messagingService.getMessages(id, 50);
                setMessages(history);

                // Subscribe
                messagingService.subscribeToMessages(id, (msg) => {
                    setMessages(prev => [...prev, msg]);
                    scrollToBottom();
                });
            } catch (e) {
                console.error('Chat init fail:', e);
            } finally {
                setLoading(false);
            }
        };

        if (groupId) initChat();

        return () => {
            if (conversationId) messagingService.unsubscribe(conversationId);
        };
    }, [groupId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !conversationId) return;

        const text = newMessage;
        setNewMessage(''); // Optimistic clear

        try {
            await messagingService.sendMessage(conversationId, {
                senderId: user.uid,
                receiverId: '', // N/A for group
                message: text
            });
        } catch (e) {
            console.error('Send failed:', e);
            setNewMessage(text); // Revert
        }
    };

    if (loading) return <div className="loading-chat">Loading chat...</div>;

    return (
        <div className="chat-container">
            {/* Messages Area */}
            <div className="messages-area">
                {messages.length === 0 && (
                    <div className="empty-chat">
                        <p>No messages yet.</p>
                        <p className="text-sm">Start the conversation!</p>
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                        <div key={msg.id} className={`message-row ${isMe ? 'sent' : 'received'}`}>
                            <div className={`message-bubble ${isMe ? 'sent' : 'received'}`}>
                                {!isMe && <div className="sender-name">User {msg.senderId.slice(0, 4)}</div>}
                                <p className="message-text">{msg.message}</p>
                                <div className="message-time">
                                    {formatDistanceToNow(new Date(msg.timestamp as string || Date.now()), { addSuffix: true })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="chat-input-area">
                <button type="button" className="chat-action-btn">
                    <ImageIcon size={20} />
                </button>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-input"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="send-btn"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

export default GroupChat;
