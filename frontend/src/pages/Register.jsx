// frontend/src/pages/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';


export default function Register() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    phone: '',        // ← Will be required now
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  // Real-time validation function
  const validateField = (name, value, allData = formData) => {
    switch (name) {
      case 'name':
        if (!value) return 'Name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
        if (value.length > 50) return 'Name cannot exceed 50 characters';
        const trimmedValue = value.trim();
        if (trimmedValue.length === 0) return 'Name cannot be only spaces';
        if (!/[A-Za-z]/.test(value)) return 'Name must contain letters';
        const repeatedCharPattern = /^(.)\1+$/i;
        if (repeatedCharPattern.test(trimmedValue.replace(/\s/g, ''))) {
          return 'Please enter a valid name (not just repeated characters)';
        }
        const letters = trimmedValue.toLowerCase().match(/[a-z]/g) || [];
        const uniqueLetters = new Set(letters);
        if (uniqueLetters.size < 2 && letters.length > 0) {
          return 'Please enter a valid name with different letters';
        }
        const letterCount = (value.match(/[A-Za-z]/g) || []).length;
        const spaceCount = (value.match(/\s/g) || []).length;
        if (letterCount < 2) return 'Name must contain at least 2 letters';
        if (spaceCount > letterCount) return 'Name has too many spaces';

        if (!/^[A-Za-z\s\-']+$/.test(value)) {
          return 'Name can only contain letters, spaces, hyphens, and apostrophes';
        }

        return '';

      case 'email':
        if (!value) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email (e.g., name@example.com)';
        return '';

      case 'department':
        if (!value) return 'Department is required';
        if (value.length < 2) return 'Please enter a valid department name';
        return '';

      case 'phone':  // ← UPDATED: Made required
        if (!value) return 'Phone number is required';
        const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
        if (!phoneRegex.test(value)) return 'Please enter a valid phone number (10-15 digits)';
        if (value.replace(/\D/g, '').length < 10) return 'Phone number must have at least 10 digits';
        return '';

      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (!/[A-Z]/.test(value)) return 'Password should contain at least one uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password should contain at least one lowercase letter';
        if (!/[0-9]/.test(value)) return 'Password should contain at least one number';
        return '';

      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== allData.password) return 'Passwords do not match';
        return '';

      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    const error = validateField(name, value, newFormData);
    setErrors(prev => ({ ...prev, [name]: error }));

    if (name === 'password' && newFormData.confirmPassword) {
      const confirmError = validateField('confirmPassword', newFormData.confirmPassword, newFormData);
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name], formData);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    const allTouched = {};
    Object.keys(formData).forEach(field => {
      allTouched[field] = true;
    });
    setTouched(allTouched);

    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field], formData);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const getPasswordStrength = () => {
    const pwd = formData.password;
    if (!pwd || pwd.length === 0) return null;

    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { text: 'Weak', color: 'text-red-600', bg: 'bg-red-100', width: '33%' };
    if (strength <= 4) return { text: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100', width: '66%' };
    return { text: 'Strong', color: 'text-green-600', bg: 'bg-green-100', width: '100%' };
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...registerData } = formData;
      const user = await authRegister(registerData);
      toast.success(`Welcome to EventGather, ${user.name.split(' ')[0]}!`);
      navigate('/events');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed';

      if (errorMessage.includes('duplicate') || errorMessage.includes('already registered')) {
        setErrors(prev => ({ ...prev, email: 'This email is already registered. Please login instead.' }));
        setTouched(prev => ({ ...prev, email: true }));
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display font-bold text-3xl text-slate-900 mb-2">Create account</h1>
          <p className="text-slate-500">Join EventGather and start discovering amazing events</p>
        </div>

        <div className="card p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Name Field - Updated success message */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input pr-10 ${touched.name && !errors.name && formData.name ? 'border-green-500' :
                      touched.name && errors.name ? 'border-red-500' : ''
                    }`}
                  placeholder="John Doe"
                />
                {touched.name && formData.name && !errors.name && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
                {touched.name && errors.name && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                )}
              </div>
              {touched.name && errors.name && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.name}
                </p>
              )}
              {/* ✅ UPDATED: More specific success message */}
              {touched.name && !errors.name && formData.name && (
                <p className="text-xs text-green-500 mt-1">✓ Valid name</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input pr-10 ${touched.email && !errors.email && formData.email ? 'border-green-500' :
                    touched.email && errors.email ? 'border-red-500' : ''
                    }`}
                  placeholder="you@example.com"
                />
                {touched.email && formData.email && !errors.email && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
                {touched.email && errors.email && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                )}
              </div>
              {touched.email && errors.email && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.email}
                </p>
              )}
              {touched.email && !errors.email && formData.email && (
                <p className="text-xs text-green-500 mt-1">✓ Email format is valid</p>
              )}
            </div>

            {/* Department and Phone Row - BOTH REQUIRED NOW */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input ${touched.department && !errors.department && formData.department ? 'border-green-500' :
                    touched.department && errors.department ? 'border-red-500' : ''
                    }`}
                  placeholder="e.g., CSE"
                />
                {touched.department && errors.department && (
                  <p className="text-xs text-red-500 mt-1">{errors.department}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>  {/* ← Added red star */}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input ${touched.phone && !errors.phone && formData.phone ? 'border-green-500' :
                    touched.phone && errors.phone ? 'border-red-500' : ''
                    }`}
                  placeholder="9876543210"
                />
                {touched.phone && errors.phone && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.phone}
                  </p>
                )}
                {touched.phone && !errors.phone && formData.phone && (
                  <p className="text-xs text-green-500 mt-1">✓ Phone number looks good!</p>
                )}
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input pr-10 ${touched.password && !errors.password && formData.password ? 'border-green-500' :
                    touched.password && errors.password ? 'border-red-500' : ''
                    }`}
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {touched.password && formData.password && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-slate-600">Password requirements:</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${formData.password.length >= 6 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {formData.password.length >= 6 ? '✓' : '○'} 6+ characters
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${/[A-Z]/.test(formData.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {/[A-Z]/.test(formData.password) ? '✓' : '○'} Uppercase
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${/[a-z]/.test(formData.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {/[a-z]/.test(formData.password) ? '✓' : '○'} Lowercase
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${/[0-9]/.test(formData.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {/[0-9]/.test(formData.password) ? '✓' : '○'} Number
                    </span>
                  </div>

                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${passwordStrength.text === 'Weak' ? 'bg-red-500' :
                              passwordStrength.text === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                            style={{ width: passwordStrength.width }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${passwordStrength.color}`}>
                          {passwordStrength.text}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {touched.password && errors.password && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input pr-10 ${touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword ? 'border-green-500' :
                    touched.confirmPassword && errors.confirmPassword ? 'border-red-500' : ''
                    }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.confirmPassword}
                </p>
              )}
              {touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword && formData.password && (
                <p className="text-xs text-green-500 mt-1">✓ Passwords match!</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}