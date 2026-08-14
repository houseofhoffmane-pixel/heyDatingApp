// screens-onboarding.jsx — Splash, Phone, OTP, Name, Gender, LookingFor, Bio, Prompts, Photo, Verify

// ─────────────────────────────────────────────────────────────
// Splash — minimal animated logo screen. Letters fall in, dot pops,
// gentle ambient float after. Tap anywhere to advance.
// ─────────────────────────────────────────────────────────────
function ScreenSplash({ go }) {
  const letters = ['h', 'e', 'y'];
  return (
    <div onClick={() => go('phone')} className="screen" style={{
      background: 'radial-gradient(120% 80% at 50% 40%, var(--peach), var(--bg) 70%)',
      cursor: 'pointer',
      overflow: 'hidden',
    }}>
      {/* floating coral orbs in the background */}
      <div style={{
        position: 'absolute', top: '20%', left: '10%',
        width: 120, height: 120, borderRadius: '50%',
        background: 'var(--coral-soft)', opacity: 0.6,
        filter: 'blur(30px)',
        animation: 'orb-drift 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '10%',
        width: 140, height: 140, borderRadius: '50%',
        background: 'var(--mint)', opacity: 0.5,
        filter: 'blur(40px)',
        animation: 'orb-drift 10s ease-in-out 1.5s infinite reverse',
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, animation: 'logo-idle 5s ease-in-out 1.4s infinite' }}>
          {letters.map((ch, i) => (
            <span key={i} style={{
              display: 'inline-block',
              fontFamily: 'var(--display)', fontWeight: 800,
              fontSize: 132, letterSpacing: '-0.06em',
              lineHeight: 0.85, color: 'var(--ink)',
              opacity: 0,
              animation: `letter-drop 700ms cubic-bezier(.34,1.56,.64,1) ${120 + i * 110}ms forwards`,
            }}>{ch}</span>
          ))}
          <span style={{
            width: 22, height: 22, borderRadius: 999,
            background: 'var(--coral)',
            transform: 'translateY(-12px) scale(0)',
            boxShadow: '0 6px 20px rgba(255,90,95,0.4)',
            animation: 'dot-pop 600ms cubic-bezier(.34,1.56,.64,1) 580ms forwards, dot-pulse 2.4s ease-in-out 1.4s infinite',
            display: 'inline-block',
          }} />
        </div>

        {/* tagline fades in last */}
        <div style={{
          marginTop: 28, fontSize: 14, color: 'var(--ink-2)',
          opacity: 0,
          animation: 'fade-up 600ms cubic-bezier(.2,.7,.3,1) 900ms forwards',
        }}>
          say hey to people nearby.
        </div>
      </div>

      <div style={{
        paddingBottom: 60, textAlign: 'center',
        fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)',
        letterSpacing: 0.16, textTransform: 'uppercase',
        opacity: 0,
        animation: 'fade-blink 2.2s ease-in-out 1400ms infinite',
      }}>
        tap anywhere
      </div>

      <style>{`
        @keyframes letter-drop {
          0%   { opacity: 0; transform: translateY(-40px) scale(0.7); }
          60%  { opacity: 1; transform: translateY(8px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dot-pop {
          0%   { transform: translateY(-12px) scale(0); }
          70%  { transform: translateY(-12px) scale(1.3); }
          100% { transform: translateY(-12px) scale(1); }
        }
        @keyframes dot-pulse {
          0%, 100% { box-shadow: 0 6px 20px rgba(255,90,95,0.4), 0 0 0 0 rgba(255,90,95,0.5); }
          50%      { box-shadow: 0 6px 20px rgba(255,90,95,0.4), 0 0 0 10px rgba(255,90,95,0); }
        }
        @keyframes logo-idle {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes fade-up {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-blink {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 1; }
        }
        @keyframes orb-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(20px, -30px) scale(1.15); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Phone number entry — with country code picker
// ─────────────────────────────────────────────────────────────
function ScreenPhone({ go, phone, setPhone }) {
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
  const [country, setCountry] = React.useState(COUNTRIES[0]);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const digitsEntered = (phone.match(/\d/g) || []).length;
  const valid = digitsEntered === country.digits;
  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={() => go('splash')} title="" right={<div className="dots"><i className="on"/><i/><i/><i/><i/></div>} />
      <div style={{ padding: '12px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="eyebrow">step 1 of 5</div>
        <div className="h-display h-2" style={{ marginTop: 8 }}>what's your number?</div>
        <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14.5, lineHeight: 1.4 }}>
          we'll text you a code. no random calls. we promise.
        </div>

        <div style={{ marginTop: 28, display: 'flex', gap: 8 }}>
          <button onClick={() => setPickerOpen(true)} className="input" style={{ width: 96, display: 'flex', alignItems: 'center', gap: 5, padding: '16px 12px', cursor: 'pointer', background: 'var(--card)' }}>
            <span style={{ fontSize: 20 }}>{country.flag}</span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{country.code}</span>
            <Icon name="chevronDown" size={14} color="var(--ink-3)" />
          </button>
          <input
            className="input"
            inputMode="numeric"
            placeholder="(555) 010 — 4242"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ flex: 1, letterSpacing: '0.02em' }}
          />
        </div>

        <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 11, color: valid ? 'var(--mint-deep)' : 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {valid ? <><Icon name="check" size={12} color="var(--mint-deep)" /> looks good</> : `${digitsEntered}/${country.digits} digits`}
        </div>

        <div style={{ flex: 1 }} />
        <button className="btn coral full lg" disabled={!valid} onClick={() => go('otp')} style={{ opacity: valid ? 1 : 0.4 }}>
          send code
        </button>
      </div>

      {/* Country picker sheet */}
      {pickerOpen && (
        <>
          <div onClick={() => setPickerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90, animation: 'float-up 200ms both' }} />
          <div className="float-up" style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 91, maxHeight: '70%',
            background: 'var(--bg)', borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: '14px 18px 24px', boxShadow: '0 -20px 60px rgba(0,0,0,0.2)',
            overflowY: 'auto',
          }}>
            <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--line-2)', margin: '0 auto 14px' }} />
            <div className="h-display" style={{ fontSize: 20, letterSpacing: '-0.025em', marginBottom: 12 }}>pick your country</div>
            <div className="card" style={{ padding: 0 }}>
              {COUNTRIES.map((c, i) => {
                const on = c.name === country.name;
                return (
                  <div key={c.name} onClick={() => { setCountry(c); setPickerOpen(false); }} style={{
                    padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: i === COUNTRIES.length - 1 ? 'none' : '1px solid var(--line)',
                    cursor: 'pointer', background: on ? 'var(--bg-2)' : 'transparent',
                  }}>
                    <span style={{ fontSize: 22 }}>{c.flag}</span>
                    <div style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{c.name}</div>
                    <div className="meta" style={{ fontSize: 13 }}>{c.code}</div>
                    {on && <Icon name="check" size={16} color="var(--coral)" />}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// OTP — 6 digit code, numeric keyboard mock. Error state when wrong.
// Code "111111" rejects on the 6th key to demo the wrong-code flow.
// ─────────────────────────────────────────────────────────────
function ScreenOtp({ go, otp, setOtp, otpError, setOtpError }) {
  const press = (d) => {
    if (d === 'del') { setOtp(otp.slice(0, -1)); setOtpError(false); return; }
    if (otp.length >= 6) return;
    const next = otp + d;
    setOtp(next);
    if (next.length === 6) {
      // dumb verifier — "111111" is the canonical wrong code in the prototype
      if (next === '111111') {
        setTimeout(() => { setOtpError(true); setOtp(''); }, 350);
      } else {
        setTimeout(() => { setOtpError(false); go('name'); }, 350);
      }
    }
  };
  const digits = Array.from({ length: 6 }, (_, i) => otp[i] || '');
  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={() => go('phone')} title="" right={<div className="dots"><i className="on"/><i className="on"/><i/><i/><i/></div>} />
      <div style={{ padding: '12px 24px 16px' }}>
        <div className="eyebrow">step 2 of 5</div>
        <div className="h-display h-2" style={{ marginTop: 8 }}>{otpError ? 'wrong code.' : 'check your texts.'}</div>
        <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14.5, lineHeight: 1.4 }}>
          {otpError ? (
            <>that one didn't match. last digit was off — try again.</>
          ) : (
            <>we sent a 6-digit code to <b style={{ color: 'var(--ink)' }}>(555) 010-4242</b>.</>
          )}
        </div>

        <div style={{
          display: 'flex', gap: 8, marginTop: 28, justifyContent: 'center',
          animation: otpError ? 'shake 360ms cubic-bezier(.36,.07,.19,.97)' : 'none',
        }}>
          {digits.map((d, i) => (
            <div key={i} style={{
              flex: 1, height: 64, borderRadius: 14,
              border: '1.5px solid ' + (otpError ? 'var(--coral)' : (otp.length === i ? 'var(--ink)' : 'var(--line-2)')),
              background: otpError ? 'var(--coral-soft)' : 'var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--display)', fontWeight: 600, fontSize: 28,
              color: otpError ? 'var(--coral-deep)' : 'var(--ink)',
            }}>{d}</div>
          ))}
        </div>
        <style>{`@keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-6px); }
          40%, 60% { transform: translateX(6px); }
        }`}</style>

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
          {otpError ? (
            <>too many tries? <span style={{ color: 'var(--coral)', fontWeight: 600 }}>get a new code →</span></>
          ) : (
            <>didn't get it? <span style={{ color: 'var(--coral)', fontWeight: 600 }}>resend in 0:24</span></>
          )}
        </div>

        {otpError && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 14, background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--peach)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="info" size={14} />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              still stuck? text takes up to 60s on slow networks. or try a fresh code.
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* mini numeric keypad */}
      <div style={{ padding: '0 16px 14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {['1','2','3','4','5','6','7','8','9','','0','del'].map((k, i) => (
          k === '' ? <div key={i} /> : (
            <button key={i} onClick={() => press(k)} style={{
              padding: '16px 0', borderRadius: 14, border: 0,
              background: k === 'del' ? 'transparent' : 'var(--card)',
              fontFamily: 'var(--body)', fontWeight: 500, fontSize: 22,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: k === 'del' ? 'none' : '0 1px 0 rgba(0,0,0,0.04)',
            }}>{k === 'del' ? <Icon name="back" size={20}/> : k}</button>
          )
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Name + birthday
// ─────────────────────────────────────────────────────────────
function ScreenName({ go, name, setName, dob, setDob }) {
  const [mm, setMm] = React.useState('');
  const [dd, setDd] = React.useState('');
  const [yyyy, setYyyy] = React.useState('');
  const [confirm18, setConfirm18] = React.useState(false);

  // compute age from entered birthday
  const computeAge = () => {
    const m = +mm, d = +dd, y = +yyyy;
    if (!m || !d || !y || String(yyyy).length !== 4 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const today = new Date(2026, 4, 29);
    const bday = new Date(y, m - 1, d);
    if (isNaN(bday.getTime())) return null;
    let age = today.getFullYear() - bday.getFullYear();
    const mo = today.getMonth() - bday.getMonth();
    if (mo < 0 || (mo === 0 && today.getDate() < bday.getDate())) age--;
    return age;
  };
  const age = computeAge();
  const isOldEnough = age !== null && age >= 18;
  const tooYoung = age !== null && age < 18;
  const valid = !!name.trim() && isOldEnough && confirm18;

  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={() => go('otp')} title="" right={
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 0.06, color: 'var(--ink-3)' }}>1 / 15</div>
      } />
      <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', margin: '4px 18px 12px', borderRadius: 999 }}>
        <div style={{ width: '7%', height: '100%', background: 'var(--coral)', borderRadius: 999 }} />
      </div>
      <div className="screen-scroll" style={{ padding: '4px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="eyebrow">step 1</div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 6px', borderRadius: 999, background: 'var(--coral)', color: '#fff', letterSpacing: 0.06 }}>REQUIRED</span>
        </div>
        <div className="h-display h-2" style={{ marginTop: 8 }}>okay, the basics.</div>
        <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14.5, lineHeight: 1.4 }}>
          this is what people will see. age is locked once you set it — don't lie.
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>first name</div>
          <input className="input" placeholder="Ada" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>birthday</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="MM" inputMode="numeric" maxLength={2} style={{ flex: 1, textAlign: 'center', borderColor: tooYoung ? 'var(--coral)' : undefined }} value={mm} onChange={(e) => setMm(e.target.value.replace(/\D/g, ''))} />
            <input className="input" placeholder="DD" inputMode="numeric" maxLength={2} style={{ flex: 1, textAlign: 'center', borderColor: tooYoung ? 'var(--coral)' : undefined }} value={dd} onChange={(e) => { setDd(e.target.value.replace(/\D/g, '')); setDob(e.target.value); }} />
            <input className="input" placeholder="YYYY" inputMode="numeric" maxLength={4} style={{ flex: 1.5, textAlign: 'center', borderColor: tooYoung ? 'var(--coral)' : undefined }} value={yyyy} onChange={(e) => setYyyy(e.target.value.replace(/\D/g, ''))} />
          </div>
          {tooYoung ? (
            <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--coral)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="info" size={13} color="var(--coral)" /> you must be 18 or older to use hey.
            </div>
          ) : isOldEnough ? (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>you're {age}. only your age shows on your profile.</div>
          ) : (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>only your age shows on your profile.</div>
          )}
        </div>

        {/* mandatory 18+ confirm — moved here from phone screen */}
        <button onClick={() => setConfirm18(!confirm18)} style={{
          marginTop: 18, display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', padding: 0,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
            border: '2px solid ' + (confirm18 ? 'var(--ink)' : 'var(--line-2)'),
            background: confirm18 ? 'var(--ink)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {confirm18 && <Icon name="check" size={13} color="#fff" />}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
            it's giving Friday night energy and <b style={{ color: 'var(--ink)' }}>i confirm i'm 18+</b><sup style={{ color: 'var(--coral)', fontWeight: 700 }}>*</sup>
          </div>
        </button>

        <div style={{ flex: 1, minHeight: 20 }} />
        <button className="btn coral full lg" onClick={() => go('gender')} disabled={!valid} style={{ opacity: valid ? 1 : 0.4 }}>continue</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bio — final freeform — mandatory
// ─────────────────────────────────────────────────────────────
function ScreenBio({ go, bio, setBio }) {
  const max = 180;
  const remain = max - bio.length;
  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={() => go('prompts')} title="" right={
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 0.06, color: 'var(--ink-3)' }}>12 / 15</div>
      } />
      <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', margin: '4px 18px 12px', borderRadius: 999 }}>
        <div style={{ width: '80%', height: '100%', background: 'var(--coral)', borderRadius: 999 }} />
      </div>
      <div className="screen-scroll" style={{ padding: '4px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="eyebrow">step 12</div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 6px', borderRadius: 999, background: 'var(--coral)', color: '#fff', letterSpacing: 0.06 }}>REQUIRED</span>
        </div>
        <div className="h-display h-2" style={{ marginTop: 8 }}>a tiny bio.</div>
        <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14.5, lineHeight: 1.4 }}>
          three sentences max. tell us something true, not impressive.
        </div>

        <div style={{ marginTop: 22, position: 'relative' }}>
          <textarea
            className="input"
            placeholder="i make decent pasta, i'm bad at parallel parking, ask me about my hot takes on early 2000s rom-coms."
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, max))}
            style={{ minHeight: 130, resize: 'none', fontFamily: 'var(--body)', lineHeight: 1.45 }}
          />
          <div style={{ position: 'absolute', right: 12, bottom: 10, fontFamily: 'var(--mono)', fontSize: 11, color: remain < 20 ? 'var(--coral)' : 'var(--ink-3)' }}>
            {remain}
          </div>
        </div>
        <div style={{ height: 80 }} />
      </div>
      <div style={{ padding: '8px 16px 14px', background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
        <button className="btn coral full lg" onClick={() => go('photo')} disabled={bio.length < 8} style={{ opacity: bio.length >= 8 ? 1 : 0.4 }}>
          continue
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Photo upload — slots + drag-and-drop affordance
// ─────────────────────────────────────────────────────────────
function ScreenPhoto({ go, photos, setPhotos }) {
  const slots = Array.from({ length: 6 }, (_, i) => photos[i]);
  const fill = (i) => {
    const next = [...photos];
    next[i] = true;
    setPhotos(next);
  };
  const filledCount = photos.filter(Boolean).length;
  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={() => go('bio')} title="" />
      <div className="screen-scroll" style={{ padding: '4px 24px 24px' }}>
        <div className="eyebrow">photos · {filledCount}/6</div>
        <div className="h-display h-2" style={{ marginTop: 8 }}>show up.</div>
        <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14.5, lineHeight: 1.4 }}>
          add at least 2. tap to upload. drag to reorder. first one is your main.
        </div>

        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {slots.map((on, i) => (
            <button key={i} onClick={() => fill(i)} style={{
              aspectRatio: '3/4', border: 0, padding: 0, cursor: 'pointer',
              borderRadius: 14, position: 'relative', overflow: 'hidden',
              background: on ? 'transparent' : 'var(--bg-2)',
              outline: i === 0 ? '2px solid var(--coral)' : 'none',
              outlineOffset: i === 0 ? -2 : 0,
            }}>
              {on ? (
                <Photo name={String.fromCharCode(65 + i)} label="" />
              ) : (
                <div style={{
                  position: 'absolute', inset: 0,
                  border: '2px dashed var(--line-2)',
                  borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 4,
                  color: 'var(--ink-3)',
                }}>
                  <Icon name="plus" size={20} />
                  {i === 0 && <span style={{ fontSize: 10, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 0.08 }}>main</span>}
                </div>
              )}
              {on && i === 0 && (
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  background: 'var(--coral)', color: '#fff',
                  fontFamily: 'var(--mono)', fontSize: 9,
                  padding: '3px 7px', borderRadius: 999, letterSpacing: 0.08,
                }}>MAIN</div>
              )}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 22, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 18, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="info" size={18} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
            <b style={{ color: 'var(--ink)' }}>no group photos as your main.</b><br />
            we want to know which one is you.
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 16px 14px', background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
        <button className="btn coral full lg" onClick={() => go('email-pass')} disabled={filledCount < 2} style={{ opacity: filledCount >= 2 ? 1 : 0.4 }}>
          continue
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Verification — take a selfie matching a pose
// ─────────────────────────────────────────────────────────────
function ScreenVerify({ go, verifyState, setVerifyState }) {
  if (verifyState === 'pending') {
    return (
      <div className="screen" style={{ background: 'var(--bg)' }}>
        <div className="status-pad" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center' }}>
          <div className="pop-in" style={{ width: 100, height: 100, borderRadius: 30, background: 'var(--butter)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
            <Icon name="clock" size={48} />
          </div>
          <div className="h-display h-2" style={{ letterSpacing: '-0.03em' }}>checking it out.</div>
          <div style={{ color: 'var(--ink-2)', marginTop: 10, fontSize: 15, lineHeight: 1.45, maxWidth: 280 }}>
            a real human (hi 👋) is verifying your selfie. takes a few minutes.
          </div>
          <div style={{ marginTop: 24, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: 0.08 }}>
            USUALLY UNDER 5 MIN
          </div>
        </div>
      </div>
    );
  }
  if (verifyState === 'done') {
    return (
      <div className="screen" style={{ background: 'radial-gradient(80% 60% at 50% 30%, var(--mint), var(--bg))' }}>
        <div className="status-pad" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center' }}>
          <div className="pop-in" style={{ width: 120, height: 120, borderRadius: 30, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, position: 'relative' }}>
            <Icon name="badgeCheck" size={64} color="var(--coral)" />
          </div>
          <div className="h-display h-2">you're verified.</div>
          <div style={{ color: 'var(--ink-2)', marginTop: 10, fontSize: 15, lineHeight: 1.45, maxWidth: 280 }}>
            you'll get a little ✓ next to your name. it's a flex, use it wisely.
          </div>
          <button className="btn coral lg full" style={{ marginTop: 32, maxWidth: 280 }} onClick={() => go('main')}>let's go</button>
        </div>
      </div>
    );
  }
  if (verifyState === 'rejected') {
    return (
      <div className="screen" style={{ background: 'radial-gradient(80% 60% at 50% 30%, var(--peach), var(--bg))' }}>
        <div className="status-pad" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center' }}>
          <div className="pop-in" style={{ width: 100, height: 100, borderRadius: 30, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, position: 'relative', border: '2px solid var(--coral)' }}>
            <Icon name="x" size={42} color="var(--coral)" strokeWidth={2.2} />
          </div>
          <div className="h-display h-2" style={{ letterSpacing: '-0.03em' }}>didn't pass. yet.</div>
          <div style={{ color: 'var(--ink-2)', marginTop: 10, fontSize: 15, lineHeight: 1.45, maxWidth: 300 }}>
            our reviewer couldn't match your selfie to your photos. don't take it personally — try again with better lighting.
          </div>

          {/* what went wrong checklist */}
          <div style={{ marginTop: 22, width: '100%', maxWidth: 300, background: 'var(--card)', borderRadius: 18, padding: 16, textAlign: 'left' }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>likely reasons</div>
            {[
              'face was partly out of frame',
              'lighting was too dim',
              "didn't do the requested pose",
            ].map(r => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13.5 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--peach)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="x" size={12} color="var(--coral-deep)" />
                </div>
                <span style={{ color: 'var(--ink-2)' }}>{r}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 300 }}>
            <button className="btn coral lg full" onClick={() => setVerifyState('initial')}>try again</button>
          </div>

          <div style={{ marginTop: 18, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: 0.08 }}>
            ATTEMPT 1 OF 3 · UNVERIFIED PROFILES GET FEWER MATCHES
          </div>
        </div>
      </div>
    );
  }

  // initial — capture selfie
  return (
    <div className="screen" style={{ background: '#0F0E0C' }}>
      <div className="status-pad" />
      <div style={{ padding: '8px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => go('photo')} style={{ width: 38, height: 38, borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icon name="x" size={18} color="#fff" />
        </button>
        <div style={{ color: '#fff', fontWeight: 600 }}>verify it's you</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {/* fake camera viewfinder */}
        <div style={{
          width: '88%', aspectRatio: '3/4', borderRadius: 28, position: 'relative',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          border: '2px dashed rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '70%', aspectRatio: '1',
            borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 0.08,
          }}>
            POSITION FACE
          </div>

          {/* pose hint */}
          <div style={{
            position: 'absolute', top: 16, left: 16, right: 16,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px)',
            borderRadius: 14, padding: '12px 14px',
            color: '#fff', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              ✌️
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.35 }}>
              <div style={{ fontWeight: 700 }}>do the pose →</div>
              <div style={{ opacity: 0.7 }}>peace sign, both hands visible</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'var(--mono)', letterSpacing: 0.08 }}>NEVER SHARED · USED ONCE</div>
        <button onClick={() => setVerifyState('pending')} style={{
          width: 76, height: 76, borderRadius: 999,
          background: 'transparent',
          border: '4px solid rgba(255,255,255,0.85)',
          padding: 5,
          cursor: 'pointer',
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 999, background: '#fff' }} />
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenSplash, ScreenPhone, ScreenOtp, ScreenName, ScreenBio, ScreenPhoto, ScreenVerify,
});
