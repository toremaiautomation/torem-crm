import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../data';
import { AuthContext } from './context';

const ACTIVE_CLIENT_KEY = 'torem-crm-active-client';

function readActiveClient() {
  try {
    return localStorage.getItem(ACTIVE_CLIENT_KEY) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [adminClientId, setAdminClientId] = useState(readActiveClient);

  useEffect(() => {
    let cancelled = false;
    api.auth.getSession().then((s) => !cancelled && setSession(s ?? null));
    const unsubscribe = api.auth.onAuthStateChange((s) => setSession(s ?? null));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    let cancelled = false;
    api.auth
      .getProfile(session.user.id)
      .then((p) => !cancelled && setProfile(p))
      .catch((e) => !cancelled && setProfileError(e));
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveClientId = useCallback((id) => {
    setAdminClientId(id);
    try {
      if (id) localStorage.setItem(ACTIVE_CLIENT_KEY, id);
      else localStorage.removeItem(ACTIVE_CLIENT_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const signOut = useCallback(async () => {
    await api.auth.signOut();
    setActiveClientId(null);
  }, [setActiveClientId]);

  const value = useMemo(() => {
    const isAdmin = profile?.role === 'admin';
    return {
      loading: session === undefined || (!!session?.user && !profile && !profileError),
      session,
      user: session?.user ?? null,
      profile,
      profileError,
      isAdmin,
      // Admins can view any client (or all, with null). Clients are pinned to their own.
      activeClientId: isAdmin ? adminClientId : profile?.client_id ?? null,
      setActiveClientId: isAdmin ? setActiveClientId : () => {},
      signOut,
    };
  }, [session, profile, profileError, adminClientId, setActiveClientId, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
