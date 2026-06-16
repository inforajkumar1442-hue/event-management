import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Calendar, User, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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
    `text-sm font-medium transition-colors ${isActive ? 'text-primary-600' : 'text-slate-600 hover:text-primary-600'}`;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-slate-900">EventGather</span>
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
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
                >
                  <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{user.name?.split(' ')[0]}</span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-slate-100 py-1 z-50 animate-fade-in">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Link
                      to={getDashboardPath()}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setProfileOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" /> {getDashboardName()}
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="w-4 h-4" /> Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
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

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-3 animate-slide-up">
          <NavLink to="/events" className="block text-sm font-medium text-slate-700 py-2" onClick={() => setMenuOpen(false)}>Events</NavLink>
          {user ? (
            <>
              <NavLink 
                to={getDashboardPath()} 
                className="block text-sm font-medium text-slate-700 py-2" 
                onClick={() => setMenuOpen(false)}
              >
                {getDashboardName()}
              </NavLink>
              <NavLink to="/profile" className="block text-sm font-medium text-slate-700 py-2" onClick={() => setMenuOpen(false)}>Profile</NavLink>
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