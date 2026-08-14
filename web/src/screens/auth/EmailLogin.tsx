import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from './Phone';
import { api, ApiError } from '../../api/client';
import { useAuthStore, AuthUser } from '../../stores/auth';

export function EmailLogin() {
  const nav = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = /^\S+@\S+\.\S+$/.test(email) && password.length >= 8;

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await api.postPublic<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        '/auth/login/email', { email, password },
      );
      setSession({ accessToken: r.accessToken, refreshToken: r.refreshToken, user: r.user });
      nav(r.user.status === 'onboarding' ? '/onboarding' : '/discover', { replace: true });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout back={() => nav('/splash')}>
      <div className="eyebrow">welcome back</div>
      <h1 className="h-display h-2" style={{ marginTop: 8 }}>log in.</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 15, lineHeight: 1.4 }}>
        same email, same matches, same chaos.
      </p>

      <div style={{ marginTop: 22 }}>
        <input className="input" type="email" placeholder="you@somewhere.com"
          value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" />
      </div>
      <div style={{ marginTop: 10 }}>
        <input className="input" type="password" placeholder="password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      {err && <div style={{ marginTop: 12, color: 'var(--coral)', fontSize: 13 }}>{err}</div>}

      <div style={{ marginTop: 24 }}>
        <button className="btn coral full lg" disabled={!valid || busy} onClick={submit}>
          {busy ? 'signing in…' : 'log in'}
        </button>
        <button className="btn ghost full" style={{ marginTop: 6, fontSize: 14 }} onClick={() => nav('/phone')}>
          use phone instead
        </button>
      </div>
    </AuthLayout>
  );
}
