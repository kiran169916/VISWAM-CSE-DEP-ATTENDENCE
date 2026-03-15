/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FacultyManagement from './pages/FacultyManagement';
import StudentManagement from './pages/StudentManagement';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import FacultyDashboard from './components/dashboards/FacultyDashboard';
import Layout from './components/Layout';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/faculty" element={<ProtectedRoute roles={['HOD']}><FacultyManagement /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute roles={['HOD', 'Faculty']}><StudentManagement /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={['HOD']}><Reports /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute roles={['HOD']}><Profile /></ProtectedRoute>} />
          <Route path="/attendance/mark" element={<ProtectedRoute roles={['Faculty']}><FacultyDashboard /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
