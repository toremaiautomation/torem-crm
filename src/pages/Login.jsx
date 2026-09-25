import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/context';
import { api, IS_MOCK } from '../data';
import { Avatar, Field } from '../components/ui';
import { Spinner } from '../components/Feedback';

function DemoAccounts() {
  const [busy, setBusy] = useState(null);
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Demo accounts</p>
      {api.mockUsers.map((u) => (
        <button
          key={u.user_id}
          disabled={!!busy}
          onClick={async () => {
            setBusy(u.user_id);
            await api.auth.signInAs(u.user_id);
          }}
          className="flex w-full items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5 text-left transition hover:border-brand hover:bg-surface"
        >
          <Avatar name={u.full_name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{u.full_name}</span>
            <span className="block truncate text-xs text-muted">{u.email}</span>
          </span>
          <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium uppercase text-muted">{u.role}</span>
          {busy === u.user_id && <Spinner />}
        </button>
      ))}
    </div>
  );
}

function RealLogin() {
  const location = useLocation();
  const [mode, setMode] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(location.state?.authError ?? null);
  const [notice, setNotice] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const res =
      mode === 'password'
        ? await api.auth.signInWithPassword(email, password)
        : mode === 'magic'
          ? await api.auth.signInWithOtp(email)
          : await api.auth.resetPassword(email);
    setBusy(false);
    if (res.error) setError(res.error.message);
    else if (mode === 'magic') setNotice('Check your email for a sign-in link.');
    else if (mode === 'reset') setNotice('Check your email for a password reset link.');
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email">
        <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {mode === 'password' && (
        <Field label="Password">
          <input
            className="input"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      )}
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-success-ink">{notice}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? <Spinner className="border-white/40 border-t-white" /> : null}
        {mode === 'password' ? 'Sign in' : mode === 'magic' ? 'Email me a sign-in link' : 'Send reset link'}
      </button>
      <div className="flex justify-between text-xs text-muted">
        <button type="button" className="hover:text-ink" onClick={() => setMode(mode === 'magic' ? 'password' : 'magic')}>
          {mode === 'magic' ? 'Use a password instead' : 'Use a magic link'}
        </button>
        <button type="button" className="hover:text-ink" onClick={() => setMode(mode === 'reset' ? 'password' : 'reset')}>
          {mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}
        </button>
      </div>
    </form>
  );
}

export default function Login() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (!loading && user) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />;

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-navy p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-lg font-bold">T</span>
          <span className="text-lg font-semibold">Torem AI</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-tight">Never miss another customer inquiry.</h1>
          <p className="mt-3 max-w-md text-white/70">
            Every conversation, lead, and booking your AI assistant captures — in one place.
          </p>
        </div>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} Torem AI · Houston, TX</p>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-lg font-bold text-white">T</span>
            <span className="text-lg font-semibold">Torem AI</span>
          </div>
          <h2 className="text-xl font-semibold">Sign in to your dashboard</h2>
          <p className="mt-1 mb-6 text-sm text-muted">
            {IS_MOCK ? 'Demo mode — pick an account to explore with sample data.' : 'Use the email Torem set up for your business.'}
          </p>
          {IS_MOCK ? <DemoAccounts /> : <RealLogin />}
        </div>
      </div>
    </div>
  );
}
