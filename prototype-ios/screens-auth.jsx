// screens-auth.jsx — Email/password setup (end of onboarding) + login screen.

// ─────────────────────────────────────────────────────────────
// Email + password set during onboarding (after photos, before verify)
// ─────────────────────────────────────────────────────────────
function ScreenEmailPass({ go, email, setEmail, password, setPassword }) {
  const [revealed, setRevealed] = React.useState(false);
  const valid = /^\S+@\S+\.\S+$/.test(email) && password.length >= 8;
  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={() => go('photo')} title="" />
      <div className="screen-scroll" style={{ padding: '12px 24px 24px' }}>
        <div className="eyebrow">backup login · last step</div>
        <div className="h-display h-2" style={{ marginTop: 8 }}>secure it.</div>
        <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14.5, lineHeight: 1.4 }}>
          your number is your main login. add an email + password as backup, so a lost phone doesn't mean a lost account.
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>email</div>
          <input
            className="input"
            type="email"
            placeholder="you@somewhere.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>password</div>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={revealed ? 'text' : 'password'}
              placeholder="at least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: 60 }}
            />
            <button onClick={() => setRevealed(!revealed)} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 0, cursor: 'pointer',
              color: 'var(--ink-3)', fontSize: 12, fontWeight: 600, padding: '6px 10px',
              fontFamily: 'var(--mono)', letterSpacing: 0.06,
            }}>{revealed ? 'HIDE' : 'SHOW'}</button>
          </div>
          {/* strength */}
          <div style={{ marginTop: 10, display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3].map(i => {
              const score = password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : password.length >= 4 ? 1 : 0;
              const filled = i < score;
              const tone = score === 4 ? 'var(--mint-deep)' : score >= 2 ? 'var(--butter-deep)' : 'var(--coral)';
              return <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: filled ? tone : 'rgba(0,0,0,0.08)', transition: 'background 150ms' }} />;
            })}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-3)' }}>
            {password.length === 0 && 'use 8+ characters · mix it up'}
            {password.length > 0 && password.length < 8 && `${8 - password.length} more characters`}
            {password.length >= 8 && password.length < 10 && 'okay, but stronger is better'}
            {password.length >= 10 && password.length < 12 && 'good'}
            {password.length >= 12 && 'great'}
          </div>
        </div>

        <div style={{ marginTop: 18, padding: 12, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
            <Icon name="check" size={13} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
            we'll send a confirmation link to verify the email. you can finish onboarding without confirming, but you'll need it to recover your account later.
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 16px 14px', background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
        <button className="btn coral full lg" onClick={() => go('verify')} disabled={!valid} style={{ opacity: valid ? 1 : 0.4 }}>
          continue
        </button>
        <button className="btn ghost full" style={{ marginTop: 4, fontSize: 13 }} onClick={() => go('verify')}>
          skip — i'll add later
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Login screen — phone OR email tab
// ─────────────────────────────────────────────────────────────
function ScreenLogin({ go }) {
  const [tab, setTab] = React.useState('phone');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const canSubmit = tab === 'phone' ? phone.length >= 7 : (/^\S+@\S+\.\S+$/.test(email) && password.length >= 8);

  return (
    <div className="screen" style={{
      background: 'radial-gradient(120% 80% at 50% 0%, var(--peach), var(--bg) 60%)',
    }}>
      <div className="status-pad" />
      <div style={{ padding: '20px 28px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.035em' }}>hey</span>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--coral)', display: 'inline-block', transform: 'translateY(-3px)' }} />
        </div>
      </div>

      <div style={{ padding: '20px 24px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="eyebrow">welcome back</div>
        <div className="h-display h-2" style={{ marginTop: 8 }}>log in.</div>
        <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14.5, lineHeight: 1.4 }}>
          same number, same matches, same chaos.
        </div>

        {/* tab switch */}
        <div style={{ marginTop: 22, display: 'flex', gap: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 14, padding: 4, position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 4, bottom: 4,
            left: tab === 'phone' ? 4 : '50%',
            right: tab === 'phone' ? '50%' : 4,
            background: '#fff', borderRadius: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            transition: 'left 180ms cubic-bezier(.3,.7,.4,1), right 180ms cubic-bezier(.3,.7,.4,1)',
          }} />
          {[['phone', 'phone'], ['email', 'email + password']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: '10px 0', background: 'transparent', border: 0,
              position: 'relative', zIndex: 1, cursor: 'pointer',
              font: 'inherit', fontWeight: 600, fontSize: 13.5,
              color: tab === id ? 'var(--ink)' : 'var(--ink-3)',
            }}>{label}</button>
          ))}
        </div>

        {tab === 'phone' ? (
          <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
            <div className="input" style={{ width: 90, display: 'flex', alignItems: 'center', gap: 6, padding: '16px 14px' }}>
              <span style={{ fontSize: 20 }}>🇺🇸</span>
              <span style={{ fontWeight: 600 }}>+1</span>
              <Icon name="chevronDown" size={14} color="var(--ink-3)" />
            </div>
            <input className="input" inputMode="numeric" placeholder="(555) 010 — 4242" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ flex: 1 }} />
          </div>
        ) : (
          <>
            <div style={{ marginTop: 18 }}>
              <input className="input" type="email" placeholder="you@somewhere.com" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" />
            </div>
            <div style={{ marginTop: 10 }}>
              <input className="input" type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button style={{ alignSelf: 'flex-end', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--coral)', fontWeight: 600, fontSize: 13, padding: '8px 4px', marginTop: 4 }}>
              forgot password?
            </button>
          </>
        )}

        <div style={{ flex: 1 }} />

        <button className="btn coral full lg" disabled={!canSubmit} onClick={() => go(tab === 'phone' ? 'otp' : 'main')} style={{ opacity: canSubmit ? 1 : 0.4 }}>
          {tab === 'phone' ? 'send code' : 'log in'}
        </button>
        <button className="btn ghost full" style={{ marginTop: 4, fontSize: 14 }} onClick={() => go('splash')}>
          new here? <b style={{ color: 'var(--coral)', marginLeft: 4 }}>create account</b>
        </button>
        <div style={{ marginTop: 14, marginBottom: 24, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.45 }}>
          by logging in you agree to our terms & privacy.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenEmailPass, ScreenLogin });
