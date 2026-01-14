import { createContext, useContext, useState, useEffect, useRef, ReactElement } from 'react';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth } from '../lib/firebase';
import notificationService from '../services/notificationService';
import errorHandler from '../utils/error/errorHandler';
import authErrorHandler from '../utils/error/authErrorHandler';
import { runFirebaseDiagnostics } from '../utils/diagnostics/firebaseDiagnostic';
import { languagePersistenceService } from '../services/i18n/languagePersistenceService';
import userService from '../services/api/userService';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  sendPasswordResetEmail,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  User,
  UserCredential,
  AuthCredential,
  signInWithCredential
} from 'firebase/auth';
import {
  AuthContextValue,
  AuthProviderProps,
  PasswordChangeResult,
  ProfileUpdateData
} from '../types/contexts/auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const redirectCheckRef = useRef(false);


  async function signup(email: string, password: string, displayName: string): Promise<void> {
    try {
      console.log('📝 Display name:', displayName);
      // Validate inputs before sending to Firebase
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (!displayName || displayName.trim().length < 2) {
        throw new Error('Display name must be at least 2 characters long');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: displayName.trim() });
      // Initialize language preference for new user (async, non-blocking)
      try {
        const browserDefault = languagePersistenceService.getBrowserDefaultLanguage();
        await languagePersistenceService.saveLanguagePreference(userCredential.user.uid, browserDefault);
      } catch (langError) {
        console.warn('⚠️ Could not initialize language preference for new user:', langError);
        // Don't throw - this shouldn't block signup
      }
    } catch (error: any) {
      console.error('❌ Signup error:', error);

      // Log specific error details for debugging
      if (error.code) {
        console.error('🔥 Firebase error code:', error.code);
        console.error('🔥 Firebase error message:', error.message);

        // Log additional error details
        if (error.customData) {
          console.error('🔥 Firebase custom data:', error.customData);
        }

        // Handle specific Firebase error codes
        if (error.code === 'auth/operation-not-allowed') {
          throw new Error('Email/password sign-up is not enabled. Please contact support.');
        }

        if (error.code === 'auth/weak-password') {
          throw new Error('Password is too weak. Please use at least 6 characters.');
        }

        if (error.code === 'auth/email-already-in-use') {
          throw new Error('An account with this email already exists. Try logging in instead.');
        }

        if (error.code === 'auth/invalid-email') {
          throw new Error('Please enter a valid email address.');
        }
      }

      // Use the auth error handler to format the error
      const formattedError = authErrorHandler.formatErrorForDisplay(error);
      console.error('📝 Formatted error:', formattedError);

      // Re-throw with more context
      throw new Error(formattedError.message || error.message || 'Failed to create account');
    }
  }

  async function login(email: string, password: string, keepLoggedIn: boolean = true): Promise<UserCredential> {
    try {
      // Set persistence based on user preference
      const persistence = keepLoggedIn ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);

      // Attempt to sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Log successful login for debugging
      // Sync language preference from Firestore (async, non-blocking)
      // This allows the user to be logged in immediately while language syncs in background
      try {
        const storedLanguage = languagePersistenceService.getLocalStorageLanguage();
        const firestoreLanguage = await languagePersistenceService.loadLanguagePreference(userCredential.user.uid);

        // If Firestore has a different language, update localStorage and emit event
        if (firestoreLanguage && firestoreLanguage !== storedLanguage) {
          localStorage.setItem('selectedLanguage', firestoreLanguage);
          // Dispatch custom event so LanguageContext can listen for sync
          window.dispatchEvent(new CustomEvent('languageSynced', { detail: { language: firestoreLanguage } }));
        }
      } catch (langError) {
        console.warn('⚠️ Could not sync language preference from Firestore:', langError);
        // Non-critical error - don't throw
      }

      return userCredential;
    } catch (error) {
      // Log the error with context
      authErrorHandler.logAuthError(error, 'AuthContext-Login', {
        email: email, // Don't log the actual email in production
        persistence: keepLoggedIn ? 'local' : 'session',
        method: 'email_password'
      });

      // Re-throw the error with enhanced error information
      throw error;
    }
  }

  async function guestLogin(): Promise<UserCredential> {
    await setPersistence(auth, browserLocalPersistence);
    return signInAnonymously(auth);
  }

  async function googleLogin(): Promise<UserCredential> {
    await setPersistence(auth, browserLocalPersistence);

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const credential = GoogleAuthProvider.credential(result.credential?.idToken);
        return await signInWithCredential(auth, credential);
      } catch (error: any) {
        console.error('❌ Error with Native Google Sign-In:', error);
        throw error;
      }
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      // Use popup method - simpler, no redirect issues
      const result = await signInWithPopup(auth, provider);
      return result;
    } catch (error: any) {
      console.error('❌ Error with Google popup:', error);

      // Check if the error is due to account already existing with different credential
      if (error.code === 'auth/account-exists-with-different-credential') {
        // Attach the credential and email to the error so UI can handle it
        error.credential = GoogleAuthProvider.credentialFromError(error);
        error.email = error.customData?.email;
      }

      throw error;
    }
  }

  /**
   * Reauthenticate with Google OAuth (for identity verification)
   * Used when user needs to verify their identity to change password
   * Triggers Google OAuth popup without changing authentication state
   */
  async function reauthenticateWithGoogle(): Promise<User> {
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      // Sign in with Google popup (not linking, just reauthentication)
      const result = await signInWithPopup(auth, provider);
      return currentUser; // Return the current authenticated user
    } catch (error: any) {
      console.error('❌ Google reauthentication failed:', error);

      authErrorHandler.logAuthError(error, 'AuthContext-ReauthGoogle', {
        userId: currentUser.uid,
        errorCode: error.code
      });

      // Handle specific error codes
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Google popup was blocked. Please allow popups and try again.');
      }

      if (error.code === 'auth/user-cancelled-login') {
        throw new Error('Google authentication was cancelled. Please try again.');
      }

      if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Authentication was cancelled. Please try again.');
      }

      throw error;
    }
  }

  /**
   * Check what sign-in methods are available for an email
   */
  async function checkSignInMethods(email: string): Promise<string[]> {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods;
    } catch (error) {
      console.error('Error checking sign-in methods:', error);
      return [];
    }
  }

  /**
   * Link Google credential with existing email/password account
   * Used when user has email/password account and wants to add Google sign-in
   */
  async function linkGoogleAccount(credential: AuthCredential): Promise<UserCredential> {
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }

    try {
      const result = await linkWithCredential(currentUser, credential);
      return result;
    } catch (error) {
      console.error('❌ Error linking Google account:', error);
      throw error;
    }
  }

  /**
   * Sign in with email/password and then link Google credential
   * Used when user tries Google login but already has email/password account
   */
  async function signInAndLinkGoogle(email: string, password: string, googleCredential: AuthCredential): Promise<UserCredential> {
    try {
      // First, sign in with email/password
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      // Then link the Google credential
      const result = await linkWithCredential(userCred.user, googleCredential);
      return result;
    } catch (error) {
      console.error('❌ Error signing in and linking Google:', error);
      throw error;
    }
  }

  async function appleLogin(): Promise<UserCredential> {
    await setPersistence(auth, browserLocalPersistence);
    const provider = new OAuthProvider('apple.com');
    // Request additional scopes if needed
    provider.addScope('email');
    provider.addScope('name');
    return signInWithPopup(auth, provider);
  }

  /**
   * Reauthenticate with Apple OAuth (for identity verification)
   * Used when user needs to verify their identity to change password
   * Triggers Apple OAuth popup without changing authentication state
   */
  async function reauthenticateWithApple(): Promise<User> {
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }

    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    try {
      // Sign in with Apple popup (not linking, just reauthentication)
      const result = await signInWithPopup(auth, provider);
      return currentUser; // Return the current authenticated user
    } catch (error: any) {
      console.error('❌ Apple reauthentication failed:', error);

      authErrorHandler.logAuthError(error, 'AuthContext-ReauthApple', {
        userId: currentUser.uid,
        errorCode: error.code
      });

      // Handle specific error codes
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Apple popup was blocked. Please allow popups and try again.');
      }

      if (error.code === 'auth/user-cancelled-login') {
        throw new Error('Apple authentication was cancelled. Please try again.');
      }

      if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Authentication was cancelled. Please try again.');
      }

      throw error;
    }
  }

  async function logout(): Promise<void> {
    // Clear ALL redirect flags on logout, but PRESERVE language preference
    localStorage.removeItem('googleRedirectPending');
    localStorage.removeItem('googleRedirectStartedAt');
    localStorage.removeItem('googleRedirectCheckDone');
    // Note: language preference in localStorage is preserved intentionally
    // so user maintains their language choice after logout
    await signOut(auth);
    // Reset persistence to local (default) for next user
    await setPersistence(auth, browserLocalPersistence);
  }

  async function updateUserProfile(profileData: ProfileUpdateData): Promise<User> {
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await updateProfile(currentUser, profileData);
    // Force refresh the current user to get updated profile
    await currentUser.reload();
    setCurrentUser({ ...currentUser });
    return currentUser;
  }

  function refreshAuth(): void {
    if (currentUser) {
      currentUser.reload().then(() => {
        setCurrentUser({ ...currentUser });
      });
    }
  }

  useEffect(() => {
    // Using popup method now, no need to check for redirect results
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔐 Auth State Changed:', {
        uid: user?.uid,
        isAnonymous: user?.isAnonymous,
        email: user?.email
      });
      setCurrentUser(user);
      setLoading(false);

      // Load user profile from role-specific collections and store role
      if (user && !user.isAnonymous) {
        try {
          // Force reload to ensure we have fresh user data (especially email from OAuth)
          await user.reload();

          let userProfile = await userService.getUserProfile(user.uid);

          // SYNC: If user exists in Firebase but not Supabase, create them
          if (!userProfile) {
            console.log('🔄 Syncing user from Firebase to Supabase...');
            console.log('👤 User data:', {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              providerId: user.providerData?.[0]?.providerId
            });

            try {
              userProfile = await userService.createUserProfile({
                uid: user.uid,
                email: user.email || '', // Will be converted to unique placeholder if empty
                displayName: user.displayName || user.email?.split('@')[0] || 'User',
                photoURL: user.photoURL,
                role: 'athlete' // Default role for legacy users
              });
              console.log('✅ User synced successfully');
            } catch (err) {
              console.error('❌ Failed to sync user:', err);
              // Don't block auth flow - user might already exist
            }
          }
          if (userProfile && userProfile.role) {
            // Store role in localStorage for immediate access across the app
            localStorage.setItem('userRole', userProfile.role);
            localStorage.setItem('selectedUserRole', userProfile.role);

            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('userProfileLoaded', {
              detail: { role: userProfile.role, profile: userProfile }
            }));
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          // Don't block auth flow if profile loading fails
        }
      }

      // Only initialize notifications if permission is already granted and user is on authenticated pages
      // Check if Notification API is supported (not available on iOS Safari/Chrome)
      if (user && !user.isAnonymous && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        // Check if we're on an authenticated page (not landing/login/signup)
        const currentPath = window.location.pathname;
        const isAuthenticatedPage = !['/', '', '/landing', '/login', '/signup'].includes(currentPath);

        if (isAuthenticatedPage) {
          try {
            await notificationService.initialize(user.uid);
          } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            errorHandler.logError(err, 'Auth-NotificationInit', 'warning', {
              userId: user.uid,
              page: currentPath,
              errorCode: (error as { code?: string }).code
            });
          }
        }
      }
    });

    return unsubscribe;
  }, []);

  // Helper function to check if current user is a guest
  function isGuest(): boolean {
    return currentUser !== null && currentUser.isAnonymous;
  }

  // Get user-friendly error message for authentication errors
  function getAuthErrorMessage(error: unknown): string {
    const errorResult = authErrorHandler.getAuthErrorMessage(error);
    return errorResult.action ? `${errorResult.message} ${errorResult.action}` : errorResult.message;
  }

  // Validate authentication state
  async function validateAuthState(): Promise<boolean> {
    try {
      if (!currentUser) return false;

      // Force token refresh to validate current session
      await currentUser.getIdToken(true);
      return true;
    } catch (error) {
      authErrorHandler.logAuthError(error, 'AuthContext-ValidateState');
      return false;
    }
  }

  // Refresh authentication token
  async function refreshAuthToken(): Promise<void> {
    try {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      await currentUser.getIdToken(true);
    } catch (error) {
      authErrorHandler.logAuthError(error, 'AuthContext-RefreshToken');
      throw error;
    }
  }

  async function changePassword(currentPassword: string, newPassword: string, isSocialUser: boolean = false): Promise<PasswordChangeResult> {
    try {
      if (!currentUser) {
        const error = new Error('No authenticated user found');
        authErrorHandler.logAuthError(error, 'AuthContext-ChangePassword');
        return {
          success: false,
          error: 'You must be logged in to change your password',
          suggestedAction: 'Please log in and try again'
        };
      }

      // Determine if user is actually a social user by checking provider data
      const isActuallySocialUser = isSocialUser || (
        currentUser.providerData.length > 0 &&
        currentUser.providerData.some(provider =>
          provider.providerId === 'google.com' ||
          provider.providerId === 'apple.com'
        )
      );

      // Validate new password before attempting change
      const { validatePassword } = await import('../utils/validation/validation');
      const passwordValidation = validatePassword(newPassword);

      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.error || 'Password does not meet requirements',
          suggestedAction: passwordValidation.suggestions?.[0]
        };
      }

      if (isActuallySocialUser) {
        // For social users setting their first password or users without email provider
        const hasEmailProvider = currentUser.providerData.some(provider =>
          provider.providerId === 'password'
        );

        if (!hasEmailProvider && !currentUser.email) {
          return {
            success: false,
            error: 'Cannot set password for this account type',
            suggestedAction: 'This account was created with a social login and cannot have a password'
          };
        }

        try {
          await updatePassword(currentUser, newPassword);
          return {
            success: true,
            suggestedAction: hasEmailProvider ?
              'Password updated successfully' :
              'Password set successfully. You can now use email/password to log in.'
          };
        } catch (error: unknown) {
          authErrorHandler.logAuthError(error, 'AuthContext-ChangePassword', {
            userId: currentUser.uid,
            userType: 'social',
            hasEmailProvider: hasEmailProvider
          });

          const errorResult = authErrorHandler.getAuthErrorMessage(error);

          if (authErrorHandler.requiresReauthentication(error)) {
            return {
              success: false,
              error: 'Recent authentication required for security',
              requiresReauth: true,
              suggestedAction: 'Please log out and log back in, then try setting your password again'
            };
          }

          // Handle specific social user password setting errors
          const errorCode = (error as { code?: string }).code;
          if (errorCode === 'auth/requires-recent-login') {
            return {
              success: false,
              error: 'For security, please log out and log back in first',
              requiresReauth: true,
              suggestedAction: 'Log out, log back in, then try setting your password'
            };
          }

          return {
            success: false,
            error: errorResult.message,
            suggestedAction: errorResult.action || 'Please try again or contact support'
          };
        }
      } else {
        // For email/password users changing their existing password
        if (!currentUser.email) {
          return {
            success: false,
            error: 'Email address is required to change password',
            suggestedAction: 'Please ensure your account has an email address'
          };
        }

        if (!currentPassword.trim()) {
          return {
            success: false,
            error: 'Current password is required',
            suggestedAction: 'Please enter your current password to verify your identity'
          };
        }

        try {
          // Step 1: Reauthenticate user with current password
          const credential = EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
          );
          await reauthenticateWithCredential(currentUser, credential);

          // Step 2: Update to new password
          await updatePassword(currentUser, newPassword);
          return {
            success: true,
            suggestedAction: 'Password updated successfully'
          };
        } catch (error: unknown) {
          authErrorHandler.logAuthError(error, 'AuthContext-ChangePassword', {
            userId: currentUser.uid,
            userType: 'email',
            step: 'reauthentication_or_update'
          });

          const errorResult = authErrorHandler.getAuthErrorMessage(error);
          const errorCode = (error as { code?: string }).code;

          // Handle specific reauthentication errors
          if (errorCode === 'auth/wrong-password') {
            return {
              success: false,
              error: 'Current password is incorrect',
              suggestedAction: 'Please check your current password and try again'
            };
          }

          if (errorCode === 'auth/too-many-requests') {
            return {
              success: false,
              error: 'Too many failed attempts',
              suggestedAction: 'Please wait a few minutes before trying again'
            };
          }

          if (authErrorHandler.requiresReauthentication(error)) {
            return {
              success: false,
              error: 'Authentication session expired',
              requiresReauth: true,
              suggestedAction: 'Please log out and log back in, then try changing your password'
            };
          }

          return {
            success: false,
            error: errorResult.message,
            suggestedAction: errorResult.action || 'Please try again or contact support if the problem persists'
          };
        }
      }
    } catch (error: unknown) {
      // Catch-all for unexpected errors
      authErrorHandler.logAuthError(error, 'AuthContext-ChangePassword', {
        userId: currentUser?.uid,
        userType: isSocialUser ? 'social' : 'email',
        step: 'unexpected_error'
      });

      return {
        success: false,
        error: 'An unexpected error occurred',
        suggestedAction: 'Please try again or contact support if the problem persists'
      };
    }
  }

  async function resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: unknown) {
      authErrorHandler.logAuthError(error, 'AuthContext-ResetPassword', { email });
      throw error;
    }
  }

  /**
   * Change password with OAuth or email fallback for alternative verification
   *
   * Flow:
   * 1. User enters desired new password in form
   * 2. User tries current password first
   * 3. If wrong/forgotten, user can verify with:
   *    - OAuth (Google/Apple): Popup reauthentication
   *    - Email users: Password reset email link
   * 4. After verification, password updates to desired new password
   */
  async function changePasswordWithOAuthFallback(
    newPassword: string,
    oauthProvider?: string
  ): Promise<PasswordChangeResult> {
    try {
      if (!currentUser) {
        return {
          success: false,
          error: 'No authenticated user found',
          suggestedAction: 'Please log in and try again'
        };
      }

      // Validate new password before attempting change
      const { validatePassword } = await import('../utils/validation/validation');
      const passwordValidation = validatePassword(newPassword);

      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.error || 'Password does not meet requirements',
          suggestedAction: passwordValidation.suggestions?.[0]
        };
      }

      // Handle OAuth-based verification (Google or Apple)
      if (oauthProvider) {
        try {
          // Reauthenticate with appropriate OAuth provider
          if (oauthProvider === 'google.com') {
            await reauthenticateWithGoogle();
          } else if (oauthProvider === 'apple.com') {
            await reauthenticateWithApple();
          } else {
            return {
              success: false,
              error: 'Unsupported authentication provider',
              suggestedAction: 'Please use Google or Apple authentication'
            };
          }

          // After successful OAuth reauthentication, update password
          await updatePassword(currentUser, newPassword);
          return {
            success: true,
            suggestedAction: 'Password updated successfully. You can now use your new password to log in.'
          };
        } catch (error: unknown) {
          console.error(`❌ OAuth reauthentication failed:`, error);

          authErrorHandler.logAuthError(error, 'AuthContext-ChangePasswordWithOAuthFallback', {
            userId: currentUser.uid,
            provider: oauthProvider,
            step: 'oauth_reauthentication'
          });

          const errorCode = (error as { code?: string }).code;
          const errorMessage = (error as { message?: string }).message || String(error);

          // Handle popup-blocked errors
          if (errorCode === 'auth/popup-blocked') {
            return {
              success: false,
              error: 'Browser popup was blocked',
              suggestedAction: 'Please allow popups for this site and try again'
            };
          }

          // Handle user cancellation
          if (
            errorCode === 'auth/user-cancelled-login' ||
            errorCode === 'auth/cancelled-popup-request' ||
            errorMessage.includes('cancelled')
          ) {
            return {
              success: false,
              error: 'Authentication was cancelled',
              suggestedAction: 'Please try again'
            };
          }

          // Generic OAuth error
          return {
            success: false,
            error: `${oauthProvider} authentication failed`,
            suggestedAction: 'Please try again or contact support'
          };
        }
      } else {
        // No OAuth provider specified - use standard password change
        return changePassword('', newPassword, false);
      }
    } catch (error: unknown) {
      authErrorHandler.logAuthError(error, 'AuthContext-ChangePasswordWithOAuthFallback', {
        userId: currentUser?.uid,
        step: 'unexpected_error'
      });

      return {
        success: false,
        error: 'An unexpected error occurred',
        suggestedAction: 'Please try again or contact support'
      };
    }
  }

  /**
   * Permanently delete account
   * requires password for email auth, or recent login/reauth for social
   */
  async function deleteAccount(password?: string): Promise<void> {
    if (!currentUser) throw new Error('No user logged in');

    try {
      console.log('🗑️ Starting account deletion flow...');

      // 1. Re-authenticate
      const providerId = currentUser.providerData[0]?.providerId;

      if (providerId === 'password') {
        if (!password) throw new Error('Password required for deletion');

        const credential = EmailAuthProvider.credential(currentUser.email!, password);
        await reauthenticateWithCredential(currentUser, credential);
        console.log('✅ Re-authentication successful (password)');
      } else if (providerId === 'google.com') {
        await reauthenticateWithGoogle();
        console.log('✅ Re-authentication successful (Google)');
      } else if (providerId === 'apple.com') {
        await reauthenticateWithApple();
        console.log('✅ Re-authentication successful (Apple)');
      }

      // 2. Delete Supabase Data
      await userService.deleteUserDeep(currentUser.uid);

      // 3. Delete Firebase User
      await currentUser.delete();

      console.log('✅ Firebase user deleted');

      // 4. Cleanup
      await logout();

    } catch (error: any) {
      console.error('❌ Error deleting account:', error);

      if (error.code === 'auth/requires-recent-login') {
        throw new Error('Please log in again before deleting your account for security.');
      }

      throw error;
    }
  }

  const value: AuthContextValue = {
    currentUser,
    loading,
    isGuest,
    signup,
    login,
    guestLogin,
    googleLogin,
    reauthenticateWithGoogle,
    appleLogin,
    reauthenticateWithApple,
    logout,
    updateUserProfile,
    refreshAuth,
    changePassword,
    changePasswordWithOAuthFallback,
    resetPassword,
    getAuthErrorMessage,
    validateAuthState,
    refreshAuthToken,
    checkSignInMethods,
    linkGoogleAccount,
    signInAndLinkGoogle,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
