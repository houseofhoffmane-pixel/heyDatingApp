import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from './Phone';
import { api, ApiError } from '../../api/client';
import { useAuthStore, AuthUser } from '../../stores/auth';

/**
 * Sign up with email + password. The phone/OTP flow is temporarily
 * disabled until SMS provider is wired up (Twilio Verify or Firebase
 * Auth). Users who sign up here go straight to onboarding.
 */
export function EmailSignup() {
  const nav = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errCode, setErrCode] = useState<string | null>(null);
  const valid = /^\S+@\S+\.\S+$/.test(email) && password.length >= 8;

  async function submit() {
    setBusy(true); setErr(null); setErrCode(null);
    try {
      const r = await api.postPublic<{ accessToken: string; refreshToken: string; user: AuthUser; isNewUser: boolean }>(
        '/auth/signup/email', { email, password },
      );
      setSession({ accessToken: r.accessToken, refreshToken: r.refreshToken, user: r.user });
      nav('/onboarding', { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
        setErrCode(`${e.status} ${e.code}`);
      } else {
        setErr(e instanceof Error ? e.message : String(e));
        setErrCode('network / non-JSON response — server probably crashed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout back={() => nav('/splash')}>
      <div className="eyebrow">step 1 of 2</div>
      <h1 className="h-display h-2" style={{ marginTop: 8 }}>make an account.</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 15, lineHeight: 1.4 }}>
        email + password for now. we'll switch to phone/SMS closer to launch.
      </p>

      <div style={{ marginTop: 22 }}>
        <input className="input" type="email" placeholder="you@somewhere.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none" autoComplete="email" />
      </div>
      <div style={{ marginTop: 10 }}>
        <input className="input" type="password" placeholder="password (8+ chars)"
          value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password" />
      </div>

      {err && (
        <>
          <div style={{ marginTop: 12, color: 'var(--coral)', fontSize: 13 }}>{err}</div>
          {errCode && (
            <div style={{
              marginTop: 6, fontSize: 11, fontFamily: 'var(--mono, monospace)',
              color: 'var(--ink-3)', opacity: 0.7,
            }}>
              [debug: {errCode}]
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <button className="btn coral full lg" disabled={!valid || busy} onClick={submit}>
          {busy ? 'creating account…' : 'create account'}
        </button>
        <button className="btn ghost full" style={{ marginTop: 6, fontSize: 14 }} onClick={() => nav('/login/email')}>
          already have an account? log in
        </button>
      </div>
    </AuthLayout>
  );
}
