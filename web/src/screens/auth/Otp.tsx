import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from './Phone';
import { api, ApiError } from '../../api/client';
import { Icon } from '../../components/Icon';
import { useAuthStore, AuthUser } from '../../stores/auth';

/**
 * OTP — six digit cells. Auto-verify when the 6th digit lands. On error
 * we shake the row (using the shared @keyframes shake) and blank the
 * input for retry. Numeric keypad also handles a native paste.
 */
export function Otp() {
  const nav = useNavigate();
  const [otp, setOtp] = useState('');
  const [phone] = useState(() => sessionStorage.getItem('otp-phone') ?? '');
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => { if (!phone) nav('/phone', { replace: true }); }, [phone, nav]);

  const digits = Array.from({ length: 6 }, (_, i) => otp[i] || '');

  const submit = async (code: string) => {
    setBusy(true);
    setError(false); setErrorMsg(null);
    try {
      const r = await api.postPublic<{ accessToken: string; refreshToken: string; user: AuthUser; isNewUser: boolean }>(
        '/auth/otp/verify', { phone_e164: phone, code },
      );
      setSession({ accessToken: r.accessToken, refreshToken: r.refreshToken, user: r.user });
      if (r.user.status === 'onboarding' || r.isNewUser) nav('/onboarding', { replace: true });
      else nav('/discover', { replace: true });
    } catch (err) {
      setError(true);
      setOtp('');
      if (err instanceof ApiError) setErrorMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const press = (d: string) => {
    if (d === 'del') { setOtp(otp.slice(0, -1)); setError(false); return; }
    if (otp.length >= 6) return;
    const next = otp + d;
    setOtp(next);
    if (next.length === 6) setTimeout(() => submit(next), 250);
  };

  return (
    <AuthLayout back={() => nav('/phone')} step={2} total={5}>
      <div className="eyebrow">step 2 of 5</div>
      <h1 className="h-display h-2" style={{ marginTop: 8 }}>{error ? 'wrong code.' : 'check your texts.'}</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 15, lineHeight: 1.4 }}>
        {error
          ? (errorMsg ?? "that one didn't match. try again.")
          : <>we sent a 6-digit code to <b style={{ color: 'var(--ink)' }}>{phone}</b>.</>}
      </p>

      <div style={{
        display: 'flex', gap: 8, marginTop: 28, justifyContent: 'center',
        animation: error ? 'shake 360ms cubic-bezier(.36,.07,.19,.97)' : 'none',
      }}>
        {digits.map((d, i) => (
          <div key={i} style={{
            flex: 1, height: 64, borderRadius: 14,
            border: `1.5px solid ${error ? 'var(--coral)' : otp.length === i ? 'var(--ink)' : 'var(--line-2)'}`,
            background: error ? 'var(--coral-soft)' : 'var(--card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--display)', fontWeight: 600, fontSize: 28,
            color: error ? 'var(--coral-deep)' : 'var(--ink)',
            maxWidth: 60,
          }}>{d}</div>
        ))}
      </div>

      {/* Hidden input to accept native paste + keyboard on desktop */}
      <input
        aria-label="6-digit code"
        inputMode="numeric" pattern="\d{6}"
        value={otp}
        maxLength={6}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 6);
          setOtp(v);
          if (v.length === 6) setTimeout(() => submit(v), 200);
        }}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
        autoFocus
      />

      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
        {['1','2','3','4','5','6','7','8','9','','0','del'].map((k, i) =>
          k === '' ? <div key={i} /> : (
            <button key={i} type="button" onClick={() => press(k)} disabled={busy} style={{
              padding: '16px 0', borderRadius: 14, border: 0,
              background: k === 'del' ? 'transparent' : 'var(--card)',
              fontFamily: 'var(--body)', fontWeight: 500, fontSize: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: k === 'del' ? 'none' : '0 1px 0 rgba(0,0,0,0.04)',
              opacity: busy ? 0.5 : 1,
            }}>
              {k === 'del' ? <Icon name="back" size={20} /> : k}
            </button>
          )
        )}
      </div>
    </AuthLayout>
  );
}
