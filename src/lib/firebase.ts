// Firebase configuration and initialization
import { initializeApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth, connectAuthEmulator } from 'firebase/auth';
import { Firestore, getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';
import { FirebaseStorage, getStorage, connectStorageEmulator } from 'firebase/storage';
import { Messaging, getMessaging, getToken, onMessage } from 'firebase/messaging';
import { Analytics, getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';

import { validateFirebaseConfig } from '../utils/validation/configValidation';
import { FirebaseConfig } from '../types/api/firebase';

// Get Firebase config from runtime (window.FIREBASE_CONFIG) or build-time (process.env)
const getRuntimeConfig = (): FirebaseConfig => {
  // @ts-ignore - window.FIREBASE_CONFIG is loaded from public/config.js
  if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) {
    // @ts-ignore
    return window.FIREBASE_CONFIG;
  }

  // Fallback to environment variables (for local development)
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.REACT_APP_FIREBASE_APP_ID || '',
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
  };
};

const firebaseConfig: FirebaseConfig = getRuntimeConfig();

// Validate configuration before initializing
validateFirebaseConfig(firebaseConfig);

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err: { code: string; message: string }) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, offline persistence disabled. Only one tab can have offline persistence enabled at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser doesn\'t support offline persistence. Some offline features may be limited.');
  } else {
    console.error('Failed to enable offline persistence:', err);
  }
});

// Initialize Cloud Messaging conditionally
let messaging: Messaging | null = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (error) {
}

// Initialize Analytics conditionally with proper error handling
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  // Check if Analytics is supported before initializing
  isAnalyticsSupported()
    .then((supported) => {
      if (supported && firebaseConfig.measurementId) {
        try {
          analytics = getAnalytics(app);
        } catch (error) {
          console.warn('⚠️ Firebase Analytics initialization failed:', error);
        }
      } else {
      }
    })
    .catch((error) => {
      console.warn('⚠️ Failed to check Analytics support:', error);
    });
}

export { messaging, getToken, onMessage, analytics };

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FIREBASE_EMULATOR) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}

export default app;
