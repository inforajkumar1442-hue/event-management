// frontend/src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary-500 dark:border-primary-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Protected Route - Any authenticated user
export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

// Admin Route - Only admin users
export const AdminRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  if (!user) return <Navigate to="/login" replace />;
  
  return user.role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

// Staff Route - Staff OR Admin users
export const StaffRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  if (!user) return <Navigate to="/login" replace />;
  
  // Allow both staff and admin to access staff routes
  return (user.role === 'staff' || user.role === 'admin') ? <Outlet /> : <Navigate to="/dashboard" replace />;
};