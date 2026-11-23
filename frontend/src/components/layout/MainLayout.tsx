import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Search,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'My Subjects', path: '/subjects', icon: BookOpen },
    { label: 'Revision Notes', path: '/notes', icon: FileText },
    { label: 'AI Tutor', path: '/chat', icon: Sparkles },
    { label: 'AI Search', path: '/search', icon: Search },
    { label: 'Settings', path: '/settings', icon: Settings }
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-base text-blue-600 dark:text-blue-400">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="tracking-tight">StudyTrack</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            to="/search"
            className={`p-2 rounded-xl transition ${
              isActive('/search')
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="AI Search"
            aria-label="AI Search"
          >
            <Search className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 sticky top-0 h-screen shrink-0 justify-between">
        <div>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 px-3 py-3 mb-6 group">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                StudyTrack
              </span>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Checklist Platform
              </p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & bottom controls */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">


          {/* User badge */}
          {user && (
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="truncate mr-2">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex animate-in fade-in">
          <div className="w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5 font-bold text-blue-600">
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className="text-base text-slate-900 dark:text-white font-extrabold">StudyTrack</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">


              {user && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <div className="truncate mr-2">
                    <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Sticky Quick Navigation Bar (Core 4 items; AI Search is in the header) */}
      <div className="md:hidden sticky bottom-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around">
        {navItems.filter(item => item.path !== '/search' && item.path !== '/settings').map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-xl text-[10px] font-semibold transition ${
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
