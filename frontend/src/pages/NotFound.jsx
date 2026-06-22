import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-display font-bold text-primary-200 dark:text-primary-800 mb-4">404</div>
        <h1 className="font-display font-bold text-3xl text-slate-900 dark:text-slate-100 mb-2">Page not found</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <Home className="w-4 h-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
