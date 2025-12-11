import React, { useState, useEffect } from 'react';
import { MessageSquare, Link2, Loader } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { organizationConnectionService } from '../../../services/api/organizationConnectionService';
import friendsService from '../../../services/api/friendsService';
import userService from '../../../services/api/userService';
import { db } from '../../../lib/firebase';

interface MessageButtonProps {
  targetUserId: string;
  targetUserName: string;
  targetUserRole?: string;
  connectionStatus: 'connected' | 'pending' | 'none';
  onConnectionRequest?: () => void;
  onOpenChat?: () => void;
}

/**
 * MessageButton Component
 * Displays the appropriate action button based on user roles and connection status
 * - For org→athlete or athlete→org: "Send Connection Request"
 * - For athlete→athlete friends: "Message"
 * - For approved connections: "Open Chat"
 */
const MessageButton: React.FC<MessageButtonProps> = ({
  targetUserId,
  targetUserName,
  targetUserRole = 'athlete',
  connectionStatus,
  onConnectionRequest,
  onOpenChat
}) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('athlete');

  // Fetch current user's role from Firestore or localStorage
  useEffect(() => {
    // First try localStorage (most reliable for immediate role check)
    const storedRole = localStorage.getItem('selectedUserRole');
    if (storedRole) {
      setCurrentUserRole(storedRole);
      return;
    }

    // Then try to fetch from Firestore if not in localStorage
    if (!currentUser) {
      setCurrentUserRole('athlete');
      return;
    }

    const fetchUserRole = async () => {
      try {
        const userData = await userService.getUserProfile(currentUser.uid);

        if (userData) {
          setCurrentUserRole(userData.role || 'athlete');
        } else {
          setCurrentUserRole('athlete');
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        // Fallback to default if error
        setCurrentUserRole('athlete');
      }
    };

    fetchUserRole();
  }, [currentUser]);

  const isOrgToAthleteConnection =
    (currentUserRole === 'organization' && targetUserRole === 'athlete') ||
    (currentUserRole === 'athlete' && targetUserRole === 'organization');

  const handleSendConnectionRequest = async () => {
    if (!currentUser || !targetUserId) {
      setError('Please sign in to send a message');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Handle athlete-to-athlete friend requests
      if (currentUserRole === 'athlete' && targetUserRole === 'athlete') {
        // Check if request already exists in EITHER direction
        const sentRequest = await friendsService.checkFriendRequestExists(
          currentUser.uid,
          targetUserId
        );
        const receivedRequest = await friendsService.checkFriendRequestExists(
          targetUserId,
          currentUser.uid
        );

        // If I already sent a request
        if (sentRequest) {
          if (sentRequest.status === 'pending') {
            // Cancel the pending request
            const { deleteDoc, doc: docRef } = await import('firebase/firestore');
            await deleteDoc(docRef(db, 'friendRequests', sentRequest.id));
            setError('Friend request cancelled');
            return;
          } else if (sentRequest.status === 'accepted') {
            // Already friends
            setError('You are already friends with this user');
            return;
          } else {
            setError('Friend request status: ' + sentRequest.status);
            return;
          }
        }

        // If they sent me a request (should accept, not send new)
        if (receivedRequest && receivedRequest.status === 'pending') {
          setError('This user already sent you a request. Check your Requests tab.');
          return;
        }

        // No existing request - send new friend request
          const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');

        await addDoc(collection(db, 'friendRequests'), {
          requesterId: currentUser.uid,
          requesterName: currentUser.displayName || 'Unknown Athlete',
          requesterPhotoURL: currentUser.photoURL || '',
          recipientId: targetUserId,
          recipientName: targetUserName,
          status: 'pending',
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
          message: `${currentUser.displayName || 'An athlete'} wants to be your friend`
        });
      } else if (currentUserRole === 'organization' && targetUserRole === 'athlete') {
        // Organization initiating connection to athlete (peer-to-peer)
        await organizationConnectionService.sendConnectionRequest({
          senderId: currentUser.uid,
          senderName: currentUser.displayName || 'Unknown Organization',
          senderPhotoURL: currentUser.photoURL || '',
          senderRole: 'organization',
          recipientId: targetUserId,
          recipientName: targetUserName,
          recipientPhotoURL: '',
          recipientRole: 'athlete',
          connectionType: 'org_to_athlete'
        });

        console.log('✅ Connection request sent from organization to athlete');
      } else if (currentUserRole === 'athlete' && targetUserRole === 'organization') {
        // Athlete to organization: Use regular friend request system
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');

        await addDoc(collection(db, 'friendRequests'), {
          requesterId: currentUser.uid,
          requesterName: currentUser.displayName || 'Unknown Athlete',
          requesterPhotoURL: currentUser.photoURL || '',
          recipientId: targetUserId,
          recipientName: targetUserName,
          status: 'pending',
          timestamp: serverTimestamp(),
          message: `${currentUser.displayName || 'An athlete'} wants to connect with you`
        });

        console.log('✅ Connection request sent from athlete to organization');
      } else if (currentUserRole === 'coach' && targetUserRole === 'organization') {
        // Coach initiating connection to organization (peer-to-peer)
        await organizationConnectionService.sendConnectionRequest({
          senderId: currentUser.uid,
          senderName: currentUser.displayName || 'Unknown Coach',
          senderPhotoURL: currentUser.photoURL || '',
          senderRole: 'coach',
          recipientId: targetUserId,
          recipientName: targetUserName,
          recipientPhotoURL: '',
          recipientRole: 'organization',
          connectionType: 'coach_to_org'
        });

        console.log('✅ Connection request sent from coach to organization');
      } else {
        // Generic connection request for other role combinations
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');

        await addDoc(collection(db, 'friendRequests'), {
          requesterId: currentUser.uid,
          requesterName: currentUser.displayName || 'Unknown User',
          requesterPhotoURL: currentUser.photoURL || '',
          recipientId: targetUserId,
          recipientName: targetUserName,
          status: 'pending',
          timestamp: serverTimestamp(),
          message: `${currentUser.displayName || 'A user'} wants to connect with you`
        });

        console.log('✅ Connection request sent');
      }

      if (onConnectionRequest) {
        onConnectionRequest();
      }
    } catch (err: any) {
      console.error('❌ Error sending connection request:', err);
      setError(err.message || 'Failed to send connection request');
    } finally {
      setLoading(false);
    }
  };

  // Organization to Athlete: Show "Send Connection Request"
  if (isOrgToAthleteConnection) {
    if (connectionStatus === 'connected') {
      return (
        <button
          className="profile-action-btn message-btn"
          onClick={onOpenChat}
          disabled={loading}
          title="Open chat with this user"
        >
          <MessageSquare size={18} />
          Open Chat
        </button>
      );
    }

    if (connectionStatus === 'pending') {
      return (
        <button
          className="profile-action-btn pending-btn"
          disabled={true}
          title="Waiting for their response to your connection request"
        >
          <Loader size={18} className="spinning" />
          Request Pending
        </button>
      );
    }

    return (
      <>
        <button
          className="profile-action-btn connect-btn"
          onClick={handleSendConnectionRequest}
          disabled={loading}
          title="Send connection request to this user"
        >
          {loading ? (
            <>
              <Loader size={18} className="spinning" />
              Sending...
            </>
          ) : (
            <>
              <Link2 size={18} />
              Send Connection Request
            </>
          )}
        </button>
        {error && <div className="message-btn-error">{error}</div>}
      </>
    );
  }

  // Athlete to Athlete: Show connection/message button
  if (currentUserRole === 'athlete' && targetUserRole === 'athlete') {
    if (connectionStatus === 'connected') {
      return (
        <button
          className="profile-action-btn message-btn"
          onClick={onOpenChat}
          disabled={loading}
          title="Message this athlete"
        >
          <MessageSquare size={18} />
          Message
        </button>
      );
    }

    if (connectionStatus === 'pending') {
      return (
        <button
          className="profile-action-btn pending-btn"
          disabled={true}
          title="Connection request pending"
        >
          <Loader size={18} className="spinning" />
          Request Pending
        </button>
      );
    }

    // If not connected, show "Send Friend Request" button with actual functionality
    return (
      <button
        className="profile-action-btn connect-btn"
        onClick={handleSendConnectionRequest}
        disabled={loading}
        title="Send friend request to this athlete"
      >
        {loading ? (
          <>
            <Loader size={18} className="spinning" />
            Sending...
          </>
        ) : (
          <>
            <Link2 size={18} />
            Send Friend Request
          </>
        )}
      </button>
    );
  }

  // For other role combinations, show message button if connected or generic connect button
  if (connectionStatus === 'connected') {
    return (
      <button
        className="profile-action-btn message-btn"
        onClick={onOpenChat}
        disabled={loading}
        title="Message this user"
      >
        <MessageSquare size={18} />
        Message
      </button>
    );
  }

  // Default: Show generic "Connect" button for any other role combination not yet handled
  return (
    <button
      className="profile-action-btn connect-btn"
      onClick={handleSendConnectionRequest}
      disabled={loading}
      title="Connect with this user"
    >
      {loading ? (
        <>
          <Loader size={18} className="spinning" />
          Sending...
        </>
      ) : (
        <>
          <Link2 size={18} />
          Connect
        </>
      )}
    </button>
  );
};

export default MessageButton;
