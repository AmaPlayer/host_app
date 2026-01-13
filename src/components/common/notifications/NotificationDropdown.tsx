import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Heart, MessageCircle, UserPlus, Eye, CheckCheck, Trash2, Megaphone, Pin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { supabase } from '../../../lib/supabase'; // Import Supabase
import { collection, query, where, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import notificationManagementService from '../../../services/api/notificationManagementService';
import { Announcement } from '../../../types/models/announcement';
import { Notification } from '../../../types/models/notification';
import { useRealtimeNotifications } from '../../../hooks/useRealtimeNotifications';
import './NotificationDropdown.css';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerButtonRef?: React.RefObject<HTMLButtonElement>;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  triggerButtonRef
}) => {
  const navigate = useNavigate();
  const { currentUser, isGuest } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use the new hook for notifications
  const { notifications, loading: notificationsLoading } = useRealtimeNotifications(isExpanded ? 50 : 10);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  // Fetch announcements (kept local as it's specific to this UI for now)
  useEffect(() => {
    if (!currentUser || isGuest()) {
      setLoadingAnnouncements(false);
      return;
    }

    setLoadingAnnouncements(false);


    // Legacy Firebase code removed - verified by Antigravity
    // Announcements are now fetched via useRealtimeNotifications hook (Supabase)
  }, [currentUser, isGuest]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerButtonRef?.current &&
        !triggerButtonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerButtonRef]);

  // Mark notification as read (Hybrid Support: Auto-detects Supabase vs Firebase if needed, but we prefer Supabase now)
  const markAsRead = async (notificationId: string) => {
    try {
      // 1. Try Supabase first (Primary Source)
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        // If error is strictly "relation not found" or similar, maybe it's old Firebase data?
        // But we migrated. Let's just log error.
        console.error('Error marking notification as read (Supabase):', error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle notification click
  // Handle notification click with robust navigation
  const handleNotificationClick = async (notification: Notification, e?: React.MouseEvent) => {
    // Prevent default browser behavior (full page reload) and bubbling
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('🖱️ Notification Clicked! Type:', notification.type, 'Data:', notification);

    try {
      // 1. Mark as read immediately (non-blocking for UX)
      if (!notification.read) {
        markAsRead(notification.id).catch(err =>
          console.error('Failed to mark notification as read in background:', err)
        );
      }

      // 2. PRIORITIZE Type-based handling
      switch (notification.type) {
        // --- Admin & System ---
        case 'announcement' as any: // Cast to avoid TS issues if type not fully propagated yet
          if (notification.actionUrl) {
            onClose();
            const url = notification.actionUrl.startsWith('/') ? notification.actionUrl : `/${notification.actionUrl}`;
            navigate(url);
          } else {
            // Just close if no URL
            onClose();
          }
          return;

        // --- Friend Requests & Connections ---
        // --- Friend Requests & Connections ---
        case 'friend_request':
        case 'connection_request':
          console.log('🔔 Clicking friend request notification - Using HARD NAVIGATION');
          onClose();
          window.location.href = '/messages?tab=requests';
          return;

        case 'connection_accepted':
        case 'connection_rejected':
          onClose();
          window.location.href = '/messages?tab=friends';
          return;

        // --- Messages ---
        case 'message':
          onClose();
          if (notification.actorId) {
            window.location.href = `/messages?user=${notification.actorId}`;
          } else {
            window.location.href = '/messages';
          }
          return;

        // --- Events ---
        case 'event':
          onClose();
          if (notification.relatedId) {
            navigate(`/events/${notification.relatedId}`);
          } else {
            navigate('/events');
          }
          return;
      }

      // 3. Fallback: Explicit Action URL
      // Use this for types that don't have special handling above
      if (notification.actionUrl) {
        onClose();
        const url = notification.actionUrl.startsWith('/') ? notification.actionUrl : `/${notification.actionUrl}`;
        navigate(url);
        return;
      }

      // 4. Default handling for remaining types
      onClose();
      switch (notification.type) {
        // --- Posts & Social ---
        case 'like':
        case 'comment':
        case 'mention':
        case 'share':
        case 'post_shared':
          if (notification.relatedId) {
            navigate(`/post/${notification.relatedId}`);
          } else {
            navigate('/'); // Fallback to feed
          }
          break;

        // --- Stories ---
        case 'story_like':
        case 'story_view':
        case 'story_comment':
          if (notification.relatedId) {
            navigate(`/story/${notification.relatedId}`);
          } else if (notification.actorId) {
            navigate(`/profile/${notification.actorId}`);
          }
          break;

        // --- Specific User Actions ---
        case 'follow':
          if (notification.actorId) {
            navigate(`/profile/${notification.actorId}`);
          }
          break;

        default:
          console.warn(`Unhandled notification type: ${notification.type}`);
          break;
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone size={16} className="notification-icon announcement" />;
      case 'like':
        return <Heart size={16} className="notification-icon like" />;
      case 'comment':
        return <MessageCircle size={16} className="notification-icon comment" />;
      case 'message':
        return <MessageCircle size={16} className="notification-icon message" />;
      case 'follow':
      case 'friend_request':
      case 'connection_request':
      case 'connection_accepted':
      case 'connection_rejected':
        return <UserPlus size={16} className="notification-icon follow" />;
      case 'story_view':
      case 'story_like':
      case 'story_comment':
        return <Eye size={16} className="notification-icon story" />;
      default:
        return <Bell size={16} className="notification-icon default" />;
    }
  };

  // Format time
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;

    try {
      await notificationManagementService.markAllAsRead(currentUser.uid);
    } catch (error) {
      console.error('Error marking all as read:', error);
      alert('Failed to mark all notifications as read');
    }
  };

  // Delete all read notifications
  const handleDeleteAllRead = async () => {
    if (!currentUser) return;

    const readCount = notifications.filter(n => n.read).length;
    if (readCount === 0) {
      alert('No read notifications to delete');
      return;
    }

    if (window.confirm(`Delete ${readCount} read notification${readCount > 1 ? 's' : ''}?`)) {
      try {
        await notificationManagementService.deleteAllRead(currentUser.uid);
      } catch (error) {
        console.error('Error deleting read notifications:', error);
        alert('Failed to delete read notifications');
      }
    }
  };

  const isLoading = notificationsLoading || loadingAnnouncements;

  if (!isOpen) return null;

  return (
    <div className={`notification-dropdown ${isExpanded ? 'expanded' : ''}`} ref={dropdownRef}>
      <div className="notification-header">
        <h3>Notifications</h3>
        <div className="header-actions">
          {notifications.length > 0 && (
            <>
              <button
                className="action-btn"
                onClick={handleMarkAllAsRead}
                disabled={isLoading || notifications.every(n => n.read)}
                title="Mark all as read"
              >
                <CheckCheck size={16} />
              </button>
              <button
                className="action-btn"
                onClick={handleDeleteAllRead}
                disabled={isLoading || notifications.filter(n => n.read).length === 0}
                title="Delete read notifications"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="notification-list">
        {isLoading && notifications.length === 0 ? (
          <div className="notification-loading">
            <div className="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : announcements.length === 0 && notifications.length === 0 ? (
          <div className="notification-empty">
            <Bell size={32} className="empty-icon" />
            <p>No notifications yet</p>
            <span>You'll see notifications here when someone interacts with your content</span>
          </div>
        ) : (
          <>
            {/* Render announcements first (pinned at top) */}
            {announcements.map((announcement) => (
              <div
                key={`announcement-${announcement.id}`}
                className="notification-item announcement-item"
              >
                <div className="notification-icon-container">
                  <Megaphone size={16} className="notification-icon announcement" />
                </div>

                <div className="notification-content">
                  <div className="announcement-header">
                    <span className="announcement-title">{announcement.title}</span>
                    <span className="announcement-badge">Announcement</span>
                  </div>
                  <div className="notification-message announcement-message">
                    {announcement.message}
                  </div>
                  <div className="notification-time">
                    Expires {formatTime(announcement.expiresAt)}
                  </div>
                </div>

                <div className="announcement-pin-icon">
                  <Pin size={14} />
                </div>
              </div>
            ))}

            {/* Render regular notifications */}
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={(e) => handleNotificationClick(notification, e)}
              >
                <div className="notification-icon-container">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="notification-content">
                  <div className="notification-message">
                    {notification.message}
                  </div>
                  <div className="notification-time">
                    {formatTime(notification.timestamp)}
                  </div>
                </div>

                {!notification.read && (
                  <div className="unread-indicator"></div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {(notifications.length > 0 || announcements.length > 0) && (
        <div className="notification-footer">
          <button
            className="view-all-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : 'View All'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;