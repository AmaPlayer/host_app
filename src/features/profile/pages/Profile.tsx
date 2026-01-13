import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Edit3 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import NavigationBar from '../../../components/layout/NavigationBar';
import FooterNav from '../../../components/layout/FooterNav';
import { db } from '../../../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import RoleSelector from '../components/RoleSelector';
import RoleSpecificSections from '../components/RoleSpecificSections';
import ProfilePictureManager from '../components/ProfilePictureManager';
import CoverPhotoManager from '../components/CoverPhotoManager';
import SportBanner from '../components/SportBanner';
// Performance monitoring disabled - causing warnings
// import { usePerformanceMonitoring, useMemoryMonitoring } from '../hooks/usePerformanceMonitoring';
import {
  UserRole,
  PersonalDetails,
  PhysicalAttributes,
  TrackBest,
  Achievement,
  Certificate,
  Post,
  roleConfigurations
} from '../types/ProfileTypes';
import { TalentVideo } from '../types/TalentVideoTypes';
import PhysicalAttributesSection from '../components/PhysicalAttributesSection';
import TrackBestSection from '../components/TrackBestSection';
import AchievementsCertificatesSection from '../components/AchievementsCertificatesSection';
import MessageButton from '../components/MessageButton';
import { organizationConnectionService } from '../../../services/api/organizationConnectionService';
import friendsService from '../../../services/api/friendsService';
import { useRealtimeFriendRequests } from '../../../hooks/useRealtimeFriendRequests';
import userService from '../../../services/api/userService';
import { COLLECTIONS } from '../../../constants/firebase';
import '../styles/Profile.css';

// Import Verification Badge
import VerificationBadge from '../../../components/common/ui/VerificationBadge';
import { talentVideoService } from '../../../services/api/talentVideoService';


// Lazy load heavy components for better performance
const TalentVideosSection = lazy(() => import('../components/TalentVideosSection'));
const PostsSection = lazy(() => import('../components/PostsSection'));
const EditProfileModal = lazy(() => import('../components/EditProfileModal'));
const PersonalDetailsModal = lazy(() => import('../components/PersonalDetailsModal'));
const PhysicalAttributesModal = lazy(() => import('../components/PhysicalAttributesModal'));
const TrackBestModal = lazy(() => import('../components/TrackBestModal'));
const AchievementsSectionModal = lazy(() => import('../components/AchievementsSectionModal'));
const CertificatesSectionModal = lazy(() => import('../components/CertificatesSectionModal'));

const Profile: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const { currentUser: firebaseUser, isGuest, updateUserProfile } = useAuth();
  const { t } = useLanguage();
  const [currentRole, setCurrentRole] = useState<UserRole>('athlete');
  const [viewerRole, setViewerRole] = useState<string>('athlete'); // Viewer's role
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Fetch viewer's role (current user)
  useEffect(() => {
    const fetchViewerRole = async () => {
      // 1. Try localStorage first (fastest)
      const storedRole = localStorage.getItem('userRole');
      if (storedRole) {
        setViewerRole(storedRole);
        return;
      }

      // 2. Fetch from Firestore if not in localStorage and user is logged in
      if (firebaseUser?.uid) {
        try {
          const profile = await userService.getUserProfile(firebaseUser.uid);
          if (profile?.role) {
            setViewerRole(profile.role);
            localStorage.setItem('userRole', profile.role);
          }
        } catch (err) {
          console.error('Error fetching viewer role:', err);
        }
      }
    };

    fetchViewerRole();
  }, [firebaseUser]);

  // Performance monitoring - Disabled to prevent warnings
  // const { measureRender, logRenderTime } = usePerformanceMonitoring('Profile');
  // useMemoryMonitoring();

  // Measure render performance
  // measureRender();

  // Determine if this is the current user's profile or another user's profile
  const isOwner = !userId || userId === firebaseUser?.uid;

  // Helper function to safely extract name from object or return string value
  const getDisplayValue = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'name' in value) {
      return value.name as string;
    }
    return undefined;
  };

  // Format date to dd-mm-yyyy
  const formatDateOfBirth = (dateString: string | undefined): string => {
    if (!dateString) return 'Not specified';

    try {
      // Check if date is in YYYY-MM-DD format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}-${month}-${year}`;
      }

      // If it's already in dd-mm-yyyy or another format, return as is
      return dateString;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const safeToDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate(); // Firebase Timestamp
    }
    if (timestamp instanceof Date) {
      return timestamp; // Already a Date
    }
    // For strings (ISO) or numbers (Unix)
    return new Date(timestamp);
  };

  const [personalDetails, setPersonalDetails] = useState<PersonalDetails>({
    name: 'Loading...',
    username: 'loading...'
  });

  const [physicalAttributes, setPhysicalAttributes] = useState<PhysicalAttributes>({
    height: undefined,
    weight: undefined,
    dominantSide: undefined,
    personalBest: undefined,
    seasonBest: undefined,
    coachName: undefined,
    coachContact: undefined,
    trainingAcademy: undefined,
    schoolName: undefined,
    clubName: undefined
  });

  const [trackBest, setTrackBest] = useState<TrackBest>({
    runs: undefined,
    overs: undefined,
    strikeRate: undefined,
    goals: undefined,
    minutes: undefined,
    assists: undefined,
    points: undefined,
    rebounds: undefined,
    gameTime: undefined,
    aces: undefined,
    winners: undefined,
    matchDuration: undefined,
    field1: undefined,
    field2: undefined,
    field3: undefined,
    sport: undefined,
    matchDate: undefined,
    opponent: undefined,
    venue: undefined
  });

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [talentVideos, setTalentVideos] = useState<TalentVideo[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [uploadingCoverPhoto, setUploadingCoverPhoto] = useState(false);
  const [athleteSports, setAthleteSports] = useState<Array<{ id: string; name: string }>>([]);



  useEffect(() => {
    let isMounted = true;

    // Scroll to top immediately when profile changes
    window.scrollTo(0, 0);

    const loadProfileData = async () => {
      try {
        setIsLoading(true);
        // Reset states to prevent showing stale data
        setPosts([]);
        setTalentVideos([]);
        setAchievements([]);
        setCertificates([]);
        setError(null);

        const { doc, getDoc, collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
        const { db } = await import('../../../lib/firebase');

        const targetUserId = userId || firebaseUser?.uid;

        if (!targetUserId) {
          if (isMounted) {
            setError('No user ID available');
            setIsLoading(false);
          }
          return;
        }

        // 1. Fetch User Profile
        try {
          const userData = await userService.getUserProfile(targetUserId);

          if (!isMounted) return;

          if (userData) {
            // Set role from the fetched user data
            if (isOwner && userData.role) {
              setCurrentRole(userData.role as UserRole);
            }

            // Set personal details
            const sportData = userData.sportDetails && userData.sportDetails.length > 0
              ? userData.sportDetails[0].name
              : userData.sports?.[0] || undefined;

            const positionData = userData.positionName || userData.position;

            setPersonalDetails({
              name: userData.displayName || (userData as any)?.organizationName || (userData as any)?.parentFullName || (userData as any)?.fullName || firebaseUser?.displayName || 'User',
              username: userData.username || '',
              isVerified: userData.isVerified || (userData as any)?.is_verified || false,
              dateOfBirth: userData.dateOfBirth || (userData as any)?.child?.dateOfBirth,
              gender: userData.gender || (userData as any)?.child?.gender,
              mobile: userData.mobile || (userData as any)?.primaryPhone || (userData as any)?.mobileNumber || (userData as any)?.phone,
              email: userData.email || (userData as any)?.primaryEmail,
              city: userData.city || (userData as any)?.address?.city || (userData as any)?.child?.city,
              district: undefined,
              state: userData.state || (userData as any)?.address?.state || (userData as any)?.child?.state,
              country: userData.country || (userData as any)?.address?.country || (userData as any)?.child?.country,
              playerType: undefined,
              sport: sportData || (userData as any)?.sport,
              position: positionData,
              // Organization fields
              organizationName: (userData as any)?.organizationName,
              organizationType: (userData as any)?.organizationType,
              location: userData.location,
              contactEmail: (userData as any)?.primaryEmail || userData.email,
              website: (userData as any)?.website || userData.website,
              contactPerson: (userData as any)?.contactPerson,
              designation: (userData as any)?.designation,
              primaryPhone: (userData as any)?.primaryPhone,
              secondaryPhone: (userData as any)?.secondaryPhone,
              registrationNumber: (userData as any)?.registrationNumber,
              yearEstablished: (userData as any)?.yearEstablished,
              address: (userData as any)?.address,
              sports: (userData as any)?.sports,
              numberOfPlayers: (userData as any)?.numberOfPlayers,
              ageGroups: (userData as any)?.ageGroups,
              facilities: (userData as any)?.facilities,
              achievements: (userData as any)?.achievements,
              // Parent fields
              parentFullName: (userData as any)?.parentFullName,
              relationship: (userData as any)?.relationshipToChild,
              relationshipToChild: (userData as any)?.relationshipToChild,
              mobileNumber: (userData as any)?.mobileNumber,
              connectedAthletes: [],
              child: (userData as any)?.child,
              schoolInfo: (userData as any)?.schoolInfo,
              childSports: (userData as any)?.sports,
              aspirations: (userData as any)?.aspirations,
              contentConsent: (userData as any)?.contentConsent,
              // Coach fields
              fullName: (userData as any)?.fullName,
              phone: (userData as any)?.phone,
              specializations: userData.specializations || [],
              yearsExperience: typeof (userData as any)?.yearsExperience === 'string'
                ? parseInt((userData as any).yearsExperience, 10)
                : (userData as any)?.yearsExperience || 0,
              coachingLevel: (userData as any)?.coachingLevel,
              certifications: (userData as any)?.certifications,
              bio: (userData as any)?.bio || userData.bio
            });

            // Set physical attributes
            setPhysicalAttributes({
              height: userData.height ? parseInt(userData.height as string, 10) : undefined,
              weight: userData.weight ? parseInt(userData.weight as string, 10) : undefined,
              dominantSide: undefined,
              personalBest: undefined,
              seasonBest: undefined,
              coachName: undefined,
              coachContact: undefined,
              trainingAcademy: undefined,
              schoolName: undefined,
              clubName: undefined
            });

            // Load talent videos
            try {
              const videos = await talentVideoService.getUserTalentVideos(targetUserId);
              if (isMounted) {
                setTalentVideos(videos);
              }
            } catch (videoError) {
              console.error('Error loading talent videos:', videoError);
            }

            if (isMounted) {
              // setTalentVideos call is handled in the try-catch block above
              setTrackBest({});
              setProfilePicture(userData.photoURL || null);
              setCoverPhoto(null);
              setAthleteSports(userData.sportDetails || []);
            }

            // 2. Load User Posts
            try {
              const postsService = (await import('../../../services/api/postsService')).default;
              const serverPosts = await postsService.getUserPosts(targetUserId);

              const userPosts: Post[] = serverPosts.map((post: any) => ({
                id: post.id,
                type: post.mediaType === 'image' || post.media_type === 'image' ? 'photo' :
                  post.mediaType === 'video' || post.media_type === 'video' ? 'video' : 'text',
                title: '',
                content: post.caption || '',
                mediaUrls: post.mediaUrl ? [post.mediaUrl] : [],
                thumbnailUrl: post.thumbnailUrl || (post.mediaType === 'video' ? undefined : post.mediaUrl),
                createdDate: post.createdAt ? new Date(post.createdAt) : new Date(),
                likes: post.likesCount || 0,
                comments: post.commentsCount || 0,
                isPublic: post.visibility === 'public',
                isRepost: post.isRepost,
                sharerName: post.sharerName,
                originalPost: post.originalPost ? {
                  id: post.originalPost.id,
                  type: post.originalPost.mediaType === 'image' ? 'photo' : post.originalPost.mediaType === 'video' ? 'video' : 'text',
                  content: post.originalPost.caption || '',
                  mediaUrls: post.originalPost.mediaUrl ? [post.originalPost.mediaUrl] : [],
                  thumbnailUrl: post.originalPost.mediaType === 'video' ? undefined : post.originalPost.mediaUrl,
                  userDisplayName: post.originalPost.userDisplayName,
                  userPhotoURL: post.originalPost.userPhotoURL || undefined,
                  createdDate: post.originalPost.createdAt ? new Date(post.originalPost.createdAt) : new Date()
                } : undefined
              }));

              if (isMounted) {
                setPosts(userPosts);
              }
            } catch (postsError) {
              console.error('Error loading user posts:', postsError);
              if (isMounted) {
                setPosts([]);
              }
            }

          } else if (isOwner) {
            // New user initialization logic
            const defaultProfile: PersonalDetails = {
              name: firebaseUser?.displayName || 'User',
              username: firebaseUser?.displayName?.replace(/\s+/g, '_').toLowerCase() || 'user'
            };

            if (isMounted) {
              setPersonalDetails(defaultProfile);
            }

            const defaultRole: UserRole = 'athlete';

            if (isMounted) {
              setCurrentRole(defaultRole);
              setPosts([]);
            }

            // Create profile using service (Supabase)
            try {
              await userService.createRoleSpecificProfile(targetUserId, defaultRole, {
                ...defaultProfile,
                email: firebaseUser?.email,
                photoURL: firebaseUser?.photoURL
              });
            } catch (createError) {
              console.error("Error creating initial profile:", createError);
            }

          } else {
            if (isMounted) {
              setError('User not found');
            }
          }
        } catch (fetchError) {
          console.error('Error fetching user profile:', fetchError);
          if (isMounted) {
            setError('Failed to load user profile');
          }
        }
      } catch (err) {
        console.error('Error in loadProfileData:', err);
        if (isMounted) {
          setError('Failed to load profile data');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfileData();

    return () => {
      isMounted = false;
    };
  }, [userId, isOwner, firebaseUser]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleGoBack = () => {
    navigate(-1); // Go back to previous page
  };

  const handleTitleClick = () => {
    navigate('/home');
  };

  const [editModalInitialTab, setEditModalInitialTab] = useState<string>('personal');
  const [isPersonalDetailsModalOpen, setIsPersonalDetailsModalOpen] = useState(false);
  const [isPhysicalAttributesModalOpen, setIsPhysicalAttributesModalOpen] = useState(false);
  const [isTrackBestModalOpen, setIsTrackBestModalOpen] = useState(false);
  const [isAchievementsSectionModalOpen, setIsAchievementsSectionModalOpen] = useState(false);
  const [isCertificatesSectionModalOpen, setIsCertificatesSectionModalOpen] = useState(false);

  const handleEditProfile = useCallback(() => {
    setIsEditModalOpen(true);
  }, []);

  const handleEditPersonalDetails = useCallback(() => {
    setIsPersonalDetailsModalOpen(true);
  }, []);

  const handleEditPhysicalAttributes = useCallback(() => {
    setIsPhysicalAttributesModalOpen(true);
  }, []);

  const handleEditAchievements = useCallback(() => {
    setIsAchievementsSectionModalOpen(true);
  }, []);

  const handleEditTrackBest = useCallback(() => {
    setIsTrackBestModalOpen(true);
  }, []);

  const handleEditCertificates = useCallback(() => {
    setIsCertificatesSectionModalOpen(true);
  }, []);

  const handleEditProfileWithTab = useCallback((initialTab: string) => {
    // Route to specific section modals instead of the big modal
    switch (initialTab) {
      case 'personal':
        setIsPersonalDetailsModalOpen(true);
        break;
      case 'physicalAttributes':
        setIsPhysicalAttributesModalOpen(true);
        break;
      case 'trackBest':
        setIsTrackBestModalOpen(true);
        break;
      case 'achievements':
        setIsAchievementsSectionModalOpen(true);
        break;
      case 'certificates':
        setIsCertificatesSectionModalOpen(true);
        break;
      default:
        setEditModalInitialTab(initialTab);
        setIsEditModalOpen(true);
        break;
    }
  }, []);

  const handleOpenEditModal = useCallback((initialTab: string) => {
    // Route to specific section modals instead of the big modal
    switch (initialTab) {
      case 'personal':
        setIsPersonalDetailsModalOpen(true);
        break;
      case 'physicalAttributes':
        setIsPhysicalAttributesModalOpen(true);
        break;
      case 'trackBest':
        setIsTrackBestModalOpen(true);
        break;
      case 'achievements':
        setIsAchievementsSectionModalOpen(true);
        break;
      case 'certificates':
        setIsCertificatesSectionModalOpen(true);
        break;
      default:
        setEditModalInitialTab(initialTab);
        setIsEditModalOpen(true);
        break;
    }
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && isEditModalOpen) {
      setIsEditModalOpen(false);
    }
  }, [isEditModalOpen]);

  // Announce content changes to screen readers
  const announceToScreenReader = useCallback((message: string) => {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }, []);

  // Handle role change with Firestore persistence
  const handleRoleChange = useCallback(async (newRole: UserRole) => {
    setCurrentRole(newRole);

    // Persist role selection to Firestore
    if (firebaseUser?.uid) {
      try {
        await userService.updateUserProfile(firebaseUser.uid, { role: newRole });

        // Clear sport-related localStorage for organizations and coaches
        // to prevent showing athlete-specific data
        if (newRole === 'organization' || newRole === 'coach') {
          localStorage.removeItem('userSport');
          localStorage.removeItem('userPosition');
          localStorage.removeItem('userPlayerType');
        }
        if (newRole === 'organization') {
          localStorage.removeItem('userSpecializations');
        }

        // Update role in localStorage
        localStorage.setItem('userRole', newRole);

        // Dispatch custom event to notify other components about role change
        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
          detail: { role: newRole }
        }));
        announceToScreenReader(`Role changed to ${roleConfigurations[newRole].displayName}`);
      } catch (error) {
        console.error('Error saving role:', error);
        announceToScreenReader('Failed to save role change');
      }
    }
  }, [firebaseUser, announceToScreenReader]);

  // Performance optimization: Memoize expensive computations
  const profileStats = useMemo(() => ({
    posts: posts.length,
    followers: 1, // Mock data
    following: 0  // Mock data
  }), [posts.length]);

  // Memoize expensive computations
  const currentRoleConfig = useMemo(() => roleConfigurations[currentRole], [currentRole]);
  const sections = useMemo(() => currentRoleConfig.sections, [currentRoleConfig]);

  // Memoize handlers to prevent unnecessary re-renders
  const achievementHandlers = useMemo(() => ({
    onAddAchievement: () => {
      // Handle add achievement - would open add modal
      announceToScreenReader('Opening add achievement form');
    },
    onEditAchievement: (achievement: Achievement) => {
      // Handle edit achievement - would open edit modal
      announceToScreenReader(`Editing achievement: ${achievement.title}`);
    },
    onDeleteAchievement: async (id: string) => {
      try {
        const achievement = achievements.find(a => a.id === id);
        const updatedAchievements = achievements.filter(a => a.id !== id);

        // Update local state
        setAchievements(updatedAchievements);

        // Save to Firebase
        if (firebaseUser?.uid) {
          await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, { achievements: updatedAchievements });
        }

        announceToScreenReader(`Achievement ${achievement?.title || ''} deleted`);
      } catch (error) {
        console.error('Error deleting achievement:', error);
        announceToScreenReader('Failed to delete achievement');
      }
    }
  }), [announceToScreenReader, achievements, firebaseUser, currentRole]);

  const certificateHandlers = useMemo(() => ({
    onAddCertificate: () => {
      // Handle add certificate - would open add modal
      announceToScreenReader('Opening add certificate form');
    },
    onEditCertificate: (certificate: Certificate) => {
      // Handle edit certificate - would open edit modal
      announceToScreenReader(`Editing certificate: ${certificate.name}`);
    },
    onDeleteCertificate: async (id: string) => {
      try {
        const certificate = certificates.find(c => c.id === id);
        const updatedCertificates = certificates.filter(c => c.id !== id);

        // Update local state
        setCertificates(updatedCertificates);

        // Save to Firebase
        if (firebaseUser?.uid) {
          await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, { certificates: updatedCertificates });
        }

        announceToScreenReader(`Certificate ${certificate?.name || ''} deleted`);
      } catch (error) {
        console.error('Error deleting certificate:', error);
        announceToScreenReader('Failed to delete certificate');
      }
    }
  }), [announceToScreenReader, certificates, firebaseUser, currentRole]);

  // Function to reload talent videos from Firestore talentVideos collection
  const reloadTalentVideos = useCallback(async () => {
    try {
      if (!firebaseUser?.uid) return;

      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../../lib/firebase');

      const talentVideosRef = collection(db, 'talentVideos');
      const q = query(talentVideosRef, where('userId', '==', firebaseUser.uid));
      const snapshot = await getDocs(q);

      const videos: TalentVideo[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        videos.push({
          ...data,
          id: doc.id,
          uploadDate: data.uploadDate?.toDate ? data.uploadDate.toDate() : data.uploadDate,
          verificationDeadline: data.verificationDeadline?.toDate ? data.verificationDeadline.toDate() : undefined
        } as TalentVideo);
      });

      setTalentVideos(videos);
    } catch (error) {
      console.error('Error reloading talent videos:', error);
    }
  }, [firebaseUser]);

  const videoHandlers = useMemo(() => ({
    onAddVideo: () => {
      // Handle add video - reload videos after upload
      // The TalentVideosSection handles the actual upload
      announceToScreenReader('Opening add video form');
    },
    onEditVideo: async (video: TalentVideo) => {
      try {
        // Update local state
        const updatedVideos = talentVideos.map(v => v.id === video.id ? video : v);
        setTalentVideos(updatedVideos);

        // Save to Firebase
        if (firebaseUser?.uid) {
          // Talent Videos still use Firestore collection 'talentVideos', but we also update the user profile copy if it exists
          // For now, assuming talent videos are separate. If they were in profile:
          await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, { talentVideos: updatedVideos });
        }

        announceToScreenReader(`Video ${video.title} updated`);
      } catch (error) {
        console.error('Error updating video:', error);
        announceToScreenReader('Failed to update video');
      }
    },
    onDeleteVideo: async (id: string) => {
      try {
        const video = talentVideos.find(v => v.id === id);
        const updatedVideos = talentVideos.filter(v => v.id !== id);

        // Update local state
        setTalentVideos(updatedVideos);

        // Save to Firebase
        if (firebaseUser?.uid) {
          await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, { talentVideos: updatedVideos });

          // Also try to delete video and thumbnail from storage
          try {
            const { storageService } = await import('../../../services/storage');

            // Extract filename from video URL
            if (video?.videoUrl) {
              await storageService.deleteFile(video.videoUrl).catch(() => { });
            }

            // Delete thumbnail
            if (video?.thumbnailUrl) {
              await storageService.deleteFile(video.thumbnailUrl).catch(() => { });
            }
          } catch (storageError) {
            console.warn('Error deleting video files from storage:', storageError);
          }
        }

        announceToScreenReader(`Video ${video?.title || ''} deleted`);
      } catch (error) {
        console.error('Error deleting video:', error);
        announceToScreenReader('Failed to delete video');
      }
    },
    onVideoClick: (video: TalentVideo) => {
      // Handle video click - would open video player modal
      announceToScreenReader(`Playing video: ${video.title}`);
    }
  }), [announceToScreenReader, talentVideos, firebaseUser, currentRole]);

  // Auto-play video from share link
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('video');

    if (videoId && talentVideos.length > 0 && !isLoading) {
      // Find the video with matching ID
      const video = talentVideos.find(v => v.id === videoId);

      if (video) {
        // Scroll to talent videos section and open video player
        setTimeout(() => {
          const videoSection = document.getElementById('talent-videos-section');
          if (videoSection) {
            videoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }

          // Trigger video click to open player
          videoHandlers.onVideoClick(video);
        }, 500); // Small delay to ensure page is fully rendered
      }
    }
  }, [talentVideos, isLoading, videoHandlers]);

  const postHandlers = useMemo(() => ({
    onPostClick: (post: Post) => {
      // Handle post click - would navigate to post detail
      announceToScreenReader(`Opening post: ${post.title || 'Untitled post'}`);
    },
    onEditPost: async (id: string, postData: Omit<Post, 'id' | 'createdDate' | 'likes' | 'comments'>) => {
      try {
        if (!firebaseUser?.uid) {
          throw new Error('User not authenticated');
        }

        // Update post document in posts collection
        const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../../../lib/firebase');

        const postRef = doc(db, 'posts', id);
        await updateDoc(postRef, {
          ...postData,
          updatedAt: serverTimestamp()
        });

        // Update local state
        const updatedPosts = posts.map(p => p.id === id ? { ...p, ...postData } : p);
        setPosts(updatedPosts);

        announceToScreenReader('Post updated successfully');
      } catch (error) {
        console.error('Error updating post:', error);
        announceToScreenReader('Failed to update post');
      }
    },
    onDeletePost: async (id: string) => {
      try {
        if (!firebaseUser?.uid) {
          throw new Error('User not authenticated');
        }

        const post = posts.find(p => p.id === id);

        // Delete post document from posts collection
        const { doc, deleteDoc } = await import('firebase/firestore');
        const { db } = await import('../../../lib/firebase');

        const postRef = doc(db, 'posts', id);
        await deleteDoc(postRef);

        // Update local state
        const updatedPosts = posts.filter(p => p.id !== id);
        setPosts(updatedPosts);

        announceToScreenReader(`Post ${post?.title || ''} deleted`);
      } catch (error) {
        console.error('Error deleting post:', error);
        announceToScreenReader('Failed to delete post');
      }
    }
  }), [announceToScreenReader, posts, firebaseUser]);

  // Handler for personal details modal
  const handleSavePersonalDetails = useCallback(async (updatedPersonalDetails: PersonalDetails) => {
    try {
      // Update local state immediately for better UX
      setPersonalDetails(updatedPersonalDetails);

      // Save to Firebase
      if (firebaseUser?.uid) {
        // Update base user details
        await userService.updateUserProfile(firebaseUser.uid, {
          displayName: updatedPersonalDetails.name,
          username: updatedPersonalDetails.username,
          email: updatedPersonalDetails.email,
          location: updatedPersonalDetails.location,
          website: updatedPersonalDetails.website
        });

        // Update role specific details
        await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, updatedPersonalDetails);

        // Dispatch custom event to notify other components about profile update
        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
          detail: { personalDetails: updatedPersonalDetails }
        }));
      }

      setIsPersonalDetailsModalOpen(false);
      announceToScreenReader('Personal details updated successfully');
    } catch (error) {
      console.error('Error saving personal details:', error);
      announceToScreenReader('Failed to save personal details');
      alert('Failed to save personal details. Please try again.');
    }
  }, [announceToScreenReader, firebaseUser, currentRole]);

  // Handler for physical attributes modal
  const handleSavePhysicalAttributes = useCallback(async (updatedPhysicalAttributes: PhysicalAttributes) => {
    try {
      // Update local state immediately for better UX
      setPhysicalAttributes(updatedPhysicalAttributes);

      // Save to Firebase
      if (firebaseUser?.uid) {
        await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, updatedPhysicalAttributes);
      }

      setIsPhysicalAttributesModalOpen(false);
      announceToScreenReader('Physical attributes updated successfully');
    } catch (error) {
      console.error('Error saving physical attributes:', error);
      announceToScreenReader('Failed to save physical attributes');
      alert('Failed to save physical attributes. Please try again.');
    }
  }, [announceToScreenReader, firebaseUser, currentRole]);

  // Handler for organization info modal
  const handleSaveOrganizationInfo = useCallback(async (updatedPersonalDetails: PersonalDetails) => {
    try {
      // Update local state immediately for better UX
      setPersonalDetails(updatedPersonalDetails);

      // Save to Firebase
      if (firebaseUser?.uid) {
        // Fetch user's actual role from database to ensure we use the correct collection
        const userData = await userService.getUserProfile(firebaseUser.uid);
        const userActualRole = (userData?.role as UserRole) || currentRole;

        console.log(`📝 Saving organization info for role: ${userActualRole}`);

        await userService.updateRoleSpecificProfile(firebaseUser.uid, userActualRole, updatedPersonalDetails);

        console.log('✅ Organization info saved successfully');

        // Dispatch custom event to notify other components about profile update
        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
          detail: { personalDetails: updatedPersonalDetails }
        }));
      }

      announceToScreenReader('Organization information updated successfully');
    } catch (error) {
      console.error('Error saving organization info:', error);
      announceToScreenReader('Failed to save organization information');
      alert('Failed to save organization information. Please try again.');
    }
  }, [announceToScreenReader, firebaseUser, currentRole]);

  // Handler for track best modal
  const handleSaveTrackBest = useCallback(async (updatedTrackBest: TrackBest) => {
    try {
      // Update local state immediately for better UX
      setTrackBest(updatedTrackBest);

      // Save to Firebase
      if (firebaseUser?.uid) {
        await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, { trackBest: updatedTrackBest });
      }

      setIsTrackBestModalOpen(false);
      announceToScreenReader('Track best updated successfully');
    } catch (error) {
      console.error('Error saving track best:', error);
      announceToScreenReader('Failed to save track best');
      alert('Failed to save track best. Please try again.');
    }
  }, [announceToScreenReader, firebaseUser, currentRole]);

  // Handler for achievements section modal
  const handleSaveAchievements = useCallback(async (updatedAchievements: Achievement[]) => {
    try {
      // Update local state immediately for better UX
      setAchievements(updatedAchievements);

      // Save to Firebase
      if (firebaseUser?.uid) {
        await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, { achievements: updatedAchievements });
      }

      setIsAchievementsSectionModalOpen(false);
      announceToScreenReader('Achievements updated successfully');
    } catch (error) {
      console.error('Error saving achievements:', error);
      announceToScreenReader('Failed to save achievements');
      alert('Failed to save achievements. Please try again.');
    }
  }, [announceToScreenReader, firebaseUser, currentRole]);

  // Handler for certificates section modal
  const handleSaveCertificates = useCallback(async (updatedCertificates: Certificate[]) => {
    try {
      // Update local state immediately for better UX
      setCertificates(updatedCertificates);

      // Save to Firebase
      if (firebaseUser?.uid) {
        await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, { certificates: updatedCertificates });
      }

      setIsCertificatesSectionModalOpen(false);
      announceToScreenReader('Certificates updated successfully');
    } catch (error) {
      console.error('Error saving certificates:', error);
      announceToScreenReader('Failed to save certificates');
      alert('Failed to save certificates. Please try again.');
    }
  }, [announceToScreenReader, firebaseUser, currentRole]);

  const editModalHandler = useCallback(async (data: any) => {
    try {
      // Update local state immediately for better UX
      setPersonalDetails(data.personalDetails);
      setPhysicalAttributes(data.physicalAttributes);
      setAchievements(data.achievements);
      setCertificates(data.certificates);
      // Note: Talent videos are managed separately via talentVideos collection, not updated here
      setPosts(data.posts);

      // Save to Firebase
      if (firebaseUser?.uid) {
        // Update base user
        await userService.updateUserProfile(firebaseUser.uid, {
          displayName: data.personalDetails.name,
          username: data.personalDetails.username,
          email: data.personalDetails.email
        });

        // Update role specific data
        await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, {
          ...data.personalDetails,
          ...data.physicalAttributes,
          achievements: data.achievements,
          certificates: data.certificates,
          talentVideos: data.talentVideos
        });
      }

      setIsEditModalOpen(false);

      // Announce successful save to screen readers
      announceToScreenReader('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      announceToScreenReader('Failed to save profile changes');
      alert('Failed to save profile changes. Please try again.');
    }
  }, [announceToScreenReader, firebaseUser, currentRole]);

  // Profile picture upload handler
  const handleProfilePictureUpload = useCallback(async (file: Blob) => {
    setUploadingProfilePicture(true);
    try {
      if (!firebaseUser?.uid) {
        throw new Error('User not authenticated');
      }

      // Upload to R2 via userService
      const downloadURL = await userService.uploadProfilePicture(firebaseUser.uid, file);

      // Update profile picture in local state
      setProfilePicture(downloadURL);

      // Update Firestore with the new URL
      await userService.updateUserProfile(firebaseUser.uid, {
        photoURL: downloadURL
      });
      // Also update role specific profile to be safe
      await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, { photoURL: downloadURL });

      // Update Auth Profile to sync currentUser across the app (e.g. Stories)
      await updateUserProfile({ photoURL: downloadURL });

      announceToScreenReader('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture. Please try again.');
      // Revert to previous state on error
      if (firebaseUser?.uid) {
        try {
          const userDoc = await userService.getUserProfile(firebaseUser.uid);
          if (userDoc) {
            setProfilePicture(userDoc.photoURL || null);
          }
        } catch (e) { console.error(e); }
      }
    } finally {
      setUploadingProfilePicture(false);
    }
  }, [announceToScreenReader, firebaseUser, currentRole, updateUserProfile]);

  // Profile picture delete handler
  const handleProfilePictureDelete = useCallback(async () => {
    try {
      if (!firebaseUser?.uid) {
        throw new Error('User not authenticated');
      }

      // Delete from R2 via userService
      await userService.deleteProfilePicture(firebaseUser.uid);

      // Update local state
      setProfilePicture(null);

      // Update Firestore
      await userService.updateUserProfile(firebaseUser.uid, { photoURL: null });
      await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, { photoURL: null });

      announceToScreenReader('Profile picture removed');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      announceToScreenReader('Failed to remove profile picture');
      alert('Failed to remove profile picture. Please try again.');
    }
  }, [announceToScreenReader, firebaseUser, currentRole]);

  // Cover photo upload handler
  const handleCoverPhotoUpload = useCallback(async (file: Blob) => {
    setUploadingCoverPhoto(true);
    try {
      if (!firebaseUser?.uid) {
        throw new Error('User not authenticated');
      }

      // Upload to R2 via userService
      const downloadURL = await userService.uploadCoverPhoto(firebaseUser.uid, file);

      // Update cover photo in local state
      setCoverPhoto(downloadURL);

      // Update Firestore with the new URL
      await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, { coverPhoto: downloadURL });

      announceToScreenReader('Cover photo updated successfully');
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      alert('Failed to upload cover photo. Please try again.');
    } finally {
      setUploadingCoverPhoto(false);
    }
  }, [announceToScreenReader, firebaseUser, currentRole]);

  // Cover photo delete handler
  const handleCoverPhotoDelete = useCallback(async () => {
    try {
      if (!firebaseUser?.uid) {
        throw new Error('User not authenticated');
      }

      // Delete from R2 via userService
      await userService.deleteCoverPhoto(firebaseUser.uid);

      // Update local state
      setCoverPhoto(null);

      // Update Firestore
      await userService.updateRoleSpecificProfile(firebaseUser.uid, currentRole, { coverPhoto: null });

      announceToScreenReader('Cover photo removed');
    } catch (error) {
      console.error('Error removing cover photo:', error);
      announceToScreenReader('Failed to remove cover photo');
      alert('Failed to remove cover photo. Please try again.');
    }
  }, [announceToScreenReader, firebaseUser, currentRole]);

  // Messaging and connection states
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'pending' | 'none'>('none');
  const [targetUserRole, setTargetUserRole] = useState<string>('athlete');
  const [targetUserDisplayName, setTargetUserDisplayName] = useState<string>('User');

  // Real-time friend requests hook
  const {
    incomingRequests,
    outgoingRequests,
    loading: friendRequestsLoading
  } = useRealtimeFriendRequests(firebaseUser?.uid || null);

  // Check connection status with viewed user (for messaging)
  useEffect(() => {
    if (isOwner || !userId || !firebaseUser) {
      setConnectionStatus('none');
      return;
    }

    const fetchUserInfo = async () => {
      try {
        // Get the viewed user's profile to fetch their role and display name
        const userData = await userService.getUserProfile(userId);

        if (userData) {
          setTargetUserRole(userData.role || 'athlete');
          setTargetUserDisplayName(userData.displayName || 'User');

          // Connection status checking is now handled by MessageButton component via useFriendRequest hook
          // We still set a default connectionStatus for backward compatibility with other parts of the UI
          setConnectionStatus('none');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        setConnectionStatus('none');
      }
    };

    fetchUserInfo();
  }, [userId, firebaseUser, isOwner]);

  // Handler to open chat
  const handleOpenChat = useCallback(() => {
    if (userId) {
      navigate(`/messages/${userId}`);
    }
  }, [userId, navigate]);

  // Handler for connection request sent
  const handleConnectionRequestSent = useCallback(() => {
    setConnectionStatus('pending');
  }, []);

  // Log render performance after component updates - Disabled
  // useEffect(() => {
  //   logRenderTime();
  // });

  if (isLoading) {
    return (
      <main className="profile-page" role="main">
        <NavigationBar
          currentUser={firebaseUser}
          isGuest={isGuest()}
          onTitleClick={handleTitleClick}
          title="Profile"
        />
        <div className="profile-loading" role="status" aria-label="Loading profile">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
        <FooterNav />
      </main>
    );
  }

  if (error) {
    return (
      <main className="profile-page" role="main">
        <NavigationBar
          currentUser={firebaseUser}
          isGuest={isGuest()}
          onTitleClick={handleTitleClick}
          title="Profile"
        />
        <div className="profile-error" role="alert">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
        <FooterNav />
      </main>
    );
  }

  return (
    <main className="profile-page" role="main" onKeyDown={handleKeyDown}>
      {/* Skip Links for Keyboard Navigation */}
      <div className="skip-links">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <a href="#profile-sections" className="skip-link">Skip to profile sections</a>
        <a href="#footer-nav" className="skip-link">Skip to navigation</a>
      </div>

      {/* Live Region for Screen Reader Announcements */}
      <div
        className="live-region"
        aria-live="polite"
        aria-atomic="true"
        id="live-region"
      ></div>

      {/* Network Status Indicator */}
      {!isOnline && (
        <div className="offline-indicator" role="alert">
          You're offline. Some features may not work.
        </div>
      )}

      {/* Top Navigation Bar */}
      <NavigationBar
        currentUser={firebaseUser}
        isGuest={isGuest()}
        onTitleClick={handleTitleClick}
        title="Profile"
        showBackButton={true}
        onBackClick={handleGoBack}
      />



      <div className="main-content profile-main-content">
        {/* Cover Photo Section */}
        <CoverPhotoManager
          coverPhoto={coverPhoto}
          onUpload={handleCoverPhotoUpload}
          onDelete={handleCoverPhotoDelete}
          uploading={uploadingCoverPhoto}
          isOwnProfile={isOwner}
          isGuest={isGuest()}
          className="profile-cover-photo"
        />

        <header className="profile-header" role="banner" id="main-content">
          <div className="profile-avatar">
            <ProfilePictureManager
              profilePicture={profilePicture}
              onUpload={handleProfilePictureUpload}
              onDelete={handleProfilePictureDelete}
              uploading={uploadingProfilePicture}
              isOwnProfile={isOwner}
              isGuest={isGuest()}
              size="large"
            />
          </div>

          <div className="profile-info">
            <div className="profile-name-section">
              <div className="profile-name-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 className="profile-username">{personalDetails.name}</h1>
                <VerificationBadge
                  profile={{
                    isVerified: personalDetails.isVerified || talentVideos.some(v => v.verificationStatus === 'verified'),
                    role: currentRole
                  }}
                  isOwnProfile={isOwner}
                  inline={true}
                  onVerificationRequest={() => {
                    alert("Please verify your profile by sharing the talent video link to others");
                  }}
                />
              </div>
              {isOwner && (
                <button
                  className="edit-profile-button"
                  onClick={handleEditPersonalDetails}
                  aria-label="Edit profile"
                  type="button"
                >
                  <Edit3 size={18} aria-hidden="true" />
                  <span className="edit-text">Edit</span>
                </button>
              )}
            </div>

            {/* Sport Banner - Shows sport/position info below name */}
            <SportBanner
              sport={getDisplayValue(personalDetails.sport)}
              position={getDisplayValue(personalDetails.position)}
              playerType={getDisplayValue(personalDetails.playerType)}
              role={currentRole}
              organizationType={personalDetails.organizationType}
              specializations={personalDetails.specializations}
            />

            <div className="profile-stats" role="group" aria-label="Profile statistics">
              <div className="stat-item">
                <span className="stat-number" aria-label={`${profileStats.posts} posts`}>{profileStats.posts}</span>
                <span className="stat-label">Posts</span>
              </div>
            </div>

            {!isOwner && (
              <div className="profile-action-buttons">
                <MessageButton
                  targetUserId={userId || ''}
                  targetUserName={targetUserDisplayName}
                  targetUserRole={targetUserRole}
                  currentUserRole={viewerRole}
                  connectionStatus={connectionStatus}
                  onConnectionRequest={handleConnectionRequestSent}
                  onOpenChat={handleOpenChat}
                />
              </div>
            )}
          </div>
        </header>

        {/* Track Best Section - Only for Athletes/Players and Parents */}
        {(currentRole === 'athlete' || currentRole === 'parent') && (
          <TrackBestSection
            trackBest={trackBest}
            sport={getDisplayValue(personalDetails.sport)}
            isOwner={isOwner}
            onEditSection={handleEditTrackBest}
          />
        )}

        {/* Personal Details Section - Not shown for organizations */}
        {sections.includes('personal') && (
          <section className="personal-details" aria-labelledby="personal-details-heading">
            <div className="section-header">
              <h2 id="personal-details-heading" className="section-title">{t('personalDetails')}</h2>
              {isOwner && (
                <button
                  className="section-edit-button"
                  onClick={handleEditPersonalDetails}
                  aria-label="Edit personal details"
                  type="button"
                >
                  <Edit3 size={16} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="details-card" role="group" aria-labelledby="personal-details-heading">
              <div className="field-row">
                <span className="field-label" id="name-label">{t('usernameLabel')}</span>
                <span className="field-value" aria-labelledby="name-label">{personalDetails.username}</span>
              </div>
              <div className="field-row">
                <span className="field-label" id="dob-label">{t('dateOfBirthLabel')}</span>
                <span className="field-value" aria-labelledby="dob-label">{formatDateOfBirth(personalDetails.dateOfBirth)}</span>
              </div>
              <div className="field-row">
                <span className="field-label" id="gender-label">{t('genderLabel')}</span>
                <span className="field-value" aria-labelledby="gender-label">{personalDetails.gender || t('notSpecified')}</span>
              </div>
              <div className="field-row">
                <span className="field-label" id="mobile-label">{t('mobileLabel')}</span>
                <span className="field-value" aria-labelledby="mobile-label">{personalDetails.mobile || t('notSpecified')}</span>
              </div>
              <div className="field-row">
                <span className="field-label" id="email-label">{t('emailLabel')}</span>
                <span className="field-value" aria-labelledby="email-label">{personalDetails.email || t('notSpecified')}</span>
              </div>
              <div className="field-row">
                <span className="field-label" id="city-label">{t('cityLabel')}</span>
                <span className="field-value" aria-labelledby="city-label">{personalDetails.city || t('notSpecified')}</span>
              </div>
              <div className="field-row">
                <span className="field-label" id="state-label">{t('stateLabel')}</span>
                <span className="field-value" aria-labelledby="state-label">{personalDetails.state || t('notSpecified')}</span>
              </div>
              <div className="field-row">
                <span className="field-label" id="country-label">{t('countryLabel')}</span>
                <span className="field-value" aria-labelledby="country-label">{personalDetails.country || t('notSpecified')}</span>
              </div>
              <div className="field-row">
                <span className="field-label" id="role-label">{t('accountTypeLabel')}</span>
                <span className="field-value" aria-labelledby="role-label">{currentRoleConfig.displayName}</span>
              </div>
            </div>
          </section>
        )}

        {/* Physical Attributes Section - Athletes only */}
        {sections.includes('physicalAttributes') && (
          <PhysicalAttributesSection
            physicalAttributes={physicalAttributes}
            isOwner={isOwner}
            onEditSection={() => handleEditProfileWithTab('physicalAttributes')}
          />
        )}

        {/* Profile Sections Container */}
        <div id="profile-sections" role="region" aria-label="Profile sections">
          {/* Role-specific sections */}
          <RoleSpecificSections
            currentRole={currentRole}
            personalDetails={personalDetails}
            isOwner={isOwner}
            onEditProfile={handleEditProfile}
            onSaveOrganizationInfo={handleSaveOrganizationInfo}
          />
        </div>

        {/* Achievements & Certificates Section - Combined */}
        {(sections.includes('achievements') || sections.includes('certificates')) && (
          <AchievementsCertificatesSection
            achievements={achievements}
            certificates={certificates}
            isOwner={isOwner}
            {...achievementHandlers}
            {...certificateHandlers}
            onEditSection={() => handleEditProfileWithTab('achievements')}
            onOpenEditModal={handleOpenEditModal}
          />
        )}

        {/* Talent Videos Section - Athletes only */}
        {sections.includes('talentVideos') && (
          <section
            aria-labelledby="talent-videos-heading"
            role="region"
            tabIndex={-1}
            id="talent-videos-section"
          >
            <Suspense fallback={
              <div className="section-loading" role="status" aria-label="Loading talent videos">
                <div className="section-loading-spinner" aria-hidden="true"></div>
                <p>{t('loadingVideos')}</p>
                <div className="sr-only">Please wait while talent videos are loading</div>
              </div>
            }>
              <TalentVideosSection
                videos={talentVideos}
                isOwner={isOwner}
                athleteSports={athleteSports}
                {...videoHandlers}
                onOpenEditModal={handleOpenEditModal}
              />
            </Suspense>
          </section>
        )}

        {/* Posts Section */}
        {sections.includes('posts') && (
          <section
            aria-labelledby="posts-heading"
            role="region"
            tabIndex={-1}
            id="posts-section"
          >


            <Suspense fallback={
              <div className="section-loading" role="status" aria-label="Loading posts">
                <div className="section-loading-spinner" aria-hidden="true"></div>
                <p>{t('loadingPosts')}</p>
                <div className="sr-only">Please wait while posts are loading</div>
              </div>
            }>
              <PostsSection
                posts={posts}
                isOwner={isOwner}
                {...postHandlers}
                onOpenEditModal={handleOpenEditModal}
              />
            </Suspense>
          </section>
        )}

        {/* Edit Profile Modal */}
        {isEditModalOpen && (
          <Suspense fallback={
            <div className="modal-loading" role="status" aria-label="Loading edit profile modal">
              <div className="loading-spinner" aria-hidden="true"></div>
              <p>Loading editor...</p>
            </div>
          }>
            <EditProfileModal
              isOpen={isEditModalOpen}
              personalDetails={personalDetails}
              physicalAttributes={physicalAttributes}
              currentRole={currentRole}
              achievements={achievements}
              certificates={certificates}
              talentVideos={talentVideos}
              posts={posts}
              onSave={editModalHandler}
              onClose={() => setIsEditModalOpen(false)}
              initialTab={editModalInitialTab as any}
            />
          </Suspense>
        )}

        {/* Personal Details Modal */}
        {isPersonalDetailsModalOpen && (
          <Suspense fallback={
            <div className="modal-loading" role="status" aria-label="Loading personal details modal">
              <div className="loading-spinner" aria-hidden="true"></div>
              <p>Loading editor...</p>
            </div>
          }>
            <PersonalDetailsModal
              isOpen={isPersonalDetailsModalOpen}
              personalDetails={personalDetails}
              currentRole={currentRole}
              onSave={handleSavePersonalDetails}
              onClose={() => setIsPersonalDetailsModalOpen(false)}
            />
          </Suspense>
        )}

        {/* Physical Attributes Modal */}
        {isPhysicalAttributesModalOpen && (
          <Suspense fallback={
            <div className="modal-loading" role="status" aria-label="Loading physical attributes modal">
              <div className="loading-spinner" aria-hidden="true"></div>
              <p>Loading editor...</p>
            </div>
          }>
            <PhysicalAttributesModal
              isOpen={isPhysicalAttributesModalOpen}
              physicalAttributes={physicalAttributes}
              onSave={handleSavePhysicalAttributes}
              onClose={() => setIsPhysicalAttributesModalOpen(false)}
            />
          </Suspense>
        )}

        {/* Track Best Modal */}
        {isTrackBestModalOpen && (
          <Suspense fallback={
            <div className="modal-loading" role="status" aria-label="Loading track best modal">
              <div className="loading-spinner" aria-hidden="true"></div>
              <p>Loading editor...</p>
            </div>
          }>
            <TrackBestModal
              isOpen={isTrackBestModalOpen}
              trackBest={trackBest}
              sport={getDisplayValue(personalDetails.sport) || 'cricket'}
              onSave={handleSaveTrackBest}
              onClose={() => setIsTrackBestModalOpen(false)}
            />
          </Suspense>
        )}

        {/* Achievements Section Modal */}
        {isAchievementsSectionModalOpen && (
          <Suspense fallback={
            <div className="modal-loading" role="status" aria-label="Loading achievements modal">
              <div className="loading-spinner" aria-hidden="true"></div>
              <p>Loading editor...</p>
            </div>
          }>
            <AchievementsSectionModal
              isOpen={isAchievementsSectionModalOpen}
              achievements={achievements}
              onSave={handleSaveAchievements}
              onClose={() => setIsAchievementsSectionModalOpen(false)}
            />
          </Suspense>
        )}

        {/* Certificates Section Modal */}
        {isCertificatesSectionModalOpen && (
          <Suspense fallback={
            <div className="modal-loading" role="status" aria-label="Loading certificates modal">
              <div className="loading-spinner" aria-hidden="true"></div>
              <p>Loading editor...</p>
            </div>
          }>
            <CertificatesSectionModal
              isOpen={isCertificatesSectionModalOpen}
              certificates={certificates}
              onSave={handleSaveCertificates}
              onClose={() => setIsCertificatesSectionModalOpen(false)}
            />
          </Suspense>
        )}

      </div>

      {/* Footer Navigation */}
      <FooterNav />
    </main>
  );
});

Profile.displayName = 'Profile';

export default Profile;