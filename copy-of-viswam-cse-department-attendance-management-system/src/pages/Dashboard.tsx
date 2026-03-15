import React from 'react';
import { useAuth } from '../context/AuthContext';
import HodDashboard from '../components/dashboards/HodDashboard';
import FacultyDashboard from '../components/dashboards/FacultyDashboard';
import StudentDashboard from '../components/dashboards/StudentDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'HOD':
      return <HodDashboard />;
    case 'Faculty':
      return <FacultyDashboard />;
    case 'Student':
      return <StudentDashboard />;
    default:
      return <div>Invalid role</div>;
  }
}
