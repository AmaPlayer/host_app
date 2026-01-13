import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
// import { db } from '../../lib/firebase'; // Removed Firestore
import { collection, query, where, onSnapshot } from 'firebase/firestore'; // Keeping for notifications momentarily
// TODO: Clean up firestore notification logic if moving to Supabase completely
import { db } from '../../lib/firebase'; // Re-adding for notifications only

import { Search as SearchIcon, UserPlus, Check, X, Filter, MapPin, User as UserIcon, Award, Target, Calendar, Settings, Bell } from 'lucide-react';
import FooterNav from '../../components/layout/FooterNav';
import SettingsMenu from '../../components/common/settings/SettingsMenu';
import NotificationDropdown from '../../components/common/notifications/NotificationDropdown';
import SafeImage from '../../components/common/SafeImage';
import SearchResultItem from './SearchResultItem';
import notificationService from '../../services/notificationService';
import userService from '../../services/api/userService';
import { User } from '../../types/models/user';
import './Search.css';

// Reusing User type from models or defining a subset if needed, but userService returns User[]
// For compatibility with SearchResultItem which expects certain fields, let's map or reuse
interface UserData extends Partial<User> {
  id: string; // Ensure id is required for SearchResultItem
  displayName?: string;
  username?: string;
  email?: string;
  name?: string;
  photoURL?: string;
  // role inherited from Partial<User> is compatible (UserRole is string subset)
  location?: string;
  // Add other fields as necessary
}


interface SearchFilters {
  location: string;
  role: string;
  skill: string;
  sport: string;
  name: string;
  achievement: string;
  sex: string;
  age: string;
  // New athlete-specific filters
  eventType: string;
  position: string;
  subcategory: string;
}

export default function Search() {
  const navigate = useNavigate();
  const { currentUser, isGuest } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<SearchFilters>({
    location: '',
    role: '',
    skill: '',
    sport: '',
    name: '',
    achievement: '',
    sex: '',
    age: '',
    eventType: '',
    position: '',
    subcategory: ''
  });

  // Notification and Settings state
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  // Friend request and friendship tracking is now handled by SearchResultItem components

  // Live search effect with debouncing
  useEffect(() => {
    // Clear existing timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    // Don't search if no criteria and if guest
    if (isGuest()) {
      setSearchResults([]);
      return;
    }

    // Search if there's a search term or any filter applied
    const hasSearchCriteria = searchTerm.trim().length >= 2 ||
      Object.values(filters).some(filter => (filter as string).trim().length > 0);

    if (!hasSearchCriteria) {
      setSearchResults([]);
      return;
    }

    // Set new timer for debounced search
    const timer = setTimeout(() => {
      handleSearch();
    }, 500); // 500ms delay

    setSearchDebounceTimer(timer);

    // Cleanup function
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [searchTerm, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch unread notification count
  useEffect(() => {
    if (!currentUser || isGuest()) {
      setUnreadCount(0);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('receiverId', '==', currentUser.uid),
        where('read', '==', false)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadCount(snapshot.size);
      }, (error) => {
        console.error('Error fetching notification count:', error);
        setUnreadCount(0);
      });

    } catch (error) {
      console.error('Error setting up notification listener:', error);
      setUnreadCount(0);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, isGuest]);



  // Removed matching score calculation logic as it's now handled by DB query

  const handleSearch = async (): Promise<void> => {
    if (isGuest()) {
      return;
    }

    setLoading(true);

    try {
      const results = await userService.searchUsersAdvanced({
        searchTerm: searchTerm,
        filters: {
          role: filters.role,
          location: filters.location,
          sport: filters.sport,
          skill: filters.skill,
          sex: filters.sex,
          age: filters.age,
          eventType: filters.eventType,
          position: filters.position,
          subcategory: filters.subcategory
        },
        limit: 50
      });

      // Filter out current user from results (client-side backup)
      const filteredResults = results
        .filter(u => u.uid !== currentUser?.uid)
        .map(u => ({
          ...u,
          id: u.uid, // Ensure 'id' is present for SearchResultItem (which expects 'id' but User has 'uid')
          // Add other mappings if User model fields differ from SearchResultItem expectations
        })) as UserData[];

      setSearchResults(filteredResults);

    } catch (error: any) {
      console.error('Error searching users:', error);
      alert('Error searching users: ' + error.message);
    }
    setLoading(false);
  };


  // Friend request logic is now handled by SearchResultItem component using useFriendRequest hook

  const handleFilterChange = (filterName: keyof SearchFilters, value: string): void => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = (): void => {
    setFilters({
      location: '',
      role: '',
      skill: '',
      sport: '',
      name: '',
      achievement: '',
      sex: '',
      age: '',
      eventType: '',
      position: '',
      subcategory: ''
    });
    setSearchTerm('');
    setSearchResults([]);
  };


  const hasActiveFilters = Object.values(filters).some(filter => (filter as string).trim().length > 0) || searchTerm.trim().length > 0;

  // Notification and Settings handlers
  const handleSettingsToggle = () => {
    setSettingsOpen(!settingsOpen);
    setNotificationsOpen(false); // Close notifications if open
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const handleNotificationsToggle = () => {
    setNotificationsOpen(!notificationsOpen);
    setSettingsOpen(false); // Close settings if open
  };

  const handleNotificationsClose = () => {
    setNotificationsOpen(false);
  };

  // Guest view
  if (isGuest()) {
    return (
      <div className="search">
        <nav className="nav-bar">
          <div className="nav-content">
            <h1>Search</h1>
            <div className="nav-controls">
              {/* Settings for guest */}
              <div className="settings-container">
                <button
                  ref={settingsButtonRef}
                  className="settings-btn"
                  onClick={handleSettingsToggle}
                  aria-label="Open settings menu"
                  aria-expanded={settingsOpen}
                  aria-haspopup="true"
                  title="Settings"
                  type="button"
                >
                  <Settings size={20} aria-hidden="true" />
                  <span className="sr-only">Settings</span>
                </button>

                <SettingsMenu
                  isOpen={settingsOpen}
                  onClose={handleSettingsClose}
                  isGuest={true}
                  triggerButtonRef={settingsButtonRef}
                  currentUser={null}
                />
              </div>
            </div>
          </div>
        </nav>

        <div className="main-content search-content">
          <div className="guest-restriction">
            <div className="guest-restriction-content">
              <SearchIcon size={48} />
              <h2>User Search</h2>
              <p>🔒 Guest accounts cannot search for users</p>
              <p>Sign up to find and connect with friends!</p>
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

  return (
    <div className="search">
      <nav className="nav-bar">
        <div className="nav-content">
          <h1>Search</h1>
          <div className="nav-controls">
            {/* Notifications */}
            <div className="notifications-container">
              <button
                ref={notificationButtonRef}
                className="notification-btn"
                onClick={handleNotificationsToggle}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                aria-expanded={notificationsOpen}
                aria-haspopup="true"
                title="Notifications"
                type="button"
              >
                <Bell size={20} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                <span className="sr-only">
                  Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}
                </span>
              </button>

              <NotificationDropdown
                isOpen={notificationsOpen}
                onClose={handleNotificationsClose}
                triggerButtonRef={notificationButtonRef}
              />
            </div>

            {/* Settings */}
            <div className="settings-container">
              <button
                ref={settingsButtonRef}
                className="settings-btn"
                onClick={handleSettingsToggle}
                aria-label="Open settings menu"
                aria-expanded={settingsOpen}
                aria-haspopup="true"
                title="Settings"
                type="button"
              >
                <Settings size={20} aria-hidden="true" />
                <span className="sr-only">Settings</span>
              </button>

              <SettingsMenu
                isOpen={settingsOpen}
                onClose={handleSettingsClose}
                isGuest={false}
                triggerButtonRef={settingsButtonRef}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="main-content search-content">
        <div className="search-bar">
          <div className="search-input-container">
            <SearchIcon size={20} />
            <input
              type="text"
              placeholder="Search users by name, email, or display name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <button
              className="filter-toggle-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              Filters
            </button>
            <button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="search-filters">
            <div className="filters-header">
              <h3><Filter size={20} />Advanced Filters</h3>
              {hasActiveFilters && (
                <button className="clear-filters-btn" onClick={clearFilters}>
                  <X size={16} />
                  Clear All
                </button>
              )}
            </div>

            <div className="filters-grid">
              <div className="filter-group">
                <label><MapPin size={16} />Location</label>
                <input
                  type="text"
                  placeholder="City, State, Country"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><UserIcon size={16} />Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="athlete">Athlete</option>
                  <option value="coach">Coach</option>
                  <option value="organisation">Organization</option>
                </select>
              </div>

              <div className="filter-group">
                <label><Target size={16} />Skill</label>
                <input
                  type="text"
                  placeholder="e.g., Swimming, Running"
                  value={filters.skill}
                  onChange={(e) => handleFilterChange('skill', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><Target size={16} />Sport</label>
                <input
                  type="text"
                  placeholder="e.g., Football, Basketball"
                  value={filters.sport}
                  onChange={(e) => handleFilterChange('sport', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><UserIcon size={16} />Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><Award size={16} />Achievement</label>
                <input
                  type="text"
                  placeholder="e.g., Gold Medal, Champion"
                  value={filters.achievement}
                  onChange={(e) => handleFilterChange('achievement', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><UserIcon size={16} />Gender</label>
                <select
                  value={filters.sex}
                  onChange={(e) => handleFilterChange('sex', e.target.value)}
                >
                  <option value="">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="filter-group">
                <label><Calendar size={16} />Exact Age</label>
                <input
                  type="number"
                  placeholder="e.g., 25"
                  min="13"
                  max="100"
                  value={filters.age}
                  onChange={(e) => handleFilterChange('age', e.target.value)}
                />
              </div>

              {/* New Athlete-Specific Filters */}
              <div className="filter-group">
                <label><Target size={16} />Event Type</label>
                <input
                  type="text"
                  placeholder="e.g., 5000m, marathon"
                  value={filters.eventType}
                  onChange={(e) => handleFilterChange('eventType', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><Target size={16} />Position</label>
                <input
                  type="text"
                  placeholder="e.g., distance-runner, sprinter"
                  value={filters.position}
                  onChange={(e) => handleFilterChange('position', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><Target size={16} />Subcategory</label>
                <input
                  type="text"
                  placeholder="e.g., long-distance, middle-distance"
                  value={filters.subcategory}
                  onChange={(e) => handleFilterChange('subcategory', e.target.value)}
                />
              </div>

            </div>
          </div>
        )}

        <div className="search-results">
          {searchTerm && searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
            <div className="search-placeholder">
              <SearchIcon size={48} />
              <h3>Keep typing...</h3>
              <p>Type at least 2 characters to start searching</p>
            </div>
          )}

          {searchResults.length === 0 && searchTerm && searchTerm.trim().length >= 2 && !loading && (
            <div className="empty-state">
              <SearchIcon size={48} />
              <h3>No users found</h3>
              <p>Try searching with different keywords</p>
            </div>
          )}

          {searchResults.length === 0 && !searchTerm && (
            <div className="search-placeholder">
              <SearchIcon size={48} />
              <h3>Find Friends</h3>
              <p>Start typing to search for users and send friend requests</p>
            </div>
          )}

          {searchResults.map((user) => (
            <SearchResultItem key={user.id} user={user} />
          ))}
        </div>
      </div>

      <FooterNav />
    </div>
  );
}
