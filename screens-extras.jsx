// screens-extras.jsx — Empty states, likes-you, notifications, error states

// ─────────────────────────────────────────────────────────────
// Empty state — out of profiles for today
// ─────────────────────────────────────────────────────────────
function ScreenEmptyDiscover({ goPlaces, openFilters }) {
  return (
    <>
      <div className="status-pad" />
      <TopBar title="discover" sub="that's a wrap for now" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center' }}>
        <div style={{ width: 96, height: 96, borderRadius: 28, background: 'var(--peach)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <Icon name="sparkle" size={42} />
        </div>
        <div className="h-display h-3" style={{ letterSpacing: '-0.025em' }}>you've seen everyone.</div>
        <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14.5, lineHeight: 1.5, maxWidth: 280 }}>
          touch grass for an hour. or, check out who's hanging at <b>Attaboy</b> rn — 23 people are there.
        </div>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 300 }}>
          <button className="btn coral lg full" onClick={goPlaces}>
            <Icon name="pinFill" size={16} color="#fff" /> open Places
          </button>
          <button className="btn soft full" onClick={openFilters}>expand my filters</button>
        </div>

        <div style={{ marginTop: 28, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: 0.06 }}>
          NEW PROFILES REFRESH AT 7 PM
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state — no matches yet
// ─────────────────────────────────────────────────────────────
function ScreenEmptyChats({ goDiscover }) {
  return (
    <>
      <div className="status-pad" />
      <TopBar title="chats" sub="0 matches · 0 unread" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center' }}>
        <div style={{ position: 'relative', marginBottom: 26 }}>
          <div style={{ width: 84, height: 84, borderRadius: 999, background: 'var(--rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-8deg)' }}>
            <Icon name="chat" size={36} />
          </div>
          <div style={{ position: 'absolute', top: -8, right: -14, width: 38, height: 38, borderRadius: 999, background: 'var(--butter)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(12deg)' }}>
            <Icon name="heartFill" size={16} color="var(--coral)" />
          </div>
        </div>
        <div className="h-display h-3" style={{ letterSpacing: '-0.025em' }}>nothing yet. that's okay.</div>
        <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14.5, lineHeight: 1.5, maxWidth: 280 }}>
          your chats land here when you both say hey. low-stakes promise.
        </div>
        <button className="btn coral lg" style={{ marginTop: 22, padding: '14px 28px' }} onClick={goDiscover}>
          start discovering
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// "Likes you" — everyone who liked you, no paywall (free for now)
// ─────────────────────────────────────────────────────────────
function ScreenLikesYou({ onClose, openProfile }) {
  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      <div className="status-pad" />
      <SheetHead onBack={onClose} title="likes you · 4" />

      <div className="screen-scroll" style={{ padding: '0 16px 24px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 14, lineHeight: 1.4 }}>
          these people already said hey. tap to see who & what they liked — then like back to match.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {PEOPLE.slice(0, 4).map((p, i) => {
            const isPhotoLike = i % 2 === 0;
            const comment = ['"okay the matcha thing"', null, '"the bar in your bio…"', '"this energy fr"'][i];
            return (
              <div key={p.id} onClick={() => openProfile && openProfile(p.id)} style={{ position: 'relative', aspectRatio: '3/4.4', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', background: 'var(--card)', border: '1px solid var(--line)' }}>
                <div style={{ position: 'absolute', inset: 0 }}>
                  <Photo name={p.name + i} label="" />
                </div>
                {/* small ♥ pin showing what they liked */}
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
                  borderRadius: 999, padding: '4px 8px 4px 6px',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600,
                }}>
                  <Icon name="heartFill" size={11} color="var(--coral)" />
                  {isPhotoLike ? 'liked photo' : 'liked prompt'}
                </div>
                {i === 0 && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--coral)', color: '#fff', borderRadius: 999, padding: '3px 7px', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: 0.06 }}>NEW</div>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '36px 12px 10px',
                  background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7))',
                  color: '#fff',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.005em' }}>{p.name}, {p.age}</div>
                  {comment ? (
                    <div style={{ fontSize: 11, opacity: 0.92, marginTop: 3, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {comment}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, opacity: 0.75, marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Icon name="pin" size={10} color="#fff" /> {p.place.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 22, padding: 16, background: 'var(--mint)', borderRadius: 18, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="sparkle" size={18} />
          </div>
          <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
            <b>more shows up the more you interact.</b> like specific photos & prompts — it makes their pile better too.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Notifications screen
// ─────────────────────────────────────────────────────────────
function ScreenNotifs({ onClose }) {
  const items = [
    { kind: 'match', who: 'Simone', what: 'matched with you', when: '2m', tone: 'rose' },
    { kind: 'like', who: 'Arjun', what: 'liked your prompt — "i\'ll fall for you if"', when: '14m', tone: 'peach' },
    { kind: 'view', who: 'someone', what: 'viewed you near Attaboy', when: '1h', tone: 'lilac' },
    { kind: 'place', who: 'Parchm Coffee', what: 'is busy rn — 12 people here', when: '2h', tone: 'mint' },
    { kind: 'reminder', who: '👋 hey', what: 'you have 4 likes waiting', when: 'yesterday', tone: 'butter' },
  ];
  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={onClose} title="activity" />
      <div className="screen-scroll" style={{ padding: '8px 16px 24px' }}>
        {items.map((it, i) => (
          <div key={i} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center', padding: 14, background: i === 0 ? `var(--${it.tone})` : 'var(--card)', borderColor: i === 0 ? 'transparent' : 'var(--line)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: i === 0 ? '#fff' : `var(--${it.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={
                it.kind === 'match' ? 'heartFill' :
                it.kind === 'like' ? 'sparkle' :
                it.kind === 'view' ? 'eye' :
                it.kind === 'place' ? 'pinFill' : 'bell'
              } size={20} color={it.kind === 'match' ? 'var(--coral)' : 'var(--ink)'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.35 }}>
                <b>{it.who}</b> {it.what}
              </div>
              <div className="meta" style={{ fontSize: 11, marginTop: 2 }}>{it.when}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenEmptyDiscover, ScreenEmptyChats, ScreenLikesYou, ScreenNotifs });
