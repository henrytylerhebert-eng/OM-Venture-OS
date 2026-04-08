import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { getRoleHomePath } from '../lib/roleRouting';

const Dashboard: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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

  return <Navigate to={getRoleHomePath(profile.role)} replace />;
};

export default Dashboard;
