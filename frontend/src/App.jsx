// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute, AdminRoute, StaffRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import PaymentSuccess from './pages/PaymentSuccess';
import TicketPublic from './pages/TicketPublic';
import StaffDashboard from './pages/StaffDashboard';
import VerifyEmail from './pages/VerifyEmail';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <ErrorBoundary>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetail />} />
              
              {/* Payment Success - Public but requires session */}
              <Route path="/payment-success" element={<PaymentSuccess />} />

              {/* Protected Routes (any logged-in user) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<UserDashboard />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Staff Routes (staff and admin can access) */}
              <Route element={<StaffRoute />}>
                <Route path="/staff" element={<StaffDashboard />} />
              </Route>

              {/* Admin Only Routes */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>

              {/* Email Verification */}
              <Route path="/verify-email/:token" element={<VerifyEmail />} />

              {/* Public Ticket Page - for QR code scanning */}
              <Route path="/ticket/:id" element={<TicketPublic />} />

              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ErrorBoundary>
          </main>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'font-sans text-sm',
            style: { 
              borderRadius: '12px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}