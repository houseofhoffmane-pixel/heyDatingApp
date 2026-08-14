import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Icon } from '../../components/Icon';

const COUNTRIES = [
  { flag: '🇺🇸', code: '+1', name: 'United States', digits: 10 },
  { flag: '🇬🇧', code: '+44', name: 'United Kingdom', digits: 10 },
  { flag: '🇮🇳', code: '+91', name: 'India', digits: 10 },
  { flag: '🇨🇦', code: '+1', name: 'Canada', digits: 10 },
  { flag: '🇦🇺', code: '+61', name: 'Australia', digits: 9 },
  { flag: '🇸🇬', code: '+65', name: 'Singapore', digits: 8 },
  { flag: '🇩🇪', code: '+49', name: 'Germany', digits: 11 },
  { flag: '🇫🇷', code: '+33', name: 'France', digits: 9 },
  { flag: '🇯🇵', code: '+81', name: 'Japan', digits: 10 },
  { flag: '🇧🇷', code: '+55', name: 'Brazil', digits: 11 },
  { flag: '🇦🇪', code: '+971', name: 'UAE', digits: 9 },
];

export function Phone() {
  const nav = useNavigate();
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const digits = (phone.match(/\d/g) ?? []).length;
  const valid = digits === country.digits;

  async function submit() {
    setError(null);
    setBusy(true);
    const e164 = `${country.code}${phone.replace(/\D/g, '')}`;
    try {
      await api.postPublic('/auth/otp/request', { phone_e164: e164 });
      sessionStorage.setItem('otp-phone', e164);
      nav('/otp');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Could not send code. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout back={() => nav('/splash')} step={1} total={5}>
      <div className="eyebrow">step 1 of 5</div>
      <h1 className="h-display h-2" style={{ marginTop: 8 }}>what's your number?</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 15, lineHeight: 1.4 }}>
        we'll text you a code. no random calls. we promise.
      </p>

      <div style={{ marginTop: 28, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="input"
          style={{ width: 110, display: 'flex', alignItems: 'center', gap: 5, padding: '14px 12px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 20 }}>{country.flag}</span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{country.code}</span>
          <Icon name="chevronDown" size={14} color="var(--ink-3)" />
        </button>
        <input
          className="input"
          inputMode="numeric"
          placeholder="(555) 010 4242"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ flex: 1, letterSpacing: '0.02em' }}
          autoFocus
        />
      </div>

      <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 11, color: valid ? 'var(--mint-deep)' : 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {valid ? <><Icon name="check" size={12} color="var(--mint-deep)" /> looks good</> : `${digits}/${country.digits} digits`}
      </div>

      {error && <div style={{ marginTop: 12, color: 'var(--coral)', fontSize: 13 }}>{error}</div>}

      {pickerOpen && (
        <div className="card" style={{ marginTop: 12, padding: 0, maxHeight: 260, overflowY: 'auto' }}>
          {COUNTRIES.map((c, i) => (
            <div key={i} onClick={() => { setCountry(c); setPickerOpen(false); }} style={{
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: i === COUNTRIES.length - 1 ? 'none' : '1px solid var(--line)', cursor: 'pointer',
              background: c.name === country.name ? 'var(--bg-2)' : 'transparent',
            }}>
              <span style={{ fontSize: 22 }}>{c.flag}</span>
              <div style={{ flex: 1, fontSize: 14 }}>{c.name}</div>
              <div className="meta">{c.code}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <button className="btn coral full lg" disabled={!valid || busy} onClick={submit}>
          {busy ? 'sending…' : 'send code'}
        </button>
        <button className="btn ghost full" style={{ marginTop: 6, fontSize: 14 }} onClick={() => nav('/login/email')}>
          have an account? <b style={{ color: 'var(--coral)', marginLeft: 4 }}>log in</b>
        </button>
      </div>
    </AuthLayout>
  );
}

// ─── Shared auth layout — used by Phone/Otp/EmailLogin ─────────
export function AuthLayout({ children, back, step, total }: { children: React.ReactNode; back?: () => void; step?: number; total?: number }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(120% 60% at 50% 0%, var(--peach), var(--bg) 60%)',
      display: 'flex', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '32px 24px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {back ? (
            <button onClick={back} style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="back" size={18} />
            </button>
          ) : <span />}
          {step && total && (
            <div className="dots">
              {Array.from({ length: total }).map((_, i) => <i key={i} className={i < step ? 'on' : ''} />)}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
