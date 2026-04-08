import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { getRoleHomePath, getRoleScopedPath } from '../lib/roleRouting';
import type { RoleType } from '../types';

interface RolePathRedirectProps {
  segment?: string;
  allowedRoles?: RoleType[];
}

const RolePathRedirect: React.FC<RolePathRedirectProps> = ({ segment, allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-200" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <Navigate to="/" replace />;
  }

  const target =
    allowedRoles && !allowedRoles.includes(profile.role)
      ? getRoleHomePath(profile.role)
      : getRoleScopedPath(profile.role, segment);

  return <Navigate to={target} replace />;
};

export default RolePathRedirect;
