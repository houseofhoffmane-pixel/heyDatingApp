// screens-states.jsx — Loading, offline, edge cases.
// Skeletons / out-of-radius / pause-profile / rejected verify / wrong OTP.

// ─────────────────────────────────────────────────────────────
// DiscoverSkeleton — shimmer loader for the swipe feed
// ─────────────────────────────────────────────────────────────
function ScreenDiscoverSkeleton() {
  return (
    <>
      <div className="status-pad" />
      <div style={{ padding: '4px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Shimmer w={140} h={30} r={8} />
          <div style={{ marginTop: 6 }}><Shimmer w={170} h={11} r={4} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Shimmer w={42} h={42} r={999} />
          <Shimmer w={42} h={42} r={999} />
        </div>
      </div>
      <div style={{ padding: '4px 20px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', height: 460, marginBottom: 14 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden', background: 'var(--card)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
            <Shimmer w="100%" h="100%" r={0} />
            <div style={{ position: 'absolute', top: 14, left: 14 }}>
              <Shimmer w={130} h={28} r={999} />
            </div>
            <div style={{ position: 'absolute', top: 14, right: 14 }}>
              <Shimmer w={56} h={24} r={999} />
            </div>
            <div style={{ position: 'absolute', bottom: 18, left: 18, right: 18 }}>
              <Shimmer w={200} h={32} r={8} />
              <div style={{ marginTop: 6 }}><Shimmer w={280} h={12} r={4} /></div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 12 }}>
          {[54, 48, 62, 48, 54].map((s, i) => (
            <div key={i} style={{ width: s, height: s, borderRadius: 999, background: 'rgba(0,0,0,0.06)' }} />
          ))}
        </div>
      </div>
    </>
  );
}

function Shimmer({ w, h, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(110deg, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.09) 50%, rgba(0,0,0,0.05) 70%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.6s linear infinite',
    }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ScreenOutOfRadius — no profiles in current radius
// Expand button bumps the radius, briefly shows a loading flash, then returns
// to the live discover feed. Communicates "we're searching wider now."
// ─────────────────────────────────────────────────────────────
function ScreenOutOfRadius({ goDiscover, openPlaces }) {
  const [radius, setRadius] = React.useState(8);
  const [loading, setLoading] = React.useState(false);
  const expand = () => {
    setRadius(25);
    setLoading(true);
    setTimeout(() => { setLoading(false); goDiscover(); }, 1100);
  };
  if (loading) {
    return (
      <>
        <div className="status-pad" />
        <TopBar title="discover" sub={`expanding to ${radius} mi · loading…`} />
        <ScreenDiscoverSkeletonBody />
      </>
    );
  }
  return (
    <>
      <div className="status-pad" />
      <TopBar title="discover" sub={`0 nearby · radius ${radius} mi`} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 200, height: 200, marginBottom: 20 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 200, height: 200, marginTop: -100, marginLeft: -100,
              borderRadius: '50%', border: '2px solid rgba(255,90,95,0.25)',
              animation: `radius-pulse 2.6s ${i * 0.5}s ease-out infinite`,
              opacity: 0,
            }} />
          ))}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 70, height: 70, borderRadius: '50%', background: 'var(--coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(255,90,95,0.4)' }}>
            <Icon name="pinFill" size={30} color="#fff" />
          </div>
          <style>{`
            @keyframes radius-pulse {
              0% { transform: scale(0.3); opacity: 0.8; }
              100% { transform: scale(1.15); opacity: 0; }
            }
          `}</style>
        </div>
        <div className="h-display h-3" style={{ letterSpacing: '-0.025em' }}>nobody in your radius rn.</div>
        <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14.5, lineHeight: 1.5, maxWidth: 280 }}>
          you might be in a quiet part of town. expand the search or try Places — events bring people in.
        </div>
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 300 }}>
          <button className="btn coral lg full" onClick={expand}>expand to 25 mi</button>
          <button className="btn soft full" onClick={openPlaces}>
            <Icon name="pinFill" size={14} /> open Places
          </button>
        </div>
      </div>
    </>
  );
}

// Re-usable skeleton without the topbar — for transient loading after radius bump
function ScreenDiscoverSkeletonBody() {
  return (
    <div style={{ padding: '4px 20px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: 460, marginBottom: 14 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden', background: 'var(--card)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          <Shimmer w="100%" h="100%" r={0} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ScreenPause — pause/hide my profile flow
// ─────────────────────────────────────────────────────────────
function ScreenPause({ onClose }) {
  const [mode, setMode] = React.useState('active'); // active | paused | hidden
  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={onClose} title="pause profile" />
      <div className="screen-scroll" style={{ padding: '12px 18px 24px' }}>
        <div className="eyebrow">your status</div>
        <div className="h-display h-3" style={{ marginTop: 6, letterSpacing: '-0.025em' }}>
          {mode === 'active' && 'you\'re live.'}
          {mode === 'paused' && 'you\'re paused.'}
          {mode === 'hidden' && 'you\'re hidden.'}
        </div>
        <div style={{ color: 'var(--ink-2)', marginTop: 6, fontSize: 14, lineHeight: 1.45 }}>
          {mode === 'active' && 'people can see you, like you, and match with you. you can still browse.'}
          {mode === 'paused' && 'nobody new sees your profile. existing matches & chats keep working. turn back on anytime.'}
          {mode === 'hidden' && 'you\'re invisible. nobody can see or message you. your matches stay safe — they\'ll see "user paused" until you\'re back.'}
        </div>

        <div className="card" style={{ marginTop: 22, padding: 0 }}>
          <ModeRow
            label="active"
            sub="visible to everyone in your filters"
            on={mode === 'active'}
            onClick={() => setMode('active')}
            tone="mint"
            icon="bolt"
          />
          <ModeRow
            label="paused"
            sub="invisible to new people · keep chatting"
            on={mode === 'paused'}
            onClick={() => setMode('paused')}
            tone="butter"
            icon="clock"
          />
          <ModeRow
            label="hidden · ghost mode"
            sub="invisible everywhere, even to matches"
            on={mode === 'hidden'}
            onClick={() => setMode('hidden')}
            tone="lilac"
            icon="eye"
            last
          />
        </div>

        {mode !== 'active' && (
          <div style={{ marginTop: 18, padding: 14, background: 'var(--peach)', borderRadius: 18, display: 'flex', gap: 12 }}>
            <Icon name="info" size={20} />
            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
              when paused, you stop showing up in Places too. nobody at <b>Parchm Coffee</b> can see you've checked in.
            </div>
          </div>
        )}

        <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>auto-resume</div>
        <div className="card" style={{ padding: 0 }}>
          <PauseTimerRow label="never" />
          <PauseTimerRow label="in 24 hours" />
          <PauseTimerRow label="in a week" on />
          <PauseTimerRow label="in a month" last />
        </div>

        <div style={{ marginTop: 26, textAlign: 'center' }}>
          <button className="btn ghost" style={{ color: 'var(--coral)', fontSize: 14 }}>delete my account</button>
        </div>
      </div>
    </div>
  );
}

function ModeRow({ label, sub, on, onClick, tone, icon, last }) {
  return (
    <div onClick={onClick} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: last ? 'none' : '1px solid var(--line)', cursor: 'pointer', background: on ? `var(--${tone})` : 'transparent' }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: on ? '#fff' : `var(--${tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{label}</div>
        <div className="meta" style={{ fontSize: 11.5, marginTop: 1 }}>{sub}</div>
      </div>
      <div style={{ width: 22, height: 22, borderRadius: 999, border: '2px solid ' + (on ? 'var(--ink)' : 'var(--line-2)'), background: on ? 'var(--ink)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {on && <i style={{ width: 8, height: 8, borderRadius: 999, background: '#fff' }} />}
      </div>
    </div>
  );
}

function PauseTimerRow({ label, on, last }) {
  return (
    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', borderBottom: last ? 'none' : '1px solid var(--line)', cursor: 'pointer' }}>
      <div style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{label}</div>
      <div style={{ width: 20, height: 20, borderRadius: 999, border: '2px solid ' + (on ? 'var(--coral)' : 'var(--line-2)'), background: on ? 'var(--coral)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {on && <Icon name="check" size={12} color="#fff" />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Offline banner — top-of-app indicator
// ─────────────────────────────────────────────────────────────
function ScreenOffline({ onRetry }) {
  return (
    <>
      <div className="status-pad" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
        <div style={{ width: 96, height: 96, borderRadius: 28, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, position: 'relative' }}>
          {/* X over a wifi-like icon */}
          <svg width="44" height="44" viewBox="0 0 24 24">
            <path d="M2 8c6-5 14-5 20 0M5 12c4-3 10-3 14 0M9 16c1.6-1 3.4-1 5 0" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M3 3l18 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="19" r="1.4" fill="#fff" />
          </svg>
        </div>
        <div className="h-display h-3" style={{ letterSpacing: '-0.025em' }}>no signal.</div>
        <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14.5, lineHeight: 1.5, maxWidth: 280 }}>
          we'll keep your spot. messages will retry the moment you're back.
        </div>
        <button className="btn coral lg" style={{ marginTop: 22, padding: '14px 28px' }} onClick={onRetry}>
          <Icon name="refresh" size={14} color="#fff" /> try again
        </button>

        <div style={{ marginTop: 28, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: 0.06, textAlign: 'center', lineHeight: 1.5 }}>
          QUEUED · 2 MESSAGES<br />LAST ONLINE · 4 MIN AGO
        </div>
      </div>
    </>
  );
}

Object.assign(window, {
  ScreenDiscoverSkeleton, ScreenOutOfRadius, ScreenPause, ScreenOffline, Shimmer,
});
