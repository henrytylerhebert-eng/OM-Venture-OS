import React from 'react';
import { useAuth } from '../components/AuthProvider';
import AdminDashboard from './AdminDashboard';
import FounderDashboard from './FounderDashboard';
import MentorDashboard from './MentorDashboard';

const Dashboard: React.FC = () => {
  const { profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Profile Not Found</h2>
          <p className="text-gray-500 mt-2">Please contact an administrator to set up your account.</p>
        </div>
      </div>
    );
  }

  switch (profile.role) {
    case 'om_admin':
    case 'om_staff':
      return <AdminDashboard />;
    case 'mentor':
      return <MentorDashboard />;
    case 'founder':
    default:
      return <FounderDashboard />;
  }
};

export default Dashboard;
