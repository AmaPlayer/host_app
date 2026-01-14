// AmaPlayer Cloud Functions for Security and Moderation
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Admin role management and verification functions
export * from './admin';
// Content moderation functions
export * from './moderation';
// Notification functions (for existing notification service)
export * from './notifications';