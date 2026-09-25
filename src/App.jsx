import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from './data';
import { RequireAdmin, RequireAuth } from './auth/RequireAuth';
import { AppShell } from './components/AppShell';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import ConversationDetail from './pages/ConversationDetail';
import Leads from './pages/Leads';
import Bookings from './pages/Bookings';
import FollowUps from './pages/FollowUps';
import Reviews from './pages/Reviews';
import Settings from './pages/Settings';
import Clients from './pages/admin/Clients';
import ClientDetail from './pages/admin/ClientDetail';

// Supabase invite / recovery / error links land on the site root with details in the URL hash.
function AuthLinkHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const type = hash.get('type');
    if (type === 'invite' || type === 'recovery' || type === 'magiclink') {
      navigate('/reset-password', { replace: true, state: { type } });
    } else if (hash.get('error')) {
      const message = hash.get('error_description') ?? 'This sign-in link is no longer valid.';
      window.history.replaceState(null, '', window.location.pathname);
      navigate('/login', { replace: true, state: { authError: message } });
    }
    return api.auth.onAuthStateChange((_session, event) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/reset-password', { replace: true, state: { type: 'recovery' } });
    });
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <>
    <AuthLinkHandler />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="conversations/:sessionId" element={<ConversationDetail />} />
          <Route path="leads" element={<Leads />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="follow-ups" element={<FollowUps />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="settings" element={<Settings />} />
          <Route element={<RequireAdmin />}>
            <Route path="admin/clients" element={<Clients />} />
            <Route path="admin/clients/:clientId" element={<ClientDetail />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
