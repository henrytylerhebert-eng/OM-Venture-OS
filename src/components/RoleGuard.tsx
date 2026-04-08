import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { RoleType } from '../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: RoleType[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          You do not have the required permissions to view this page. 
          If you believe this is an error, please contact an OM administrator.
        </p>
        <Navigate to="/" replace />
      </div>
    );
  }

  return <>{children}</>;
};
