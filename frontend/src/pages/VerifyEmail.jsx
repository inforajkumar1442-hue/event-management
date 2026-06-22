import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const { token } = useParams();
  const { fetchUser } = useAuth();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/auth/verify-email/${token}`);
        await fetchUser();
        setStatus('success');
      } catch {
        setStatus('error');
      }
    };

    verify();
  }, [token, fetchUser]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        {status === 'loading' && (
          <div>
            <Loader2 className="w-16 h-16 text-primary-500 animate-spin mx-auto mb-4" />
            <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 mb-2">
              Verifying your email...
            </h1>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 mb-2">
              Email Verified!
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Your email has been verified successfully. You can now access all features.
            </p>
            <Link to="/dashboard" className="btn-primary inline-flex">
              Go to Dashboard
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 mb-2">
              Link Expired
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              This verification link is invalid or has expired. Request a new one from your profile.
            </p>
            <Link to="/profile" className="btn-primary inline-flex">
              Go to Profile
            </Link>
          </div>
        )}

        {status === 'invalid' && (
          <div>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 mb-2">
              Invalid Link
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              No verification token provided. Please check your email for a valid link.
            </p>
            <Link to="/" className="btn-primary inline-flex">
              Go Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
