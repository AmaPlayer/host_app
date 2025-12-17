/**
 * Language Context Type Definitions
 * 
 * Defines types for the LanguageContext which manages the application's
 * internationalization (i18n) state and provides translation methods.
 */

import { ReactNode } from 'react';

/**
 * Supported language codes
 */
export type LanguageCode = 
  | 'en'  // English
  | 'hi'  // Hindi
  | 'pa'  // Punjabi
  | 'mr'  // Marathi
  | 'bn'  // Bengali
  | 'ta'  // Tamil
  | 'te'  // Telugu
  | 'kn'  // Kannada
  | 'ml'  // Malayalam
  | 'gu'  // Gujarati
  | 'or'  // Odia
  | 'as'; // Assamese

/**
 * Language information
 */
export interface Language {
  /** ISO language code */
  code: LanguageCode;
  
  /** English name of the language */
  name: string;
  
  /** Native name of the language */
  nativeName: string;
}

/**
 * Translation keys for the application
 * All 118+ keys from unified translation system across 12 languages
 */
export type TranslationKey =
  | 'activity'
  | 'add'
  | 'alreadyHaveAccount'
  | 'amaplayer'
  | 'athlete'
  | 'athleteDescription'
  | 'back'
  | 'backToHome'
  | 'beginner'
  | 'bio'
  | 'cancel'
  | 'advanced'
  | 'chooseDifferentRole'
  | 'chooseLanguage'
  | 'chooseRole'
  | 'chooseYourRole'
  | 'coach'
  | 'certifications'
  | 'continue'
  | 'coachDescription'
  | 'coachDetailsSubtitle'
  | 'coachingLevel'
  | 'comment'
  | 'comments'
  | 'competitionEnded'
  | 'confirmDelete'
  | 'confirmPassword'
  | 'connectAthletes'
  | 'connectAthletesDesc'
  | 'continueAsGuest'
  | 'continueToLogin'
  | 'copyright'
  | 'createPost'
  | 'darkMode'
  | 'declareWinners'
  | 'delete'
  | 'deleteSubmission'
  | 'deleteSubmissionTitle'
  | 'deleteWarning'
  | 'deleting'
  | 'discoverEventsSubtitle'
  | 'dontHaveAccount'
  | 'edit'
  | 'editProfile'
  | 'email'
  | 'enterBio'
  | 'enterCertifications'
  | 'enterCredentials'
  | 'enterEmail'
  | 'enterFullName'
  | 'enterPhone'
  | 'enterYears'
  | 'enterYourEmail'
  | 'enterYourPassword'
  | 'error'
  | 'elite'
  | 'errorLoadingPosts'
  | 'eventDetails'
  | 'eventLocation'
  | 'intermediate'
  | 'eventTime'
  | 'events'
  | 'eventsTitle'
  | 'failedLoadingEvents'
  | 'features'
  | 'featuresTitle'
  | 'forgotPassword'
  | 'fullName'
  | 'gallery'
  | 'getStarted'
  | 'guestMode'
  | 'heightCm'
  | 'heroDescription'
  | 'heroSubtitle'
  | 'heroTitle'
  | 'home'
  | 'interested'
  | 'joinForFree'
  | 'joiningAs'
  | 'language'
  | 'learnMore'
  | 'letsPlay'
  | 'lightMode'
  | 'like'
  | 'liveEvents'
  | 'loading'
  | 'loadingEvents'
  | 'loadingPosts'
  | 'location'
  | 'login'
  | 'loginAs'
  | 'loginFunctionalityComingSoon'
  | 'logout'
  | 'maxParticipants'
  | 'messages'
  | 'mission'
  | 'missionDescription'
  | 'missionText'
  | 'name'
  | 'next'
  | 'noEvents'
  | 'noEventsMessage'
  | 'noLiveEvents'
  | 'noPastEvents'
  | 'noPostsMessage'
  | 'noUpcomingEvents'
  | 'organization'
  | 'organizationDescription'
  | 'ourMission'
  | 'ourVision'
  | 'parent'
  | 'parentDescription'
  | 'password'
  | 'pastEvents'
  | 'personalDetails'
  | 'phone'
  | 'posts'
  | 'previous'
  | 'professional'
  | 'professionalDetails'
  | 'profile'
  | 'registerEvent'
  | 'reply'
  | 'requirements'
  | 'resultsDeclared'
  | 'retryButton'
  | 'reuploadSubmission'
  | 'save'
  | 'search'
  | 'selectLevel'
  | 'selectSport'
  | 'share'
  | 'shareAchievements'
  | 'shareAchievementsDesc'
  | 'sharePost'
  | 'signInWithApple'
  | 'signInWithGoogle'
  | 'signOut'
  | 'signup'
  | 'signUp'
  | 'signUpToComment'
  | 'signUpToInteract'
  | 'sport'
  | 'spouse'
  | 'spouseDescription'
  | 'submit'
  | 'submitVideo'
  | 'subtitle'
  | 'success'
  | 'tagline'
  | 'talentShowcase'
  | 'talentShowcaseDesc'
  | 'theme'
  | 'tryAgain'
  | 'upcomingEvents'
  | 'videoLoadError'
  | 'videoNotSupported'
  | 'vision'
  | 'visionDescription'
  | 'visionText'
  | 'viewResults'
  | 'watchLive'
  | 'watchOurStory'
  | 'website'
  | 'weightKg'
  | 'welcome'
  | 'welcomeTo'
  | 'welcomeToAmaplayer'
  | 'whatsOnYourMind'
  | 'writeCaption'
  | 'writeComment'
  | 'yourJourney'
  | 'yearsOfExperience'
  | 'accountEmail'
  | 'accountSettings'
  | 'achievementNotifications'
  | 'activityStatus'
  | 'appPreferences'
  | 'chooseTheme'
  | 'chooseWhoCanSee'
  | 'controlPrivacy'
  | 'customizeExperience'
  | 'displayName'
  | 'emailAddress'
  | 'emailNotifications'
  | 'enableAchievementNotifications'
  | 'enableEmailNotifications'
  | 'enablePushNotifications'
  | 'enterDisplayName'
  | 'friendsOnly'
  | 'manageAccount'
  | 'manageNotifications'
  | 'manageSecurity'
  | 'notificationPreferences'
  | 'notifications'
  | 'notifyAchievements'
  | 'passwordManagement'
  | 'preferences'
  | 'privacy'
  | 'privacySettings'
  | 'private'
  | 'profileVisibility'
  | 'public'
  | 'publicDisplayName'
  | 'pushNotifications'
  | 'receiveEmailNotifications'
  | 'receivePushNotifications'
  | 'saveChanges'
  | 'security'
  | 'securitySettings'
  | 'selectLanguage'
  | 'selectTab'
  | 'settings'
  | 'showActive'
  | 'signInToManage'
  | 'searchUsers'
  | 'appearance'
  | 'manageProfile'
  | 'choosePreferredTheme'
  | 'selectPreferredLanguage'
  | 'updatePassword'
  | 'readPrivacyTerms'
  | 'signInToAccount'
  | 'signOutFromAccount'
  | 'photoVideo'
  | 'posting'
  | 'uploading'
  | 'loadingProfile'
  | 'inappropriateContentDetected'
  | 'trySharingProgress'
  | 'preview'
  | 'uploaded'
  | 'pleaseSignUpToCreatePosts'
  | 'mustBeLoggedIn'
  | 'writeOrSelectMedia'
  | 'cantPostContent'
  | 'postCreatedSuccessfully'
  | 'failedToCreatePost'
  | 'stayUpdated'
  | 'getNotifiedWhenSomeoneLikes'
  | 'maybelater'
  | 'enabling'
  | 'enable'
  | 'deletePost'
  | 'confirmDeletePost'
  | 'likes'
  | 'viewAllComments'
  | 'moments'
  | 'saved'
  | 'remove'
  | 'linkCopied'
  | 'editYourPost'
  | 'edited'
  | 'post'
  | 'privacyPolicy'
  | 'changePassword'
  | 'signIn'
  | 'friends'
  | 'requests'
  | 'noFriendRequests'
  | 'noPendingRequests'
  | 'wantsToBeFriend'
  | 'accept'
  | 'reject'
  | 'personalDetails'
  | 'nameLabel'
  | 'dateOfBirthLabel'
  | 'genderLabel'
  | 'mobileLabel'
  | 'emailLabel'
  | 'cityLabel'
  | 'stateLabel'
  | 'countryLabel'
  | 'accountTypeLabel'
  | 'notSpecified'
  | 'loadingVideos'
  | 'loadingPosts';

/**
 * Translation dictionary mapping keys to translated strings
 */
export type TranslationDictionary = Record<TranslationKey, string>;

/**
 * All translations organized by language code
 */
export type Translations = Record<LanguageCode, Partial<TranslationDictionary>>;

/**
 * The value provided by the LanguageContext
 */
export interface LanguageContextValue {
  /** The currently selected language code */
  currentLanguage: LanguageCode;
  
  /** Change the application language */
  changeLanguage: (languageCode: LanguageCode) => void;
  
  /** Get the current language object with full details */
  getCurrentLanguage: () => Language;

  /** Translate a key to the current language */
  t: (key: TranslationKey, fallback?: string) => string;
  
  /** Array of all available languages */
  languages: Language[];
}

/**
 * Props for the LanguageProvider component
 */
export interface LanguageProviderProps {
  /** Child components that will have access to the language context */
  children: ReactNode;
}
