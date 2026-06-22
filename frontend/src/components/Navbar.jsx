import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Calendar, LogOut, Settings, LayoutDashboard, Moon, Sun, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout, resendVerification } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [autoShow, setAutoShow] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const hoverTimeout = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    if (justLoggedIn === 'true') {
      sessionStorage.removeItem('justLoggedIn');
      setAutoShow(true);
      setProfileOpen(true);
      const timer = setTimeout(() => {
        setProfileOpen(false);
        setAutoShow(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  const handleProfileEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setProfileOpen(true), 100);
  }, []);

  const handleProfileLeave = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (!autoShow) {
      hoverTimeout.current = setTimeout(() => setProfileOpen(false), 200);
    }
  }, [autoShow]);

  const closeProfile = useCallback(() => {
    setProfileOpen(false);
    setAutoShow(false);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Get the correct dashboard path based on user role
  const getDashboardPath = () => {
  if (!user) return '/dashboard';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'staff') return '/staff';
  return '/dashboard';
};

const getDashboardName = () => {
  if (!user) return 'Dashboard';
  if (user.role === 'admin') return 'Admin';
  if (user.role === 'staff') return 'Staff';
  return 'Dashboard';
};

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400'}`;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm dark:bg-slate-900/80 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-slate-900 dark:text-white">EventGather</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/events" className={navLinkClass}>Events</NavLink>
            {user && (
              <NavLink to={getDashboardPath()} className={navLinkClass}>
                {getDashboardName()}
              </NavLink>
            )}
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {user && <NotificationBell />}
            {user ? (
              <div
                ref={profileRef}
                className="relative"
                onMouseEnter={handleProfileEnter}
                onMouseLeave={handleProfileLeave}
              >
                <button
                  onMouseEnter={handleProfileEnter}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
                >
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700">{user.name?.split(' ')[0]}</span>
                </button>
                {profileOpen && (
                  <div
                    onMouseEnter={handleProfileEnter}
                    onMouseLeave={handleProfileLeave}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-slate-100 py-1 z-50 animate-fade-in dark:bg-slate-800 dark:border-slate-700"
                  >
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                    <Link
                      to={getDashboardPath()}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                      onClick={closeProfile}
                    >
                      <LayoutDashboard className="w-4 h-4" /> {getDashboardName()}
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                      onClick={closeProfile}
                    >
                      <Settings className="w-4 h-4" /> Profile Settings
                    </Link>
                    <button
                      onClick={() => { closeProfile(); handleLogout(); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm py-2">Login</Link>
                <Link to="/register" className="btn-primary text-sm py-2">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Email Verification Banner */}
      {user && !user.isEmailVerified && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm">
              <Mail className="w-4 h-4 shrink-0" />
              <span>Please verify your email address to access all features.</span>
            </div>
            <button
              onClick={async () => {
                if (sendingVerification) return;
                setSendingVerification(true);
                try {
                  await resendVerification();
                  toast.success('Verification email sent!');
                } catch {
                  toast.error('Failed to send. Try again later.');
                } finally {
                  setSendingVerification(false);
                }
              }}
              disabled={sendingVerification}
              className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 underline whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              {sendingVerification && <Loader2 className="w-3 h-3 animate-spin" />}
              {sendingVerification ? 'Sending...' : 'Resend Email'}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-3 animate-slide-up dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Menu</span>
            <div className="flex items-center gap-1">
              {user && (
                <div className="relative" onClick={() => setMenuOpen(false)}>
                  <NotificationBell />
                </div>
              )}
              <button
                onClick={toggle}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <NavLink to="/events" className="block text-sm font-medium text-slate-700 dark:text-slate-300 py-2" onClick={() => setMenuOpen(false)}>Events</NavLink>
          {user ? (
            <>
              <NavLink 
                to={getDashboardPath()} 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 py-2" 
                onClick={() => setMenuOpen(false)}
              >
                {getDashboardName()}
              </NavLink>
              <NavLink to="/profile" className="block text-sm font-medium text-slate-700 dark:text-slate-300 py-2" onClick={() => setMenuOpen(false)}>Profile</NavLink>
              <button onClick={handleLogout} className="block text-sm font-medium text-red-600 py-2 w-full text-left">Logout</button>
            </>
          ) : (
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="btn-secondary flex-1 text-center text-sm" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="btn-primary flex-1 text-center text-sm" onClick={() => setMenuOpen(false)}>Register</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}