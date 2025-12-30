import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import PrivateRoute from './features/auth/PrivateRoute';
import NetworkStatus from './components/common/network/NetworkStatus';
import CacheDetector from './components/CacheDetector';
import ErrorBoundary from './components/common/safety/ErrorBoundary';
import ChunkErrorBoundary from './components/ChunkErrorBoundary';

import { registerSW } from './utils/service/serviceWorkerRegistration';
import { queryClient } from './lib/queryClient';
import errorHandler from './utils/error/errorHandler';
import './utils/logging/LoggingManager'; // Initialize centralized logging
import './styles/global.css';
import './styles/themes.css';
import './styles/optimized.css';
import './App.css';
import './performance.css';

// Optimized lazy loading with preloading for critical routes
const WelcomePage = React.lazy(() => import('./login_flow/components/WelcomePage'));
const RoleSelectionPage = React.lazy(() => import('./login_flow/components/RoleSelectionPage'));
const AboutPage = React.lazy(() => import('./login_flow/components/AboutPage'));
const AuthChoicePage = React.lazy(() => import('./login_flow/components/AuthChoicePage'));
const Login = React.lazy(() => import('./features/auth/Login'));
const Signup = React.lazy(() => import('./features/auth/Signup'));

// Core app components - preload after initial load
const Home = React.lazy(() => import(/* webpackChunkName: "home" */ './pages/home/Home'));
const Profile = React.lazy(() => import(/* webpackChunkName: "profile" */ './features/profile/pages/Profile'));
const Search = React.lazy(() => import(/* webpackChunkName: "search" */ './pages/search/Search'));
const AddPost = React.lazy(() => import(/* webpackChunkName: "addpost" */ './pages/addpost/AddPost'));
const Messages = React.lazy(() => import(/* webpackChunkName: "messages" */ './pages/messages/Messages'));

// Secondary features - load on demand
const Events = React.lazy(() => import(/* webpackChunkName: "events" */ './pages/events/Events'));
const PostDetail = React.lazy(() => import(/* webpackChunkName: "postdetail" */ './pages/postdetail/PostDetail'));
const StoryDetail = React.lazy(() => import(/* webpackChunkName: "stories" */ './features/stories/StoryDetail'));
const StorySharePage = React.lazy(() => import(/* webpackChunkName: "stories" */ './features/stories/StorySharePage'));
const VerificationPage = React.lazy(() => import(/* webpackChunkName: "verification" */ './pages/verification/VerificationPage'));
const VideoVerificationPage = React.lazy(() => import(/* webpackChunkName: "verification" */ './features/profile/pages/VideoVerification'));
const Settings = React.lazy(() => import(/* webpackChunkName: "settings" */ './features/settings/pages/Settings'));
const MomentsPage = React.lazy(() => import(/* webpackChunkName: "moments" */ './pages/moments/MomentsPage'));
const GroupsPage = React.lazy(() => import(/* webpackChunkName: "groups" */ './pages/groups/GroupsPage'));
const GroupDetails = React.lazy(() => import(/* webpackChunkName: "groups" */ './features/groups/GroupDetails'));

// Athlete Onboarding - separate chunk
const SportSelectionPage = React.lazy(() => import(/* webpackChunkName: "onboarding" */ './features/athlete-onboarding/components/SportSelectionPage'));
const PositionSelectionPage = React.lazy(() => import(/* webpackChunkName: "onboarding" */ './features/athlete-onboarding/components/PositionSelectionPage'));
const MultiSportPositionFlow = React.lazy(() => import(/* webpackChunkName: "onboarding" */ './features/athlete-onboarding/components/MultiSportPositionFlow'));
const SubcategorySelectionPage = React.lazy(() => import(/* webpackChunkName: "onboarding" */ './features/athlete-onboarding/components/SubcategorySelectionPage'));
const SpecializationPage = React.lazy(() => import(/* webpackChunkName: "onboarding" */ './features/athlete-onboarding/components/SpecializationPage'));
const AthleteAboutPage = React.lazy(() => import(/* webpackChunkName: "onboarding" */ './features/athlete-onboarding/components/AthleteAboutPage'));
const PersonalDetailsForm = React.lazy(() => import(/* webpackChunkName: "onboarding" */ './features/athlete-onboarding/components/PersonalDetailsForm'));


// Optimized loading component with minimal DOM and CSS
const LoadingSpinner: React.FC = React.memo(() => (
  <div className="loading-container">
    <div className="loading-spinner" />
  </div>
));

// Preload critical chunks after initial render
const preloadCriticalChunks = () => {
  // Preload home and profile chunks as they're most likely to be accessed
  import(/* webpackChunkName: "home" */ './pages/home/Home');
  import(/* webpackChunkName: "profile" */ './features/profile/pages/Profile');
};

function AppContent(): React.JSX.Element {
  const location = useLocation();

  useEffect(() => {
    // Optimized initialization
    const initializeApp = async (): Promise<void> => {
      const currentVersion = '2.1.1';

      // Set document title immediately
      document.title = 'AmaPlayer - Sports Social Media Platform';

      // Version management (non-blocking)
      try {
        const storedVersion = localStorage.getItem('amaplayer-version');
        if (!storedVersion || storedVersion !== currentVersion) {
          localStorage.setItem('amaplayer-version', currentVersion);
        }
      } catch (e) {
        // Silently handle localStorage errors
      }

      // Preload critical chunks after a short delay
      setTimeout(preloadCriticalChunks, 1000);
    };

    initializeApp();

    // Register service worker (non-blocking)
    setTimeout(() => {
      registerSW({
        onSuccess: () => console.log('SW: Registered successfully'),
        onUpdate: () => console.log('SW: Update available')
      });
    }, 2000);
  }, []);

  // Pause videos on route change
  useEffect(() => {
    // Dispatch custom event to notify all video components of route change
    window.dispatchEvent(new CustomEvent('routeChange', {
      detail: { pathname: location.pathname }
    }));
  }, [location.pathname]);

  return (
    <div className="App">
      <ErrorBoundary name="App-Root" userFriendlyMessage="The app encountered an unexpected error. Please refresh the page.">
        <CacheDetector />
        <NetworkStatus />
        <Suspense fallback={<LoadingSpinner />}>
          <ErrorBoundary name="App-Routes" userFriendlyMessage="There was an issue loading this page. Please try again.">
            <Routes>
              {/* Login Flow Routes */}
              <Route path="/" element={<WelcomePage key={location.key} />} />
              <Route path="/role-selection" element={<RoleSelectionPage />} />
              <Route path="/about/:role" element={<AboutPage />} />
              <Route path="/auth-choice/:role" element={<AuthChoicePage />} />
              <Route path="/login/:role" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Athlete Onboarding Routes */}
              <Route path="/athlete-onboarding/sport" element={<SportSelectionPage />} />
              <Route path="/athlete-onboarding/position" element={<PositionSelectionPage />} />
              <Route path="/athlete-onboarding/multi-position" element={<MultiSportPositionFlow />} />
              <Route path="/athlete-onboarding/subcategory" element={<SubcategorySelectionPage />} />
              <Route path="/athlete-onboarding/specialization" element={<SpecializationPage />} />
              <Route path="/athlete-onboarding/personal-details" element={<PersonalDetailsForm />} />
              <Route path="/about/athlete" element={<AthleteAboutPage />} />
              <Route path="/home" element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              } />
              <Route path="/search" element={
                <PrivateRoute>
                  <Search />
                </PrivateRoute>
              } />
              <Route path="/moments" element={
                <PrivateRoute>
                  <MomentsPage />
                </PrivateRoute>
              } />
              <Route path="/add-post" element={
                <PrivateRoute>
                  <AddPost />
                </PrivateRoute>
              } />
              <Route path="/messages" element={
                <PrivateRoute>
                  <Messages />
                </PrivateRoute>
              } />
              <Route path="/messages/:userId" element={
                <PrivateRoute>
                  <Messages />
                </PrivateRoute>
              } />
              <Route path="/events" element={
                <PrivateRoute>
                  <Events />
                </PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />
              <Route path="/profile/:userId" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              } />
              <Route path="/groups" element={
                <PrivateRoute>
                  <GroupsPage />
                </PrivateRoute>
              } />
              <Route path="/groups/:groupId" element={
                <PrivateRoute>
                  <GroupDetails />
                </PrivateRoute>
              } />
              <Route path="/post/:postId" element={
                <PrivateRoute>
                  <PostDetail />
                </PrivateRoute>
              } />
              <Route path="/story/:storyId" element={
                <PrivateRoute>
                  <StoryDetail />
                </PrivateRoute>
              } />
              <Route path="/story-share/:storyId" element={<StorySharePage />} />
              <Route path="/verify/:verificationId" element={<VerificationPage />} />
              <Route path="/verify/:userId/:videoId" element={<VideoVerificationPage />} />
            </Routes>
          </ErrorBoundary>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function App(): React.JSX.Element {
  return (
    <ChunkErrorBoundary>
      <ErrorBoundary name="App-Providers" userFriendlyMessage="Failed to initialize the application. Please refresh the page.">
        <Router>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <LanguageProvider>
                <AuthProvider>
                  <AppContent />
                </AuthProvider>
              </LanguageProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </Router>
      </ErrorBoundary>
    </ChunkErrorBoundary>
  );
}

export default App;
