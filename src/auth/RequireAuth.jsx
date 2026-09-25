import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context';
import { FullPageSpinner } from '../components/Feedback';

export function RequireAuth() {
  const { loading, user, profile, profileError, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (profileError || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold">Account not set up</h1>
          <p className="mt-2 text-sm text-muted">
            Your login works, but no profile is linked to a business yet. Ask Torem to finish your account setup.
          </p>
          {profileError && (
            <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-left text-xs text-danger">
              {profileError.code ? `${profileError.code}: ` : ''}{profileError.message}
            </p>
          )}
          <button className="btn-secondary mt-4" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}
