import React from 'react';
import { Navigate, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { logout } from '../firebase';
import { LayoutDashboard, Building2, Users, ClipboardList, LogOut, UserCircle, MessageSquare, Lightbulb, FlaskConical, Signal as SignalIcon, ClipboardCheck, Brain, Sparkles } from 'lucide-react';

const Layout: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Copilot', icon: Sparkles, path: '/copilot', roles: ['founder', 'om_admin', 'om_staff', 'mentor'] },
    { label: 'Interviews', icon: MessageSquare, path: '/discovery', roles: ['founder', 'om_admin', 'om_staff', 'mentor'] },
    { label: 'Patterns', icon: Brain, path: '/patterns', roles: ['founder', 'om_admin', 'om_staff', 'mentor'] },
    { label: 'Assumptions', icon: Lightbulb, path: '/assumptions', roles: ['founder', 'om_admin', 'om_staff', 'mentor'] },
    { label: 'Experiments', icon: FlaskConical, path: '/experiments', roles: ['founder', 'om_admin', 'om_staff', 'mentor'] },
    { label: 'Signals', icon: SignalIcon, path: '/signals', roles: ['founder', 'om_admin', 'om_staff', 'mentor'] },
    { label: 'Companies', icon: Building2, path: '/companies', roles: ['om_admin', 'om_staff'] },
    { label: 'Cohorts', icon: ClipboardList, path: '/cohorts', roles: ['om_admin', 'om_staff', 'founder'] },
    { label: 'Mentors', icon: Users, path: '/mentors', roles: ['om_admin', 'om_staff'] },
    { label: 'Readiness', icon: ClipboardCheck, path: '/readiness', roles: ['om_admin', 'om_staff'] },
    { label: 'Profile', icon: UserCircle, path: '/profile' },
  ];

  const filteredNav = navItems.filter(item => !item.roles || (profile && item.roles.includes(profile.role)));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">OM Venture OS</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
            {profile?.role.replace('_', ' ') || 'User'}
          </p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {filteredNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
