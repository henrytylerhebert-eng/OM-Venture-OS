import React from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { logout } from '../firebase';
import { formatRoleLabel } from '../lib/roleRouting';

type ShellTone = 'staff' | 'founder' | 'mentor';

export interface ShellNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
}

export interface ShellNavSection {
  heading: string;
  items: ShellNavItem[];
}

interface AppShellFrameProps {
  tone: ShellTone;
  eyebrow: string;
  title: string;
  summary: string;
  sections: ShellNavSection[];
}

const toneStyles: Record<
  ShellTone,
  {
    chrome: string;
    badge: string;
    activeItem: string;
    activeIcon: string;
    activeText: string;
    linkHover: string;
  }
> = {
  staff: {
    chrome: 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50',
    badge: 'border border-amber-200/20 bg-amber-400/10 text-amber-100',
    activeItem: 'bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20',
    activeIcon: 'text-slate-950',
    activeText: 'text-slate-950',
    linkHover: 'hover:bg-white/8 hover:text-white',
  },
  founder: {
    chrome: 'bg-gradient-to-b from-indigo-950 via-blue-950 to-slate-950 text-slate-50',
    badge: 'border border-sky-200/20 bg-sky-400/10 text-sky-100',
    activeItem: 'bg-sky-300 text-slate-950 shadow-lg shadow-sky-500/20',
    activeIcon: 'text-slate-950',
    activeText: 'text-slate-950',
    linkHover: 'hover:bg-white/8 hover:text-white',
  },
  mentor: {
    chrome: 'bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 text-slate-50',
    badge: 'border border-emerald-200/20 bg-emerald-400/10 text-emerald-100',
    activeItem: 'bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/20',
    activeIcon: 'text-slate-950',
    activeText: 'text-slate-950',
    linkHover: 'hover:bg-white/8 hover:text-white',
  },
};

export const AppShellFrame: React.FC<AppShellFrameProps> = ({ tone, eyebrow, title, summary, sections }) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const styles = toneStyles[tone];
  const allItems = sections.flatMap((section) => section.items);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className={`${styles.chrome} border-b border-white/10 lg:sticky lg:top-0 lg:h-screen lg:w-[320px] lg:border-b-0 lg:border-r lg:border-white/10`}>
          <div className="px-5 py-5 sm:px-6 lg:px-7">
            <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${styles.badge}`}>
              {eyebrow}
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/80">OM Venture OS</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
              </div>
              <p className="max-w-sm text-sm leading-6 text-slate-200/80">{summary}</p>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200/80">
                Signed in as <span className="font-semibold text-white">{formatRoleLabel(profile?.role)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 px-4 py-3 lg:hidden">
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {allItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path.split('/').length <= 2}
                  className={({ isActive }) =>
                    [
                      'flex min-w-max items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? styles.activeItem : 'bg-white/5 text-slate-200/80',
                    ].join(' ')
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden h-[calc(100%-210px)] flex-col justify-between px-4 pb-5 lg:flex">
            <nav className="space-y-5 overflow-y-auto pr-1">
              {sections.map((section) => (
                <div key={section.heading}>
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300/60">
                    {section.heading}
                  </p>
                  <div className="mt-2 space-y-1">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path.split('/').length <= 2}
                        className={({ isActive }) =>
                          [
                            'group flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors',
                            isActive ? styles.activeItem : `text-slate-200/80 ${styles.linkHover}`,
                          ].join(' ')
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <item.icon className={['mt-0.5 h-5 w-5 shrink-0', isActive ? styles.activeIcon : 'text-slate-300/70'].join(' ')} />
                            <div>
                              <p className={['text-sm font-semibold', isActive ? styles.activeText : 'text-slate-50'].join(' ')}>{item.label}</p>
                              <p className={['mt-1 text-xs leading-5', isActive ? 'text-slate-800/80' : 'text-slate-300/70'].join(' ')}>{item.description}</p>
                            </div>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-200/80 transition-colors hover:bg-white/8 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <main className="min-h-screen flex-1 bg-slate-50 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
