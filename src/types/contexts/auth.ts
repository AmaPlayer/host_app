/**
 * Authentication Context Type Definitions
 *
 * Defines types for the AuthContext which manages user authentication state
 * and provides authentication-related methods throughout the application.
 */

import { User, UserCredential, AuthCredential } from 'firebase/auth';
import { ReactNode } from 'react';

/**
 * Result type for password change operations
 */
export interface PasswordChangeResult {
  success: boolean;
  error?: string;
  requiresReauth?: boolean;
  suggestedAction?: string;
}

/**
 * Profile data that can be updated for a user
 */
export interface ProfileUpdateData {
  displayName?: string;
  photoURL?: string;
}

/**
 * The value provided by the AuthContext
 */
export interface AuthContextValue {
  /** The currently authenticated user, or null if not authenticated */
  currentUser: User | null;

  /** Whether the auth state is still loading */
  loading: boolean;

  /** Check if the current user is a guest (anonymous) */
  isGuest: () => boolean;

  /** Sign up a new user with email and password */
  signup: (email: string, password: string, displayName: string) => Promise<void>;

  /** Log in an existing user with email and password */
  login: (email: string, password: string, keepLoggedIn?: boolean) => Promise<UserCredential>;

  /** Log in as a guest (anonymous user) */
  guestLogin: () => Promise<UserCredential>;

  /** Log in with Google OAuth */
  googleLogin: () => Promise<UserCredential>;

  /** Log in with Apple OAuth */
  appleLogin: () => Promise<UserCredential>;

  /** Log out the current user */
  logout: () => Promise<void>;

  /** Update the current user's profile */
  updateUserProfile: (profileData: ProfileUpdateData) => Promise<User>;

  /** Manually refresh the auth context state */
  refreshAuth: () => void;

  /** Change the current user's password */
  changePassword: (currentPassword: string, newPassword: string, isSocialUser?: boolean) => Promise<PasswordChangeResult>;

  /** Reauthenticate with Google OAuth (for identity verification) */
  reauthenticateWithGoogle: () => Promise<User>;

  /** Reauthenticate with Apple OAuth (for identity verification) */
  reauthenticateWithApple: () => Promise<User>;

  /** Change password with OAuth or email fallback for alternative verification */
  changePasswordWithOAuthFallback: (newPassword: string, oauthProvider?: string) => Promise<PasswordChangeResult>;

  /** Send password reset email to the user */
  resetPassword: (email: string) => Promise<void>;

  /** Get user-friendly error message for authentication errors */
  getAuthErrorMessage: (error: unknown) => string;

  /** Validate current authentication state */
  validateAuthState: () => Promise<boolean>;

  /** Refresh authentication token */
  refreshAuthToken: () => Promise<void>;

  /** Check what sign-in methods are available for an email */
  checkSignInMethods: (email: string) => Promise<string[]>;

  /** Link Google credential with existing account */
  linkGoogleAccount: (credential: AuthCredential) => Promise<UserCredential>;

  /** Sign in with email/password and link Google credential */
  signInAndLinkGoogle: (email: string, password: string, googleCredential: AuthCredential) => Promise<UserCredential>;

  /** Permanently delete the user account */
  deleteAccount: (password?: string) => Promise<void>;
}

/**
 * Props for the AuthProvider component
 */
export interface AuthProviderProps {
  /** Child components that will have access to the auth context */
  children: ReactNode;
}
