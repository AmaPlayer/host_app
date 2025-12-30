import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Check, X, MapPin, Target, Calendar, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFriendRequest } from '../../hooks/useFriendRequest';
import SafeImage from '../../components/common/SafeImage';

interface UserData {
  id: string;
  displayName?: string;
  username?: string;
  email?: string;
  name?: string;
  bio?: string;
  photoURL?: string;
  location?: string;
  role?: string;
  skills?: string[];
  sport?: string;
  sex?: string;
  age?: number | string;
  achievements?: Array<{ title: string }>;
}

interface SearchResultItemProps {
  user: UserData;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ user }) => {
  const navigate = useNavigate();
  const { currentUser, isGuest } = useAuth();

  // Use the unified friend request hook for this user
  const { requestState, sendRequest, cancelRequest } = useFriendRequest({
    currentUserId: currentUser?.uid || '',
    currentUserName: currentUser?.displayName || 'Unknown User',
    currentUserRole: 'athlete', // Default to athlete for search
    currentUserPhoto: currentUser?.photoURL || '',
    targetUserId: user.id,
    targetUserName: user.displayName || user.name || 'Anonymous User',
    targetUserRole: user.role || 'athlete',
    targetUserPhoto: user.photoURL || '',
    onSuccess: (message) => {
      // Could show toast notification here
      console.log(message);
    },
    onError: (message) => {
      alert(message);
    }
  });

  const handleSendOrCancelRequest = async () => {
    // Check if guest
    if (isGuest()) {
      if (window.confirm('Please sign up or log in to send friend requests.\n\nWould you like to go to the login page?')) {
        navigate('/login');
      }
      return;
    }

    // If pending, cancel the request
    if (requestState.status === 'pending_sent') {
      await cancelRequest();
    } else {
      // Otherwise, send a new request
      await sendRequest();
    }
  };

  const renderActionButton = () => {
    // Don't show button for current user
    if (currentUser?.uid === user.id) {
      return null;
    }

    // Already friends
    if (requestState.status === 'accepted') {
      return (
        <button className="friend-btn" disabled>
          <Check size={16} />
          Friends
        </button>
      );
    }

    // Request pending (sent by current user)
    if (requestState.status === 'pending_sent') {
      return (
        <button
          className="cancel-btn"
          onClick={handleSendOrCancelRequest}
          disabled={requestState.loading}
        >
          {requestState.loading ? (
            <>
              <Loader size={16} className="spinning" />
              Canceling...
            </>
          ) : (
            <>
              <X size={16} />
              Cancel Request
            </>
          )}
        </button>
      );
    }

    // Request received from target user
    if (requestState.status === 'pending_received') {
      return (
        <button className="add-friend-btn" disabled>
          <Check size={16} />
          Request Received
        </button>
      );
    }

    // Loading status
    if (requestState.status === 'loading') {
      return (
        <button className="add-friend-btn" disabled>
          <Loader size={16} className="spinning" />
          Loading...
        </button>
      );
    }

    // Default: No connection
    return (
      <button
        className="add-friend-btn"
        onClick={handleSendOrCancelRequest}
        disabled={requestState.loading}
      >
        {requestState.loading ? (
          <>
            <Loader size={16} className="spinning" />
            Sending...
          </>
        ) : (
          <>
            <UserPlus size={16} />
            Add Friend
          </>
        )}
      </button>
    );
  };

  return (
    <div className="user-result">
      <div className="user-avatar" onClick={() => navigate(`/profile/${user.id}`)}>
        <SafeImage
          src={user.photoURL}
          alt={user.displayName}
          placeholder="avatar"
          className="user-avatar-image"
        />
      </div>
      <div className="user-info" onClick={() => navigate(`/profile/${user.id}`)}>
        <strong>{user.displayName || 'Anonymous User'}</strong>
        {user.username && <span className="user-handle">@{user.username}</span>}
        <div className="user-details">
          {user.role && <span className="user-role">{user.role}</span>}
          {user.location && <span className="user-location"><MapPin size={12} />{user.location}</span>}
          {user.sport && <span className="user-sport"><Target size={12} />{user.sport}</span>}
          {user.sex && <span className="user-sex">{user.sex}</span>}
          {user.age && <span className="user-age"><Calendar size={12} />{user.age} years</span>}
        </div>
      </div>
      <div className="user-actions">
        <div className="social-actions">
          {renderActionButton()}
        </div>
      </div>
    </div>
  );
};

export default SearchResultItem;
