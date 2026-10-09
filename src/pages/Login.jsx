import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/context';
import { api, IS_MOCK } from '../data';
import { Avatar, Field } from '../components/ui';
import { Spinner } from '../components/Feedback';

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
  </svg>
);

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.091a4 4 0 00-5.557-5.556z" clipRule="evenodd" />
    <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
  </svg>
);

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
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState(location.state?.authError ?? null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function switchMode(next) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  function normalizeError(msg) {
    if (!msg) return 'Something went wrong. Please try again.';
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login') || lower.includes('invalid credentials') || lower.includes('email not confirmed'))
      return 'Incorrect email or password.';
    return 'Something went wrong. Please try again.';
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const trimmedEmail = email.trim();
    const res =
      mode === 'password'
        ? await api.auth.signInWithPassword(trimmedEmail, password)
        : mode === 'magic'
          ? await api.auth.signInWithOtp(trimmedEmail)
          : await api.auth.resetPassword(trimmedEmail);
    setBusy(false);
    if (res.error) {
      if (mode === 'password') {
        setError(normalizeError(res.error.message));
      } else if (mode === 'magic') {
        const lower = (res.error.message ?? '').toLowerCase();
        // "Signups not allowed for otp" means the email has no account. Treat as
        // neutral success so we never reveal whether an account exists.
        if (lower.includes('signups not allowed') || lower.includes('user not found') || lower.includes('email not found')) {
          setNotice('If that email has an account, we sent a sign-in link. It can take a minute. Check your spam folder.');
          setCooldown(30);
        } else {
          setError(res.error.message);
        }
      } else {
        setError(res.error.message);
      }
    } else if (mode === 'magic') {
      setNotice('If that email has an account, we sent a sign-in link. It can take a minute. Check your spam folder.');
      setCooldown(30);
    } else if (mode === 'reset') {
      setNotice('Check your email for a password reset link.');
    }
  }

  const magicCoolingDown = mode === 'magic' && cooldown > 0 && !!notice;

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email">
        <input
          className="input"
          type="email"
          required
          autoComplete={mode === 'password' ? 'username' : 'email'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      {mode === 'password' && (
        <Field label="Password">
          <div className="relative">
            <input
              className="input pr-10"
              type={showPwd ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-pressed={showPwd}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
              onClick={() => setShowPwd((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {showPwd ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>
      )}
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-success-ink">{notice}</p>}
      <button className="btn-primary w-full" disabled={busy || magicCoolingDown}>
        {busy ? <Spinner className="border-white/40 border-t-white" /> : null}
        {mode === 'password'
          ? 'Sign in'
          : mode === 'magic'
            ? magicCoolingDown
              ? `Resend in ${cooldown}s`
              : notice
                ? 'Resend link'
                : 'Email me a sign-in link'
            : 'Send reset link'}
      </button>
      <div className="flex justify-between text-xs text-muted">
        <button type="button" className="hover:text-ink" onClick={() => switchMode(mode === 'magic' ? 'password' : 'magic')}>
          {mode === 'magic' ? 'Use a password instead' : 'Use a magic link'}
        </button>
        <button type="button" className="hover:text-ink" onClick={() => switchMode(mode === 'reset' ? 'password' : 'reset')}>
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
    <div className="login-page-root">
      {/* Ambient blobs */}
      <div className="login-blobs" aria-hidden="true">
        <div className="login-blob login-blob-a" />
        <div className="login-blob login-blob-b" />
        <div className="login-blob login-blob-c" />
      </div>

      <div className="login-wrap">
        <div className="login-grid">

          {/* ── Left: brand panel ── */}
          <div className="login-copy">
            <img
              src="https://app.toremai.com/torem-logo-white.png"
              alt="Torem AI"
              style={{ height: '180px', width: 'auto', objectFit: 'contain' }}
            />
            <h1>Never miss another customer inquiry.</h1>
            <p>Every conversation, lead, and booking your AI assistant captures — in one place.</p>
            <div className="login-stats">
              <div><strong>24/7</strong><span>Always answering</span></div>
              <div><strong>2–5 days</strong><span>To go live</span></div>
              <div><strong>$0</strong><span>Setup fee</span></div>
            </div>
          </div>

          {/* ── Right: glass form panel ── */}
          <div className="login-form-side">
            {/* Mobile logo — hidden on lg+ (left panel covers it) */}
            <div className="mb-6 lg:hidden">
              <img
                src="https://app.toremai.com/torem-logo.png"
                alt="Torem AI"
                style={{ height: '140px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
            <h2>Sign in to your dashboard</h2>
            <p className="login-form-sub">
              {IS_MOCK ? 'Demo mode — pick an account to explore.' : 'Use the email Torem set up for your business.'}
            </p>
            {IS_MOCK ? <DemoAccounts /> : <RealLogin />}
          </div>

        </div>
      </div>
    </div>
  );
}
