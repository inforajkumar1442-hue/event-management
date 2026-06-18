import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Calendar, AlertCircle, Mail, Lock, ArrowRight, Phone, Headphones } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const from = location.state?.from?.pathname || '/events';

  const validateEmail = (email) => {
    if (!email) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return '';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
    
    const emailFormatError = validateEmail(formData.email);
    if (emailFormatError) {
      setEmailError(emailFormatError);
      toast.error(emailFormatError);
      return;
    }
    
    const passwordFormatError = validatePassword(formData.password);
    if (passwordFormatError) {
      setPasswordError(passwordFormatError);
      toast.error(passwordFormatError);
      return;
    }
    
    setLoading(true);
    
    try {
      const user = await login(formData.email, formData.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(user.role === 'admin' ? '/admin' : from, { replace: true });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      
      if (errorMessage.toLowerCase().includes('deactivated')) {
        setGeneralError(errorMessage);
        toast.error(errorMessage, { duration: 6000 });
        setTimeout(() => setShowSupportModal(true), 1000);
      }
      else if (errorMessage.toLowerCase().includes('not registered') || 
               errorMessage.toLowerCase().includes('email is not')) {
        setEmailError(errorMessage);
        toast.error(errorMessage);
      }
      else if (errorMessage.toLowerCase().includes('incorrect password') || 
               errorMessage.toLowerCase().includes('password is incorrect')) {
        setPasswordError(errorMessage);
        toast.error(errorMessage);
      }
      else if (errorMessage.toLowerCase().includes('inactive') || 
               errorMessage.toLowerCase().includes('disabled')) {
        setGeneralError(errorMessage);
        toast.error(errorMessage, { duration: 6000 });
      }
      else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-5/12 bg-gradient-to-br from-primary-600 to-primary-900 text-white">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <h2 className="font-display font-bold text-4xl mb-4">Welcome back to EventGather</h2>
        <p className="text-primary-200 text-lg leading-relaxed">
          Discover, register, and attend amazing events happening around you.
        </p>
        <div className="mt-12 space-y-4">
          {['Discover hundreds of events', 'Instant registration & QR tickets', 'Email reminders & notifications'].map(f => (
            <div key={f} className="flex items-center gap-3 text-primary-100">
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">✓</div>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="font-display font-bold text-3xl text-slate-900 mb-2">Sign in</h1>
            <p className="text-slate-500">Enter your credentials to access your account</p>
          </div>

          {/* Deactivated Account Error Banner */}
          {generalError && (
            <div className="mb-6 p-5 bg-red-50 border-l-4 border-red-500 rounded-xl animate-slide-up shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-800 text-base">Account Deactivated</h4>
                  <p className="text-sm text-red-700 mt-1 leading-relaxed">
                    {generalError}
                  </p>
                  <div className="mt-4 pt-3 border-t border-red-100">
                    <p className="text-xs text-red-600 font-medium mb-2">📞 Need immediate assistance?</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => setShowSupportModal(true)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Headphones className="w-3 h-3" />
                        Contact Support
                      </button>
                      <a
                        href="mailto:support@eventgather.com"
                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-red-300 text-red-700 text-xs rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Mail className="w-3 h-3" />
                        support@eventgather.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className={`relative rounded-xl transition-all duration-200 ${
                emailError ? 'ring-2 ring-red-500 ring-offset-0' : 'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-0'
              }`}>
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                    emailError ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white'
                  } focus:outline-none transition-colors`}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              {emailError && (
                <div className="mt-2 flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg animate-slide-up">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-sm">{emailError}</p>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Forgot?
                </Link>
              </div>
              <div className={`relative rounded-xl transition-all duration-200 ${
                passwordError ? 'ring-2 ring-red-500 ring-offset-0' : 'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-0'
              }`}>
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-12 py-3 rounded-xl border ${
                    passwordError ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white'
                  } focus:outline-none transition-colors`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <div className="mt-2 flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg animate-slide-up">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-sm">{passwordError}</p>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:underline">
              Create free account
            </Link>
          </p>
        </div>
      </div>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSupportModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-slate-900">Contact Support</h3>
                  <p className="text-sm text-slate-500">We're here to help you</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-red-50 p-4 rounded-xl">
                <p className="text-sm text-red-800 font-medium mb-2">Your account has been deactivated</p>
                <p className="text-xs text-red-700">
                  Please contact our support team to reactivate your account or resolve any issues.
                </p>
              </div>
              
              <div className="space-y-3">
                <a
                  href="tel:+917986971443"
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Call Us</p>
                      <p className="text-xs text-slate-500">+91 7986971443</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </a>
                
                <a
                  href="mailto:inforajkumar1442@gmail.com"
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-primary-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Email Us</p>
                      <p className="text-xs text-slate-500">inforajkumar1442@gmail.com</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </a>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100">
              <button
                onClick={() => setShowSupportModal(false)}
                className="btn-secondary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}