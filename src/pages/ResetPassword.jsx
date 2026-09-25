import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../data';
import { Field } from '../components/ui';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const isInvite = useLocation().state?.type === 'invite';

  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match.');
    if (password.length < 8) return setError('Use at least 8 characters.');
    setBusy(true);
    const res = await api.auth.updatePassword(password);
    setBusy(false);
    if (res.error) return setError(res.error.message);
    navigate('/', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-lg font-semibold">{isInvite ? 'Welcome — choose a password' : 'Set a new password'}</h1>
        {isInvite && <p className="text-sm text-muted">You'll use this to sign in to your dashboard from now on.</p>}
        <Field label="New password">
          <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm password">
          <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          Save password
        </button>
      </form>
    </div>
  );
}
