import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeFriendRequests } from '../../hooks/useRealtimeFriendRequests';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { MessageSquare, UserPlus, Check, X, Send, Users, Edit3, Trash2, Save, XCircle, AlertTriangle } from 'lucide-react';
import NavigationBar from '../../components/layout/NavigationBar';
import FooterNav from '../../components/layout/FooterNav';
import SendButton from '../../features/messaging/components/SendButton';
import FriendsList from '../../features/messaging/components/FriendsList';
import ChatHeader from '../../features/messaging/components/ChatHeader';
import UserAvatar from '../../components/common/user/UserAvatar';
import { filterChatMessage, getChatViolationMessage, logChatViolation } from '../../utils/content/chatFilter';
import notificationService from '../../services/notificationService';
import friendsService from '../../services/api/friendsService';
import userService from '../../services/api/userService';
import './Messages.css';

interface FriendRequest {
  id: string;
  requesterId: string;
  recipientId: string;
  requesterName: string;
  recipientName: string;
  status: string;
  timestamp: any;
}

interface Friend {
  id: string;
  displayName?: string;
  photoURL?: string;
  friendshipId: string;
  isOnline?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderPhoto: string;
  message: string;
  timestamp: any;
  read: boolean;
  edited: boolean;
  editedAt?: any;
  deletedFor: string[];
}

// Notification interface moved to NavigationBar

interface FilterResult {
  isClean: boolean;
  shouldBlock?: boolean;
  shouldWarn?: boolean;
  shouldFlag?: boolean;
  violations: string[];
  categories?: string[];
  maxSeverity?: string | null;
}

type TabType = 'friends' | 'requests';

export default function Messages() {
  const navigate = useNavigate();
  const { currentUser, isGuest } = useAuth();

  const handleTitleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [messages, setMessages] = useState<Message[]>([]);

  // Use real-time hook for friend requests
  const {
    incomingRequests: friendRequests,
    outgoingRequests,
    loading: requestsLoading,
    error: requestsError,
    refresh: refreshRequests
  } = useRealtimeFriendRequests(currentUser?.uid || null);

  const [friends, setFriends] = useState<Friend[]>([]);
  // Notifications moved to NavigationBar
  const [selectedChat, setSelectedChat] = useState<Friend | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [showMessageOptions, setShowMessageOptions] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [messageViolation, setMessageViolation] = useState<FilterResult | null>(null);
  const [showMessageWarning, setShowMessageWarning] = useState<boolean>(false);
  const [inputValidationState, setInputValidationState] = useState<'normal' | 'warning' | 'success' | 'error'>('normal');
  const [followedUsers, setFollowedUsers] = useState<string[]>([]);
  const [followingUser, setFollowingUser] = useState<string | null>(null);
  const [sendButtonError, setSendButtonError] = useState<boolean>(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState<boolean>(false);

  useEffect(() => {
if (currentUser && !isGuest()) {
      try {
        // Friend requests now handled by useRealtimeFriendRequests hook
        const unsubscribeFriends = fetchFriends();
        const unsubscribeMessages = fetchMessages();
        fetchFollowedUsers();
        // Notifications moved to NavigationBar
        
        // Set loading to false after a brief delay to allow data to load
        setTimeout(() => {
setLoading(false);
        }, 1000);
        
        // Return cleanup function
        return () => {
          if (unsubscribeFriends) unsubscribeFriends();
          if (unsubscribeMessages) unsubscribeMessages();
          // Notifications cleanup moved to NavigationBar
        };
      } catch (error) {
        console.error('Error initializing data:', error);
        setLoading(false);
      }
    } else {
setLoading(false);
    }
  }, [currentUser, isGuest]);

  // Listen for friendship changes from other components
  useEffect(() => {
    const handleFriendshipChange = () => {
      // Force refresh of friends data
      if (currentUser && !isGuest()) {
        // Clear current friends immediately
        setFriends([]);
        
        // Refresh from database with delay
        setTimeout(() => {
          fetchFriends();
          refreshRequests();
        }, 500);
      }
    };

    window.addEventListener('friendshipChanged', handleFriendshipChange);
    
    return () => {
      window.removeEventListener('friendshipChanged', handleFriendshipChange);
    };
  }, [currentUser]);

  // Notifications moved to NavigationBar

  // Notification handling moved to NavigationBar

  const fetchFriends = () => {
    if (!currentUser) return;
const q1 = query(
      collection(db, 'friendships'),
      where('user1', '==', currentUser.uid)
    );
    const q2 = query(
      collection(db, 'friendships'),
      where('user2', '==', currentUser.uid)
    );
    
    // Debounce updates to prevent duplicate calls
    let updateTimeout: NodeJS.Timeout | null = null;
    
    // Function to combine results from both queries with deduplication
    async function updateFriendsList() {
      // Clear any pending updates
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      
      // Debounce the update by 100ms to prevent race conditions
      updateTimeout = setTimeout(async () => {
        try {
          const friendsList: Friend[] = [];
          const addedFriendIds = new Set<string>(); // Track added friends to prevent duplicates
          
          // Get friendships where current user is user1
          const snapshot1 = await getDocs(q1);
          
          for (const docSnap of snapshot1.docs) {
            const friendship = docSnap.data();
            const friendId = friendship.user2; // I am user1, friend is user2
            
            // Skip if already added
            if (addedFriendIds.has(friendId)) {
continue;
            }
            
            try {
              const friendProfile = await userService.getUserProfile(friendId);
              if (friendProfile) {
                const friendData: Friend = {
                  id: friendId,
                  ...friendProfile,
                  friendshipId: docSnap.id
                } as Friend;
                friendsList.push(friendData);
                addedFriendIds.add(friendId);
              } else {
                console.warn('⚠️ Friend document not found for ID:', friendId);
              }
            } catch (error) {
              console.error('❌ Error fetching friend profile:', error);
            }
          }
          
          // Get friendships where current user is user2
          const snapshot2 = await getDocs(q2);
          
          for (const docSnap of snapshot2.docs) {
            const friendship = docSnap.data();
            const friendId = friendship.user1; // I am user2, friend is user1
            
            // Skip if already added
            if (addedFriendIds.has(friendId)) {
continue;
            }
            
            try {
              const friendProfile = await userService.getUserProfile(friendId);
              if (friendProfile) {
                const friendData: Friend = {
                  id: friendId,
                  ...friendProfile,
                  friendshipId: docSnap.id
                } as Friend;
                friendsList.push(friendData);
                addedFriendIds.add(friendId);
              } else {
                console.warn('⚠️ Friend document not found for ID:', friendId);
              }
            } catch (error) {
              console.error('❌ Error fetching friend profile:', error);
            }
          }
console.log('📱 Messages: Added friend IDs:', Array.from(addedFriendIds));
          setFriends(friendsList);
        } catch (error) {
          console.error('❌ Error in updateFriendsList:', error);
        }
      }, 100);
    }
    
    const unsubscribe1 = onSnapshot(
      q1,
      () => {
updateFriendsList();
      },
      (error) => {
        console.error('❌ Error in friends listener 1:', error);
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
      }
    );

    const unsubscribe2 = onSnapshot(
      q2,
      () => {
updateFriendsList();
      },
      (error) => {
        console.error('❌ Error in friends listener 2:', error);
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
      }
    );

    // Update friends list initially
    updateFriendsList();

    // Return cleanup function
    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      unsubscribe1();
      unsubscribe2();
    };
  };

  const fetchMessages = () => {
    if (!currentUser) return;
// Query for messages where current user is receiver
    const q1 = query(
      collection(db, 'messages'),
      where('receiverId', '==', currentUser.uid)
    );

    // Query for messages where current user is sender
    const q2 = query(
      collection(db, 'messages'),
      where('senderId', '==', currentUser.uid)
    );

    // Debounce timeout for preventing rapid updates
    let updateTimeout: NodeJS.Timeout | null = null;
    let listener1Fired = false;
    let listener2Fired = false;

    const updateMessages = async () => {
      try {
        const messagesList: Message[] = [];

        // Get messages where user is receiver
        const snapshot1 = await getDocs(q1);
snapshot1.forEach((doc) => {
          messagesList.push({ id: doc.id, ...doc.data() } as Message);
        });

        // Get messages where user is sender
        const snapshot2 = await getDocs(q2);
snapshot2.forEach((doc) => {
          messagesList.push({ id: doc.id, ...doc.data() } as Message);
        });

        // Remove duplicates (shouldn't happen but just in case)
        const uniqueMessages = messagesList.filter((msg, index, arr) =>
          arr.findIndex(m => m.id === msg.id) === index
        );

        // Sort by timestamp, oldest first
        uniqueMessages.sort((a, b) => {
          const timeA = a.timestamp?.toDate?.() || new Date(0);
          const timeB = b.timestamp?.toDate?.() || new Date(0);
          return timeA.getTime() - timeB.getTime();
        });
setMessages(uniqueMessages);
      } catch (error) {
        console.error('❌ Error fetching messages:', error);
      }
    };

    // Debounced update function to prevent rapid Firestore listener conflicts
    const debouncedUpdate = () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      updateTimeout = setTimeout(() => {
        updateMessages();
        listener1Fired = false;
        listener2Fired = false;
      }, 300);
    };

    // Initial load
    updateMessages();

    // Listen for changes in both collections with debouncing
    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
listener1Fired = true;
      debouncedUpdate();
    }, (error) => {
      console.error('❌ Error in messages listener 1:', error);
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
listener2Fired = true;
      debouncedUpdate();
    }, (error) => {
      console.error('❌ Error in messages listener 2:', error);
    });

    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      unsubscribe1();
      unsubscribe2();
    };
  };

  // Notifications functionality moved to NavigationBar

  // Notification functions moved to NavigationBar

  const handleAcceptRequest = async (requestId: string, senderId: string): Promise<void> => {
    if (isGuest()) {
      alert('Please sign up or log in to accept friend requests');
      return;
    }

    try {
      // Get sender's profile data first
      const senderProfile = await userService.getUserProfile(senderId);
      const senderData = senderProfile || {};

      // Update request status
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });

      // Create friendship entries for both users with proper user data
      const friendshipData = {
        user1: senderId,
        user2: currentUser!.uid,
        createdAt: serverTimestamp()
      };

      const friendshipRef = await addDoc(collection(db, 'friendships'), friendshipData);
alert('Friend request accepted! Check the Friends tab.');

    } catch (error: any) {
      console.error('❌ Error accepting friend request:', error);
      alert('Error accepting friend request: ' + error.message);
    }
  };

  const handleRejectRequest = async (requestId: string): Promise<void> => {
    if (isGuest()) {
      alert('Please sign up or log in to manage friend requests');
      return;
    }

    try {
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  // Enhanced auto-scroll to bottom function with smooth scrolling
  const scrollToBottom = (smooth: boolean = true): void => {
    const chatMessagesContainer = document.querySelector('.chat-messages-container') as HTMLElement;
    if (chatMessagesContainer) {
      if (smooth) {
        chatMessagesContainer.scrollTo({
          top: chatMessagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
      }
      // Hide scroll to bottom button after scrolling
      setShowScrollToBottom(false);
    }
  };

  // Handle scroll events to show/hide scroll-to-bottom button
  const handleScroll = (): void => {
    const chatMessagesContainer = document.querySelector('.chat-messages-container') as HTMLElement;
    if (chatMessagesContainer) {
      const { scrollTop, scrollHeight, clientHeight } = chatMessagesContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      const hasScrollableContent = scrollHeight > clientHeight + 10; // Add small buffer
      setShowScrollToBottom(!isNearBottom && hasScrollableContent);
    }
  };

  // Auto-scroll when messages change with improved logic
  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      const chatMessagesContainer = document.querySelector('.chat-messages-container') as HTMLElement;
      if (chatMessagesContainer) {
        // Check if user is near bottom before auto-scrolling
        const isNearBottom = chatMessagesContainer.scrollHeight - chatMessagesContainer.scrollTop - chatMessagesContainer.clientHeight < 100;
        
        // Always scroll to bottom when chat is first opened or user is near bottom
        if (isNearBottom || chatMessagesContainer.scrollTop === 0) {
          // Use requestAnimationFrame for better performance
          requestAnimationFrame(() => {
            setTimeout(() => scrollToBottom(true), 50);
          });
        }
      }
    }
  }, [messages, selectedChat]);

  // Set up scroll listener for selected chat
  useEffect(() => {
    if (selectedChat) {
      const chatMessagesContainer = document.querySelector('.chat-messages-container') as HTMLElement;
      if (chatMessagesContainer) {
        chatMessagesContainer.addEventListener('scroll', handleScroll);
        // Initial check and scroll to bottom for new chat
        setTimeout(() => {
          handleScroll();
          scrollToBottom(false); // Instant scroll for new chat
        }, 100);
        
        return () => {
          chatMessagesContainer.removeEventListener('scroll', handleScroll);
        };
      }
    } else {
      // Reset scroll button state when no chat is selected
      setShowScrollToBottom(false);
    }
  }, [selectedChat]);

  // Virtual keyboard handling for mobile devices
  useEffect(() => {
    const handleViewportChange = () => {
      // Detect virtual keyboard on mobile
      const viewport = window.visualViewport;
      if (viewport) {
        const chatInterface = document.querySelector('.chat-interface') as HTMLElement;
        const messageInputArea = document.querySelector('.message-input-area') as HTMLElement;
        
        if (chatInterface && messageInputArea) {
          const keyboardHeight = window.innerHeight - viewport.height;
          
          if (keyboardHeight > 150) { // Virtual keyboard is likely open
            chatInterface.style.height = `${viewport.height - 180}px`;
            messageInputArea.style.paddingBottom = '8px';
            // Scroll to bottom when keyboard opens
            setTimeout(() => scrollToBottom(false), 200);
          } else {
            // Reset to normal height
            chatInterface.style.height = 'calc(100vh - 180px)';
            messageInputArea.style.paddingBottom = '16px';
          }
        }
      }
    };

    // Listen for viewport changes (virtual keyboard)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    }

    // Fallback for older browsers
    const handleResize = () => {
      const chatInterface = document.querySelector('.chat-interface') as HTMLElement;
      if (chatInterface && window.innerHeight < 500) {
        // Likely virtual keyboard is open
        chatInterface.style.height = `${window.innerHeight - 120}px`;
        setTimeout(() => scrollToBottom(false), 200);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [selectedChat]);

  // Enhanced real-time message content filtering with smooth transitions
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newMessageText = e.target.value;
    setNewMessage(newMessageText);
    
    // Real-time filter check (strict for messages)
    if (newMessageText.trim().length > 3) { // Check after minimal content
const filterResult = filterChatMessage(newMessageText, {
        checkPatterns: true,
        languages: ['english', 'hindi']
      });
if (!filterResult.isClean && filterResult.shouldBlock) {
        setMessageViolation(filterResult);
        setShowMessageWarning(true);
        setInputValidationState('error');
      } else if (!filterResult.isClean && filterResult.shouldWarn) {
        setMessageViolation(filterResult);
        setShowMessageWarning(true);
        setInputValidationState('warning');
      } else {
        setMessageViolation(null);
        setShowMessageWarning(false);
        setInputValidationState('success');
        // Reset to normal after showing success briefly
        setTimeout(() => {
          setInputValidationState('normal');
        }, 2000);
      }
    } else {
      setMessageViolation(null);
      setShowMessageWarning(false);
      setInputValidationState('normal');
    }
  };

  const handleSendMessage = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || isGuest() || sendingMessage || !currentUser) return;

    const messageText = newMessage.trim();
    
    // Reset send button error state
    setSendButtonError(false);
    
    // Content filtering check for messages
const filterResult = filterChatMessage(messageText, {
      checkPatterns: true,
      languages: ['english', 'hindi']
    });
if (!filterResult.isClean) {
      setMessageViolation(filterResult);
      setShowMessageWarning(true);
      
      // Log violation for admin review
      if (filterResult.shouldFlag) {
        await logChatViolation(currentUser.uid, messageText, filterResult.violations, 'chat');
}
      
      // Block content without confirmation - just show error
      if (filterResult.shouldBlock || filterResult.shouldWarn) {
        const violationMsg = getChatViolationMessage(filterResult.violations, filterResult.categories);
        alert(`❌ You can't send this message: ${violationMsg}`);
        setSendButtonError(true);
        // Auto-clear error state after 3 seconds
        setTimeout(() => setSendButtonError(false), 3000);
        return; // Don't send the message
      }
    } else {
      setMessageViolation(null);
      setShowMessageWarning(false);
}

    setSendingMessage(true);
    setNewMessage(''); // Clear input immediately for better UX

    try {
await addDoc(collection(db, 'messages'), {
        senderId: currentUser.uid,
        receiverId: selectedChat.id,
        senderName: currentUser.displayName || 'Anonymous User',
        senderPhoto: currentUser.photoURL || '',
        message: messageText,
        timestamp: serverTimestamp(),
        read: false,
        edited: false,
        deletedFor: [] // Array to track who deleted the message
      });
// Scroll to bottom after sending
      setTimeout(() => scrollToBottom(true), 200);
      
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      setNewMessage(messageText); // Restore message if failed
      setSendButtonError(true);
      alert('Failed to send message: ' + error.message);
      // Auto-clear error state after 5 seconds
      setTimeout(() => setSendButtonError(false), 5000);
    }
    
    setSendingMessage(false);
  };

  const handleDeleteMessage = async (messageId: string, deleteType: 'me' | 'everyone'): Promise<void> => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        alert('Message not found');
        return;
      }

      const messageData = messageDoc.data() as Message;
      
      if (deleteType === 'everyone') {
        // Only sender can delete for everyone
        if (messageData.senderId !== currentUser?.uid) {
          alert('You can only delete your own messages for everyone');
          return;
        }
        
        // Delete the entire message document
        await deleteDoc(messageRef);
} else {
        // Delete for me only - add current user to deletedFor array
        const currentDeletedFor = messageData.deletedFor || [];
        if (!currentDeletedFor.includes(currentUser!.uid)) {
          await updateDoc(messageRef, {
            deletedFor: [...currentDeletedFor, currentUser!.uid]
          });
}
      }
      
      setShowMessageOptions(null);
    } catch (error: any) {
      console.error('❌ Error deleting message:', error);
      alert('Failed to delete message: ' + error.message);
    }
  };

  const handleEditMessage = async (messageId: string): Promise<void> => {
    if (!editText.trim()) {
      alert('Message cannot be empty');
      return;
    }

    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        message: editText.trim(),
        edited: true,
        editedAt: serverTimestamp()
      });
      
      setEditingMessage(null);
      setEditText('');
      setShowMessageOptions(null);
} catch (error: any) {
      console.error('❌ Error editing message:', error);
      alert('Failed to edit message: ' + error.message);
    }
  };

  const startEdit = (message: Message): void => {
    setEditingMessage(message.id);
    setEditText(message.message);
    setShowMessageOptions(null);
  };

  const cancelEdit = (): void => {
    setEditingMessage(null);
    setEditText('');
  };

  // Smart positioning for options menu
  const positionOptionsMenu = (messageElement: HTMLElement, messageId: string): void => {
    // Wait for menu to be rendered
    setTimeout(() => {
      const optionsMenu = document.querySelector(`[data-message-id="${messageId}"] .options-menu`) as HTMLElement;
      if (!optionsMenu) return;

      const messageRect = messageElement.getBoundingClientRect();
      const menuRect = optionsMenu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate optimal position
      let left = messageRect.right + 10; // Default to right side
      let top = messageRect.top - 10;
      
      // Check if menu would go off-screen on the right
      if (left + menuRect.width > viewportWidth - 20) {
        // Position to the left of the message
        left = messageRect.left - menuRect.width - 10;
        optionsMenu.classList.add('position-left');
        optionsMenu.classList.remove('position-right', 'position-center');
      } else {
        optionsMenu.classList.add('position-right');
        optionsMenu.classList.remove('position-left', 'position-center');
      }
      
      // Check if menu would go off-screen on the left
      if (left < 20) {
        // Center the menu above/below the message
        left = messageRect.left + (messageRect.width / 2) - (menuRect.width / 2);
        optionsMenu.classList.add('position-center');
        optionsMenu.classList.remove('position-left', 'position-right');
      }
      
      // Ensure menu doesn't go off-screen vertically
      if (top + menuRect.height > viewportHeight - 20) {
        top = messageRect.bottom - menuRect.height + 10;
      }
      
      if (top < 20) {
        top = 20;
      }
      
      // Apply the calculated position
      optionsMenu.style.left = `${Math.max(20, Math.min(left, viewportWidth - menuRect.width - 20))}px`;
      optionsMenu.style.top = `${top}px`;
    }, 10);
  };

  // Enhanced long press handlers with visual feedback
  const handleMouseDown = (message: Message, event: React.MouseEvent): void => {
    if (!message.senderId || message.senderId !== currentUser?.uid) return;
    
    const messageElement = event.currentTarget as HTMLElement;
    messageElement.classList.add('long-press-active');
    
    const timer = setTimeout(() => {
      setShowMessageOptions(message.id);
      positionOptionsMenu(messageElement, message.id);
    }, 500); // 500ms long press
    
    setLongPressTimer(timer);
  };

  const handleMouseUp = (event: React.MouseEvent): void => {
    const messageElement = event.currentTarget as HTMLElement;
    messageElement.classList.remove('long-press-active');
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchStart = (message: Message, event: React.TouchEvent): void => {
    if (!message.senderId || message.senderId !== currentUser?.uid) return;
    
    const messageElement = event.currentTarget as HTMLElement;
    messageElement.classList.add('long-press-active');
    
    const timer = setTimeout(() => {
      setShowMessageOptions(message.id);
      positionOptionsMenu(messageElement, message.id);
      // Provide haptic feedback on supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press
    
    setLongPressTimer(timer);
  };

  const handleTouchEnd = (event: React.TouchEvent): void => {
    const messageElement = event.currentTarget as HTMLElement;
    messageElement.classList.remove('long-press-active');
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent): void => {
      if (showMessageOptions && !(event.target as Element).closest('.message')) {
        setShowMessageOptions(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside as EventListener);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [showMessageOptions]);

  // Fetch users that current user is following
  const fetchFollowedUsers = (): (() => void) | undefined => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, 'follows'),
      where('followerId', '==', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const followed: string[] = [];
      snapshot.forEach((doc) => {
        followed.push(doc.data().followingId);
      });
      setFollowedUsers(followed);
    });

    return unsubscribe;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFollow = async (userId: string, userName: string): Promise<void> => {
    if (isGuest()) {
      alert('Please sign up or log in to follow users');
      return;
    }

    if (!currentUser) return;

    setFollowingUser(userId);
    
    try {
      const isFollowing = followedUsers.includes(userId);
      
      if (isFollowing) {
        // Unfollow: remove from follows collection
        const q = query(
          collection(db, 'follows'),
          where('followerId', '==', currentUser.uid),
          where('followingId', '==', userId)
        );
        
        const snapshot = await getDocs(q);
        snapshot.forEach(async (docSnapshot) => {
          await deleteDoc(doc(db, 'follows', docSnapshot.id));
        });
} else {
        // Follow: add to follows collection
        await addDoc(collection(db, 'follows'), {
          followerId: currentUser.uid,
          followingId: userId,
          followerName: currentUser.displayName || 'Anonymous User',
          followingName: userName,
          timestamp: serverTimestamp()
        });

        // Send follow notification to the followed user
        try {
          await notificationService.sendFollowNotification(
            currentUser.uid,
            currentUser.displayName || 'Someone',
            currentUser.photoURL || '',
            userId
          );
} catch (notificationError) {
          console.error('Error sending follow notification:', notificationError);
        }
}
    } catch (error: any) {
      console.error('❌ Error updating follow status:', error);
      alert('Failed to update follow status: ' + error.message);
    }
    
    setFollowingUser(null);
  };

  // Guest view
  if (isGuest()) {
    return (
      <div className="messages">
        <NavigationBar
          currentUser={currentUser}
          isGuest={isGuest()}
          onTitleClick={handleTitleClick}
          title="Messages"
        />

        <div className="main-content messages-content">
          <div className="guest-restriction">
            <div className="guest-restriction-content">
              <MessageSquare size={48} />
              <h2>Messages & Friend Requests</h2>
              <p>🔒 Guest accounts cannot access messaging features</p>
              <p>Sign up to connect with friends and send messages!</p>
              <button 
                className="sign-up-btn"
                onClick={() => navigate('/login')}
              >
                Sign Up / Sign In
              </button>
            </div>
          </div>
        </div>
        
        <FooterNav />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="messages">
        <NavigationBar
          currentUser={currentUser}
          isGuest={isGuest()}
          onTitleClick={handleTitleClick}
          title="Messages"
        />
        <div className="main-content">
          <div className="loading">Loading messages...</div>
        </div>
        <FooterNav />
      </div>
    );
  }

  return (
    <div className="messages">
      <NavigationBar
        currentUser={currentUser}
        isGuest={isGuest()}
        onTitleClick={handleTitleClick}
        title="Messages"
      />

      <div className="main-content messages-content">
        <div className="messages-tabs">
          <button 
            className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            <Users size={20} />
            Friends ({friends.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <UserPlus size={20} />
            Requests ({friendRequests.length})
          </button>
          {/* Notifications moved to NavigationBar */}
        </div>

        {activeTab === 'friends' && (
          <div className="friends-list">
            {!selectedChat && (
              <FriendsList
                friends={friends}
                onSelectFriend={setSelectedChat}
                loading={loading}
              />
            )}

            {selectedChat && (
              <div className="chat-interface">
                <ChatHeader
                  friend={selectedChat}
                  onBack={() => setSelectedChat(null)}
                />

                    <div className="chat-messages-container">
                      <div className="chat-messages" id="chat-messages">
                        {messages
                          .filter(msg => 
                            (msg.senderId === currentUser?.uid && msg.receiverId === selectedChat.id) ||
                            (msg.senderId === selectedChat.id && msg.receiverId === currentUser?.uid)
                          )
                          .filter(msg => !msg.deletedFor.includes(currentUser!.uid))
                          .map((message) => (
                            <div 
                              key={message.id} 
                              className={`message ${message.senderId === currentUser?.uid ? 'sent' : 'received'}`}
                              data-message-id={message.id}
                              onMouseDown={(e) => handleMouseDown(message, e)}
                              onMouseUp={handleMouseUp}
                              onTouchStart={(e) => handleTouchStart(message, e)}
                              onTouchEnd={handleTouchEnd}
                            >
                              {editingMessage === message.id ? (
                                <div className="edit-message-form">
                                  <div className="edit-input-container">
                                    <input
                                      type="text"
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      className="edit-input"
                                      autoFocus
                                    />
                                    <div className="edit-actions">
                                      <button className="save-btn" onClick={() => handleEditMessage(message.id)}>
                                        <Save size={16} />
                                      </button>
                                      <button className="cancel-btn" onClick={cancelEdit}>
                                        <XCircle size={16} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="message-content">
                                  <div className="message-text">
                                    <p>{message.message}</p>
                                    {message.edited && <span className="edited-indicator">(edited)</span>}
                                  </div>
                                  <span className="message-time">
                                    {message.timestamp?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>

                                  {showMessageOptions === message.id && message.senderId === currentUser?.uid && (
                                    <div className="options-menu">
                                      <button className="option-item edit-option" onClick={() => startEdit(message)}>
                                        <Edit3 size={16} />
                                        Edit
                                      </button>
                                      <button className="option-item delete-option" onClick={() => handleDeleteMessage(message.id, 'me')}>
                                        <Trash2 size={16} />
                                        Delete for me
                                      </button>
                                      <button className="option-item delete-everyone-option" onClick={() => handleDeleteMessage(message.id, 'everyone')}>
                                        <Trash2 size={16} />
                                        Delete for everyone
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                      
                      {/* Scroll to bottom button */}
                      {showScrollToBottom && (
                        <button
                          className="scroll-to-bottom-btn"
                          onClick={() => scrollToBottom(true)}
                          aria-label="Scroll to bottom"
                          title="Scroll to bottom"
                        >
                          ↓
                        </button>
                      )}
                    </div>

                    <div className="message-input-area">
                      {showMessageWarning && messageViolation && (
                        <div 
                          className="message-violation-warning" 
                          id="message-warning"
                          role="alert"
                          aria-live="polite"
                        >
                          <div className="warning-header">
                            <AlertTriangle size={16} aria-hidden="true" />
                            {inputValidationState === 'error' ? 'Content Blocked' : 'Content Warning'}
                          </div>
                          <div className="warning-message">
                            {inputValidationState === 'error' 
                              ? 'This message contains inappropriate content and cannot be sent.'
                              : 'This message may contain inappropriate content. Please review before sending.'
                            }
                          </div>
                          {messageViolation.violations && messageViolation.violations.length > 0 && (
                            <div className="warning-suggestion">
                              Issues detected: {messageViolation.violations.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <form className="message-input-form" onSubmit={handleSendMessage}>
                        <input
                          type="text"
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={handleMessageChange}
                          disabled={sendingMessage}
                          className={`${inputValidationState === 'warning' || inputValidationState === 'error' ? 'content-warning' : ''} ${inputValidationState === 'success' ? 'content-success' : ''}`}
                          aria-label="Message input"
                          aria-describedby={showMessageWarning ? 'message-warning' : undefined}
                          aria-invalid={inputValidationState === 'error'}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="sentences"
                          spellCheck={true}
                        />
                        <SendButton
                          disabled={sendingMessage || !newMessage.trim()}
                          loading={sendingMessage}
                          error={sendButtonError}
                          type="submit"
                        />
                      </form>
                    </div>
                  </div>
                )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="friend-requests-list">
            {friendRequests.length === 0 ? (
              <div className="empty-state">
                <UserPlus size={48} />
                <h3>No Friend Requests</h3>
                <p>You don't have any pending friend requests</p>
              </div>
            ) : (
              friendRequests.map((request) => (
                <div key={request.id} className="friend-request-card">
                  <UserAvatar
                    userId={request.requesterId}
                    displayName={request.requesterName}
                    size="medium"
                    clickable={true}
                    showName={false}
                  />
                  <div className="request-info">
                    <strong className="request-user-name">
                      {request.requesterName}
                    </strong>
                    <p>wants to be your friend</p>
                  </div>
                  <div className="request-actions">
                    <button
                      className="accept-btn"
                      onClick={() => handleAcceptRequest(request.id, request.requesterId)}
                    >
                      <Check size={16} />
                      Accept
                    </button>
                    <button 
                      className="reject-btn"
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      <X size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Notifications tab content moved to NavigationBar */}
      </div>
      
      <FooterNav />
    </div>
  );
}
