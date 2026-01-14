import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/auth/Login';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import EventManagement from './components/EventManagement';
import VideoVerification from './components/VideoVerification';
import ConnectionRequests from './components/ConnectionRequests';
import AnnouncementManagement from './components/AnnouncementManagement';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router basename="/admindashboard">
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/home" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute>
                <Layout>
                  <EventManagement />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/videos" element={
              <ProtectedRoute>
                <Layout>
                  <VideoVerification />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/connections" element={
              <ProtectedRoute>
                <Layout>
                  <ConnectionRequests />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/announcements" element={
              <ProtectedRoute>
                <Layout>
                  <AnnouncementManagement />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
