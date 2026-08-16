// screens-chats.jsx — Matches list, Chat detail, Me/Profile, Edit profile, Settings, Filters

// ─────────────────────────────────────────────────────────────
// Chats (matches) tab — new matches row + conversation list
// ─────────────────────────────────────────────────────────────
function ScreenChats({ openChat, openSearch, openLikesYou, openNotifs }) {
  const newOnes = MATCHES.filter(m => m.isNew);
  const convos = MATCHES.filter(m => !m.isNew);
  return (
    <>
      <div className="status-pad" />
      <TopBar title="chats" sub={`${MATCHES.length} matches · ${MATCHES.filter(m => m.unread).length} new messages`} right={
        <>
          <CircleBtn icon="bell" onClick={openNotifs} badge />
          <CircleBtn icon="search" onClick={openSearch} />
        </>
      } />

      <div className="screen-scroll">
        {/* New matches strip */}
        <div style={{ padding: '0 16px 14px' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>new matches · {newOnes.length}</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            <div onClick={openLikesYou} style={{ flexShrink: 0, textAlign: 'center', cursor: 'pointer' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 999,
                background: 'var(--coral-soft)',
                border: '2px solid var(--coral)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 6, position: 'relative',
              }}>
                <Icon name="heartFill" size={24} color="var(--coral)" />
                <div style={{ position: 'absolute', top: -2, right: -4, background: 'var(--coral)', color: '#fff', borderRadius: 999, minWidth: 22, height: 22, padding: '0 6px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)' }}>4</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600 }}>likes you</div>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--coral)' }}>tap to see</div>
            </div>
            {newOnes.map(m => (
              <div key={m.id} onClick={() => openChat(m.id)} style={{ flexShrink: 0, textAlign: 'center', cursor: 'pointer', width: 72 }}>
                <Avatar name={m.name} size={72} ring />
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
              </div>
            ))}
            {PEOPLE.slice(0, 3).map(p => (
              <div key={p.id + 'extra'} style={{ flexShrink: 0, textAlign: 'center', width: 72 }}>
                <Avatar name={p.name} size={72} ring />
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversations */}
        <div style={{ padding: '4px 16px 16px' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>conversations</div>
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--line)', overflow: 'hidden' }}>
            {convos.map((m, i) => (
              <div key={m.id} onClick={() => openChat(m.id)} style={{
                padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
                borderBottom: i === convos.length - 1 ? 'none' : '1px solid var(--line)',
              }}>
                <div style={{ position: 'relative' }}>
                  <Avatar name={m.name} size={50} />
                  {i === 0 && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 999, background: 'var(--mint-deep)', border: '2.5px solid var(--card)' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.005em' }}>{m.name}</div>
                    {PEOPLE.find(p => p.id === m.id)?.verified && <Icon name="badgeCheck" size={12} color="var(--coral)" />}
                    <div style={{ flex: 1 }} />
                    <div className="meta" style={{ fontSize: 11 }}>{m.when}</div>
                  </div>
                  <div style={{
                    marginTop: 2, fontSize: 13.5,
                    color: m.unread ? 'var(--ink)' : 'var(--ink-3)',
                    fontWeight: m.unread ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {m.last}
                  </div>
                </div>
                {m.unread > 0 && (
                  <div style={{
                    background: 'var(--coral)', color: '#fff',
                    fontFamily: 'var(--mono)', fontSize: 10,
                    minWidth: 18, height: 18, borderRadius: 999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 5px',
                  }}>{m.unread}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 16px 8px', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
          unmatch fairy ✨ keeps things tidy after 14 days of silence.
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Chat detail — header, comment-anchor pill, messages, working composer
// Composer maintains real state — text appears as bubbles, autoscrolls,
// and demonstrates the "can't send" + retry path when offline.
// ─────────────────────────────────────────────────────────────
function ScreenChat({ matchId, onClose, openProfile, offline, openSheet }) {
  const m = MATCHES.find(x => x.id === matchId) ?? MATCHES[0];
  const p = PEOPLE.find(x => x.id === m.id) ?? PEOPLE[0];
  const seed = CHATS[m.id] || [
    { from: 'them', text: 'okay hi 👋', t: 'now' },
    { from: 'me', text: 'okay hi back', t: 'now' },
  ];
  const [messages, setMessages] = React.useState(seed);
  const [draft, setDraft] = React.useState('');
  const [showingReply, setShowingReply] = React.useState(false);
  const scrollRef = React.useRef(null);

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [muted, setMuted] = React.useState(false);

  // autoscroll to bottom on message changes
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const nowTime = () => {
    const d = new Date();
    let h = d.getHours();
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${mm} ${ampm}`;
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const t = nowTime();
    // Offline-mode demo: queue with failed flag, expose retry control.
    const msg = { from: 'me', text, t, status: offline ? 'failed' : 'sent' };
    setMessages([...messages, msg]);
    setDraft('');
    // simulate the other side typing & replying when online
    if (!offline) {
      setShowingReply(true);
      setTimeout(() => {
        setMessages(prev => [...prev, { from: 'them', text: '👀', t: nowTime() }]);
        setShowingReply(false);
      }, 1800);
    }
  };
  const retry = (i) => {
    setMessages(prev => prev.map((mm, j) => j === i ? { ...mm, status: 'sent' } : mm));
  };

  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      <div className="status-pad" />

      {offline && (
        <div style={{
          background: 'var(--ink)', color: '#fff',
          padding: '8px 16px', fontSize: 12, textAlign: 'center', fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--coral)' }} />
          you're offline. messages will retry when you reconnect.
        </div>
      )}

      {/* Header */}
      <div style={{
        padding: '8px 14px 12px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--line)', background: 'var(--bg)',
      }}>
        <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icon name="back" size={18} />
        </button>
        <div onClick={() => openProfile(p.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <Avatar name={p.name} size={36} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>{p.name}</span>
              {p.verified && <Icon name="badgeCheck" size={12} color="var(--coral)" />}
            </div>
            <div className="meta" style={{ fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Icon name="pin" size={10} color="var(--mint-deep)" /> at {p.place.label} · 4m ago
            </div>
          </div>
        </div>
        <CircleBtn icon="moreV" onClick={() => setMenuOpen(true)} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="screen-scroll" style={{ padding: '14px 16px 12px' }}>
        {/* match pill */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ display: 'inline-block', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 999, padding: '6px 14px' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: 0.06 }}>YOU MATCHED · MAY 14</span>
          </div>
        </div>

        {/* anchor pill — photo OR prompt */}
        {m.anchor && (
          <AnchorPill anchor={m.anchor} person={p} />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.map((msg, i) => {
            const prev = messages[i - 1];
            const sameSender = prev && prev.from === msg.from;
            const failed = msg.status === 'failed';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                <div className={`bubble ${msg.from === 'me' ? 'mine' : 'theirs'}`} style={{
                  marginTop: sameSender ? 2 : 8,
                  background: failed ? '#FF9DA1' : undefined,
                }}>
                  {msg.text}
                </div>
                {!messages[i + 1] || messages[i + 1].from !== msg.from || failed ? (
                  <div style={{ fontSize: 10, color: failed ? 'var(--coral)' : 'var(--ink-3)', textAlign: msg.from === 'me' ? 'right' : 'left', marginTop: 4, fontFamily: 'var(--mono)', letterSpacing: 0.04, display: 'flex', justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start', alignItems: 'center', gap: 6 }}>
                    {failed ? (
                      <>
                        <span style={{ fontWeight: 700 }}>! not sent</span>
                        <button onClick={() => retry(i)} style={{ background: 'transparent', border: 0, color: 'var(--coral)', textDecoration: 'underline', cursor: 'pointer', fontSize: 10, padding: 0, fontWeight: 700 }}>retry</button>
                      </>
                    ) : (
                      <>{msg.from === 'me' ? 'delivered · ' : ''}{msg.t}</>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}

          {/* typing */}
          {showingReply && (
            <div style={{ alignSelf: 'flex-start', marginTop: 6 }}>
              <div className="bubble theirs" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 14px' }}>
                <i style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink-3)', animation: 'typing 1.4s ease-in-out infinite' }} />
                <i style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink-3)', animation: 'typing 1.4s ease-in-out 0.2s infinite' }} />
                <i style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink-3)', animation: 'typing 1.4s ease-in-out 0.4s infinite' }} />
              </div>
              <style>{`@keyframes typing { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }`}</style>
            </div>
          )}
        </div>
      </div>

      {/* composer */}
      <div style={{ padding: '8px 14px 14px', background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
        {/* shortcuts row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto', paddingBottom: 2 }}>
          <button className="chip mint" style={{ flexShrink: 0 }} onClick={() => setDraft(d => d || '📍 share my place — at parchm rn')}>📍 share my place</button>
          <button className="chip butter" style={{ flexShrink: 0 }} onClick={() => setDraft('grab a drink later this week?')}>🍹 grab a drink?</button>
          <button className="chip sky" style={{ flexShrink: 0 }} onClick={() => setDraft('thursday work for you?')}>📅 thursday?</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <button style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="plus" size={18} />
          </button>
          <div style={{ flex: 1, background: 'var(--card)', borderRadius: 22, padding: '4px 6px 4px 14px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--line)' }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder="message…"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', font: 'inherit', fontSize: 15, padding: '8px 0', minWidth: 0 }}
            />
            <button style={{ width: 30, height: 30, borderRadius: 999, background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="mic" size={18} color="var(--ink-3)" />
            </button>
          </div>
          <button
            onClick={send}
            disabled={!draft.trim()}
            style={{
              width: 38, height: 38, borderRadius: 999,
              background: draft.trim() ? 'var(--coral)' : 'var(--card)',
              border: draft.trim() ? 'none' : '1px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: draft.trim() ? 'pointer' : 'default',
              opacity: draft.trim() ? 1 : 0.7,
            }}>
            <Icon name="send" size={16} color={draft.trim() ? '#fff' : 'var(--ink-3)'} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <ChatActionMenu
          person={p} muted={muted}
          onClose={() => setMenuOpen(false)}
          onViewProfile={() => { setMenuOpen(false); openProfile(p.id); }}
          onToggleMute={() => { setMuted(!muted); setMenuOpen(false); }}
          onShareLocation={() => setMenuOpen(false)}
          onUnmatch={() => { setMenuOpen(false); openSheet && openSheet({ kind: 'unmatch', id: p.id }); }}
          onBlock={() => { setMenuOpen(false); openSheet && openSheet({ kind: 'block', id: p.id }); }}
          onReport={() => { setMenuOpen(false); openSheet && openSheet({ kind: 'report-profile', id: p.id }); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chat 3-dot action menu
// ─────────────────────────────────────────────────────────────
function ChatActionMenu({ person, muted, onClose, onViewProfile, onToggleMute, onShareLocation, onUnmatch, onBlock, onReport }) {
  const actions = [
    { icon: 'user', label: `view ${person.name}'s profile`, onClick: onViewProfile, tone: 'peach' },
    { icon: 'bell', label: muted ? 'unmute notifications' : 'mute notifications', onClick: onToggleMute, tone: 'butter' },
    { icon: 'pinFill', label: 'share my location', sub: 'one-time, expires in 1 hour', onClick: onShareLocation, tone: 'mint' },
    { icon: 'x', label: 'unmatch', onClick: onUnmatch, tone: 'lilac', danger: true },
    { icon: 'shield', label: 'block', onClick: onBlock, tone: 'rose', danger: true },
    { icon: 'shield', label: 'report', onClick: onReport, tone: 'peach', danger: true },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90, animation: 'float-up 200ms both' }} />
      <div className="float-up" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 91,
        background: 'var(--bg)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '14px 18px 24px',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--line-2)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={person.name} size={42} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.005em' }}>{person.name}</div>
            <div className="meta" style={{ fontSize: 11.5 }}>matched · at {person.place.label}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, marginTop: 14 }}>
          {actions.map((a, i) => (
            <div key={i} onClick={a.onClick} style={{
              padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: i === actions.length - 1 ? 'none' : '1px solid var(--line)',
              cursor: 'pointer',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: `var(--${a.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={a.icon} size={17} color={a.danger ? 'var(--coral-deep)' : 'var(--ink)'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: a.danger ? 'var(--coral)' : 'var(--ink)' }}>{a.label}</div>
                {a.sub && <div className="meta" style={{ fontSize: 11, marginTop: 2 }}>{a.sub}</div>}
              </div>
              <Icon name="chevron" size={14} color="var(--ink-3)" />
            </div>
          ))}
        </div>

        <button className="btn soft full" style={{ marginTop: 14 }} onClick={onClose}>cancel</button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// AnchorPill — sticky context for what started the conversation.
// Photo anchors show a thumbnail; prompt anchors show q + a.
// ─────────────────────────────────────────────────────────────
function AnchorPill({ anchor, person }) {
  if (anchor.kind === 'prompt') {
    return (
      <div style={{
        background: 'var(--peach)', borderRadius: 18,
        padding: '12px 14px', marginBottom: 14,
        display: 'flex', gap: 10,
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="heartFill" size={14} color="var(--coral)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow" style={{ fontSize: 10 }}>you liked {person.name.toLowerCase()}'s prompt</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>"{anchor.q}"</div>
          {anchor.comment && <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.35 }}>your comment: <i>{anchor.comment}</i></div>}
        </div>
      </div>
    );
  }
  // photo
  const photo = person.photos[anchor.photoIdx] || person.photos[0];
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 18,
      padding: 10, marginBottom: 14,
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div style={{ width: 56, height: 70, borderRadius: 12, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
        <Photo name={photo.seed || (person.name + anchor.photoIdx)} label="" vignette={false} />
        <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'var(--coral)', color: '#fff', width: 18, height: 18, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heartFill" size={9} color="#fff" />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="eyebrow" style={{ fontSize: 10 }}>you ♥'d photo {anchor.photoIdx + 1} of {person.photos.length}</div>
        {anchor.comment ? (
          <div className="h-display" style={{ fontSize: 15, lineHeight: 1.25, marginTop: 3, letterSpacing: '-0.01em' }}>"{anchor.comment}"</div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>no comment — just a like.</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Me — own profile preview
// ─────────────────────────────────────────────────────────────
function ScreenMe({ name, openEdit, openSettings, openFilters, openPause, openPlace, openEvent, savedSpots, savedEvents }) {
  const displayName = name || 'You';
  return (
    <>
      <div className="status-pad" />
      <TopBar
        title="me"
        right={
          <>
            <CircleBtn icon="filter" onClick={openFilters} />
            <CircleBtn icon="settings" onClick={openSettings} />
          </>
        }
      />

      <div className="screen-scroll" style={{ padding: '0 16px 24px' }}>
        {/* hero card */}
        <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', height: 360 }}>
          <Photo name={displayName} label="" />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '60px 18px 18px',
            background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55))',
            color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <div className="h-display" style={{ color: '#fff', fontSize: 28, letterSpacing: '-0.03em' }}>{displayName}, 23</div>
              <Icon name="badgeCheck" size={16} color="#fff" />
            </div>
            <div style={{ marginTop: 2, fontSize: 13, opacity: 0.85 }}>
              at <b style={{ color: '#fff' }}>Parchm Coffee</b> · auto-out in 1h 24m
            </div>
          </div>

          {/* profile completion ring */}
          <div style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(255,255,255,0.95)', borderRadius: 999,
            padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, fontWeight: 600,
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22">
              <circle cx="11" cy="11" r="9" stroke="rgba(0,0,0,0.1)" strokeWidth="2.5" fill="none" />
              <circle cx="11" cy="11" r="9" stroke="var(--coral)" strokeWidth="2.5" fill="none" strokeDasharray={`${0.86 * 56.5} 100`} transform="rotate(-90 11 11)" strokeLinecap="round" />
            </svg>
            <span>86% complete</span>
          </div>
        </div>

        {/* edit + share */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={openEdit} className="btn soft" style={{ flex: 1 }}>
            <Icon name="edit" size={14} /> edit profile
          </button>
          <button onClick={openPause} className="btn soft" style={{ flex: 1 }}>
            <Icon name="clock" size={14} /> pause
          </button>
        </div>

        {/* stats card */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="eyebrow">this week</div>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center' }}>
            <Stat n="47" l="profile views" />
            <Stat n="12" l="likes received" />
            <Stat n="3" l="matches" />
          </div>
        </div>

        {/* Saved spots — horizontal strip */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="eyebrow">saved spots · {savedSpots.length}</div>
            <span className="meta" style={{ fontSize: 10 }}>tap to revisit</span>
          </div>
          {savedSpots.length === 0 ? (
            <div className="card" style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              tap the ♡ on any spot to save it here.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {savedSpots.map(id => {
                const p = PLACES.find(x => x.id === id);
                if (!p) return null;
                return (
                  <div key={p.id} onClick={() => openPlace(p.id)} style={{ flexShrink: 0, width: 130, cursor: 'pointer' }}>
                    <div style={{ aspectRatio: '1', borderRadius: 14, background: `var(--${p.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, position: 'relative' }}>
                      <Icon name={p.icon} size={32} />
                      {p.hot && <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--coral)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 8, padding: '2px 5px', borderRadius: 999 }}>HOT</div>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</div>
                    <div className="meta" style={{ fontSize: 10.5 }}>{p.kind} · {p.dist}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Favourite events — same shape */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="eyebrow">favourite events · {savedEvents.length}</div>
            <span className="meta" style={{ fontSize: 10 }}>upcoming + past</span>
          </div>
          {savedEvents.length === 0 ? (
            <div className="card" style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              ♡ events from the events tab to keep track here.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {savedEvents.map(id => {
                const e = EVENTS.find(x => x.id === id);
                if (!e) return null;
                return (
                  <div key={e.id} onClick={() => openEvent(e.id)} style={{ flexShrink: 0, width: 150, cursor: 'pointer' }}>
                    <div style={{ aspectRatio: '4/5', borderRadius: 14, background: `var(--${e.tone})`, position: 'relative', overflow: 'hidden', marginBottom: 6 }}>
                      <EventArt event={e} hideGlyph />
                      <div style={{ position: 'absolute', top: 8, left: 8, background: '#fff', borderRadius: 8, padding: '4px 7px', textAlign: 'center', fontFamily: 'var(--display)', fontWeight: 700, lineHeight: 0.95 }}>
                        <div style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: 0.06, textTransform: 'uppercase' }}>{e.whenShort}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                    <div className="meta" style={{ fontSize: 10.5 }}>{e.when}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ height: 24 }} />
      </div>
    </>
  );
}

function Stat({ n, l }) {
  return (
    <div>
      <div className="h-display" style={{ fontSize: 24, letterSpacing: '-0.02em' }}>{n}</div>
      <div className="meta" style={{ fontSize: 10.5, marginTop: 2 }}>{l}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Edit profile — manage photos, bio, prompts, tags
// ─────────────────────────────────────────────────────────────
function ScreenEdit({ onClose, go }) {
  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={onClose} title="edit profile" right={<button onClick={onClose} className="btn coral" style={{ padding: '8px 14px', fontSize: 13 }}>done</button>} />
      <div className="screen-scroll" style={{ padding: '12px 16px 24px' }}>
        <div className="eyebrow">photos · drag to reorder</div>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden' }}>
              <Photo name={'M' + i} label="" />
              <button style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 999, background: 'rgba(0,0,0,0.6)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Icon name="x" size={12} color="#fff" />
              </button>
              {i === 0 && (
                <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'var(--coral)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 6px', borderRadius: 999 }}>MAIN</div>
              )}
            </div>
          ))}
        </div>

        <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>bio</div>
        <textarea className="input" defaultValue="i make decent pasta, i'm bad at parallel parking, ask me about my hot takes on early 2000s rom-coms." style={{ minHeight: 110, resize: 'none', lineHeight: 1.45 }} />

        <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>prompts · 3</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { q: 'green flag i look for', a: 'reads physical books in public unironically.', tone: 'peach' },
            { q: 'two truths and a lie', a: 'lived in lisbon for a year. allergic to mangoes. can name every taylor swift bridge.', tone: 'mint' },
            { q: 'a non-negotiable', a: 'splits the bill without making it weird.', tone: 'lilac' },
          ].map((p, i) => (
            <div key={i} className="card" style={{ background: `var(--${p.tone})`, border: 'none', position: 'relative' }}>
              <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>{p.q}</div>
              <div className="h-display" style={{ marginTop: 4, fontSize: 17, lineHeight: 1.2, letterSpacing: '-0.015em', paddingRight: 36 }}>{p.a}</div>
              <button style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 999, background: '#fff', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Icon name="edit" size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>basics</div>
        <div className="card" style={{ padding: 0 }}>
          {[
            { l: 'pronouns', v: 'she/her', edit: 'edit-pronouns' },
            { l: 'height', v: '5\'6"', edit: 'edit-height' },
            { l: 'school', v: 'NYU', edit: 'edit-school' },
            { l: 'job', v: 'comms @ startup', edit: 'edit-job' },
            { l: 'star sign', v: 'cancer ♋', edit: 'edit-starsign' },
            { l: 'drinks', v: 'socially', edit: 'edit-drinks' },
            { l: 'smokes', v: 'no', edit: 'edit-smokes' },
            { l: 'exercise', v: 'a few/wk', edit: 'edit-exercise' },
            { l: 'kids', v: 'open to it', edit: 'edit-kids' },
            { l: 'relationship', v: 'long-term', edit: 'edit-relationship' },
          ].map((r, i, a) => (
            <div key={r.l} onClick={() => go && go(r.edit)} style={{ display: 'flex', padding: '14px 16px', borderBottom: i === a.length - 1 ? 'none' : '1px solid var(--line)', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ flex: 1, fontSize: 14.5 }}>{r.l}</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 14.5, marginRight: 6 }}>{r.v}</div>
              <Icon name="chevron" size={14} color="var(--ink-3)" />
            </div>
          ))}
        </div>

        <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>linked accounts</div>
        <ConnectedAccounts />

        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}

// Connectable Instagram + Spotify rows
function ConnectedAccounts() {
  const [ig, setIg] = React.useState(false);
  const [sp, setSp] = React.useState(false);
  const rows = [
    { key: 'ig', l: 'instagram', icon: 'instagram', on: ig, set: setIg, connected: '@maya.png', tone: 'rose' },
    { key: 'sp', l: 'spotify', icon: 'spotify', on: sp, set: setSp, connected: 'top: blueberry faygo', tone: 'mint' },
  ];
  return (
    <div className="card" style={{ padding: 0 }}>
      {rows.map((r, i, a) => (
        <div key={r.key} style={{ display: 'flex', padding: '14px 16px', borderBottom: i === a.length - 1 ? 'none' : '1px solid var(--line)', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `var(--${r.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={r.icon} size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500 }}>{r.l}</div>
            <div className="meta" style={{ fontSize: 11, marginTop: 1 }}>{r.on ? r.connected : 'not connected'}</div>
          </div>
          <button onClick={() => r.set(!r.on)} className={r.on ? 'btn soft' : 'btn coral'} style={{ padding: '8px 14px', fontSize: 12.5 }}>
            {r.on ? 'disconnect' : 'connect'}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Filters sheet (modal)
// ─────────────────────────────────────────────────────────────
function ScreenFilters({ onClose }) {
  const [distance, setDistance] = React.useState(8);
  const [ageMin, setAgeMin] = React.useState(21);
  const [ageMax, setAgeMax] = React.useState(28);
  const [heightMin, setHeightMin] = React.useState(60);
  const [heightMax, setHeightMax] = React.useState(78);
  const [show, setShow] = React.useState(['women', 'non-binary folks']);
  const [showOnPlaces, setShowOnPlaces] = React.useState(true);
  const [relationship, setRelationship] = React.useState(['longterm', 'longterm-open']);
  const [drinks, setDrinks] = React.useState([]);
  const [smokes, setSmokes] = React.useState([]);
  const [exercise, setExercise] = React.useState([]);
  const [fourtwenty, setFourtwenty] = React.useState([]);
  const [kids, setKids] = React.useState([]);
  const [politics, setPolitics] = React.useState([]);
  const [religion, setReligion] = React.useState([]);
  const [monogamy, setMonogamy] = React.useState([]);
  const [starSign, setStarSign] = React.useState([]);
  const [interests, setInterests] = React.useState([]);
  const toggle = (arr, setter) => (v) => setter(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const ft = (n) => `${Math.floor(n / 12)}'${n % 12}"`;

  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead
        onBack={onClose}
        title="filters"
        right={<button className="btn ghost" style={{ padding: '8px 12px', fontSize: 13, color: 'var(--coral)' }} onClick={() => {
          setDistance(8); setAgeMin(21); setAgeMax(28); setHeightMin(60); setHeightMax(78);
          setShow(['women']); setRelationship([]); setDrinks([]); setSmokes([]); setExercise([]);
          setFourtwenty([]); setKids([]); setPolitics([]); setReligion([]); setMonogamy([]);
          setStarSign([]); setInterests([]);
        }}>reset</button>}
      />
      <div className="screen-scroll" style={{ padding: '8px 18px 100px' }}>

        <div className="eyebrow">show me</div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['women', 'men', 'non-binary folks', 'everyone'].map(o => (
            <button key={o} className={'tile' + (show.includes(o) ? ' on' : '')} onClick={() => {
              setShow(show.includes(o) ? show.filter(x => x !== o) : [...show, o]);
            }}>
              <span>{o}</span>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                border: '2px solid ' + (show.includes(o) ? '#fff' : 'var(--line-2)'),
                background: show.includes(o) ? '#fff' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {show.includes(o) && <Icon name="check" size={14} color="var(--ink)" />}
              </div>
            </button>
          ))}
        </div>

        <div className="eyebrow" style={{ marginTop: 22 }}>age range</div>
        <div className="card" style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 600 }}>{ageMin}</span>
            <span style={{ color: 'var(--ink-3)' }}>—</span>
            <span style={{ fontWeight: 600 }}>{ageMax}</span>
          </div>
          <RangeBar lo={ageMin} hi={ageMax} min={18} max={50} />
        </div>

        <div className="eyebrow" style={{ marginTop: 22 }}>height</div>
        <div className="card" style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 600 }}>{ft(heightMin)}</span>
            <span style={{ color: 'var(--ink-3)' }}>—</span>
            <span style={{ fontWeight: 600 }}>{ft(heightMax)}</span>
          </div>
          <RangeBar lo={heightMin} hi={heightMax} min={48} max={84} />
        </div>

        <div className="eyebrow" style={{ marginTop: 22 }}>distance</div>
        <div className="card" style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 600 }}>within {distance} mi</span>
            <span className="meta">{distance >= 50 ? 'anywhere' : '~25 min'}</span>
          </div>
          <input type="range" min="1" max="50" value={distance} onChange={(e) => setDistance(+e.target.value)} style={{ width: '100%', accentColor: 'var(--coral)' }} />
        </div>

        <FilterChips
          label="relationship type"
          options={[
            { v: 'longterm', l: 'long-term' },
            { v: 'longterm-open', l: 'long-term, open to short' },
            { v: 'short-open', l: 'short, open to long' },
            { v: 'short', l: 'short-term' },
            { v: 'figuring-out', l: 'figuring it out' },
            { v: 'friends', l: 'new friends' },
          ]}
          values={relationship}
          onToggle={toggle(relationship, setRelationship)}
        />

        <FilterChips label="drinks" options={['often', 'socially', 'rarely', 'never']} values={drinks} onToggle={toggle(drinks, setDrinks)} />
        <FilterChips label="smokes" options={['regularly', 'socially', 'trying to quit', 'never']} values={smokes} onToggle={toggle(smokes, setSmokes)} />
        <FilterChips label="exercise" options={['daily', 'a few times a week', 'sometimes', 'never']} values={exercise} onToggle={toggle(exercise, setExercise)} />
        <FilterChips label="420" options={['yes', 'sometimes', 'never']} values={fourtwenty} onToggle={toggle(fourtwenty, setFourtwenty)} />

        <FilterChips label="kids" options={['want some', 'have some, want more', 'have some, done', "don't want", 'open to it']} values={kids} onToggle={toggle(kids, setKids)} />
        <FilterChips label="politics" options={['left', 'moderate', 'right', 'not political']} values={politics} onToggle={toggle(politics, setPolitics)} />
        <FilterChips label="religion" options={['agnostic', 'atheist', 'christian', 'jewish', 'muslim', 'hindu', 'buddhist', 'spiritual', 'other']} values={religion} onToggle={toggle(religion, setReligion)} />
        <FilterChips label="monogamy" options={['monogamous', 'monogamish', 'non-monogamous', 'figuring it out']} values={monogamy} onToggle={toggle(monogamy, setMonogamy)} />

        <FilterChips label="star sign" options={['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces']} values={starSign} onToggle={toggle(starSign, setStarSign)} />

        <FilterChips
          label="shared interests"
          options={['art','music','photography','design','hiking','running','climbing','yoga','gym','cooking','coffee','natural wine','cocktails','live music','dive bars','reading','gaming','coding','film','letterboxd','A24','podcasts']}
          values={interests}
          onToggle={toggle(interests, setInterests)}
        />

        <div className="eyebrow" style={{ marginTop: 22 }}>where i am right now</div>
        <div className="card" style={{ marginTop: 10, padding: 0 }}>
          <ToggleRow label="show me on Places" sub="people at my place can see me" on={showOnPlaces} onChange={setShowOnPlaces} last />
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px 24px', background: 'linear-gradient(180deg, transparent, var(--bg) 30%)' }}>
        <button className="btn coral full lg" onClick={onClose}>see profiles →</button>
      </div>
    </div>
  );
}

function FilterChips({ label, options, values, onToggle }) {
  return (
    <>
      <div className="eyebrow" style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        {values.length > 0 && <span style={{ color: 'var(--coral)' }}>{values.length} selected</span>}
      </div>
      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(o => {
          const v = typeof o === 'string' ? o : o.v;
          const l = typeof o === 'string' ? o : o.l;
          const on = values.includes(v);
          return (
            <button key={v} onClick={() => onToggle(v)} className={`chip ${on ? 'solid' : ''}`} style={{ fontSize: 13, padding: '8px 14px' }}>
              {on && <Icon name="check" size={11} color="#fff" />}
              {l}
            </button>
          );
        })}
      </div>
    </>
  );
}

function RangeBar({ lo, hi, min, max }) {
  const a = ((lo - min) / (max - min)) * 100;
  const b = ((hi - min) / (max - min)) * 100;
  return (
    <div style={{ position: 'relative', height: 24 }}>
      <div style={{ position: 'absolute', top: 11, left: 0, right: 0, height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 999 }} />
      <div style={{ position: 'absolute', top: 11, left: `${a}%`, width: `${b - a}%`, height: 4, background: 'var(--coral)', borderRadius: 999 }} />
      <div style={{ position: 'absolute', top: 4, left: `calc(${a}% - 9px)`, width: 18, height: 18, background: '#fff', borderRadius: 999, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', border: '1.5px solid var(--coral)' }} />
      <div style={{ position: 'absolute', top: 4, left: `calc(${b}% - 9px)`, width: 18, height: 18, background: '#fff', borderRadius: 999, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', border: '1.5px solid var(--coral)' }} />
    </div>
  );
}

function ToggleRow({ label, sub, on, onChange, last }) {
  const [val, setVal] = React.useState(on);
  const v = onChange ? on : val;
  const toggle = () => { (onChange || setVal)(!v); };
  return (
    <div onClick={toggle} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: last ? 'none' : '1px solid var(--line)', cursor: 'pointer' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{label}</div>
        {sub && <div className="meta" style={{ fontSize: 11.5, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{
        width: 46, height: 28, borderRadius: 999,
        background: v ? 'var(--coral)' : 'rgba(0,0,0,0.12)',
        position: 'relative', transition: 'background 150ms',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: v ? 21 : 3,
          width: 22, height: 22, borderRadius: 999, background: '#fff',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          transition: 'left 150ms',
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Settings — long list, grouped
// ─────────────────────────────────────────────────────────────
function ScreenSettings({ onClose, go }) {
  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={onClose} title="settings" />
      <div className="screen-scroll" style={{ padding: '12px 16px 24px' }}>
        <SetGroup label="account">
          <SetRow icon="user" l="phone number" v="+1 (555) 010-4242" iconBg="var(--peach)" onClick={() => go('set-phone')} />
          <SetRow icon="badgeCheck" l="verification" v="verified ✓" vColor="var(--coral)" iconBg="var(--mint)" onClick={() => go('set-verify')} />
          <SetRow icon="shield" l="privacy & safety" iconBg="var(--lilac)" onClick={() => go('set-privacy')} />
          <SetRow icon="bell" l="notifications" v="all on" iconBg="var(--butter)" onClick={() => go('set-notifs')} last />
        </SetGroup>

        <SetGroup label="discovery">
          <SetRow icon="filter" l="filters" iconBg="var(--sky)" onClick={() => go('filters')} />
          <SetRow icon="pin" l="location" v="auto" iconBg="var(--peach)" onClick={() => go('set-location')} />
          <SetRow icon="eye" l="who sees me" v="everyone" iconBg="var(--mint)" onClick={() => go('set-whosees')} last />
        </SetGroup>

        <SetGroup label="legal">
          <SetRow l="community guidelines" iconBg="var(--bg-2)" onClick={() => go('legal-guidelines')} />
          <SetRow l="terms of service" iconBg="var(--bg-2)" onClick={() => go('legal-terms')} />
          <SetRow l="privacy policy" iconBg="var(--bg-2)" onClick={() => go('legal-privacy')} last />
        </SetGroup>

        <button className="btn ghost full" style={{ color: 'var(--coral)', marginTop: 10 }} onClick={() => go('login')}>log out</button>
        <button className="btn ghost full" style={{ color: 'var(--ink-3)', fontSize: 13 }} onClick={() => go('pause')}>delete account</button>

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
          HEY · v1.0.0 (build 2026.05.16)
        </div>
        <div style={{ height: 14 }} />
      </div>
    </div>
  );
}

function SetGroup({ label, children }) {
  return (
    <>
      <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>{label}</div>
      <div className="card" style={{ padding: 0 }}>
        {children}
      </div>
    </>
  );
}
function SetRow({ icon, l, v, vColor, iconBg = 'var(--bg-2)', last, onClick }) {
  return (
    <div onClick={onClick} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: last ? 'none' : '1px solid var(--line)', cursor: onClick ? 'pointer' : 'default' }}>
      {icon && (
        <div style={{ width: 32, height: 32, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={16} />
        </div>
      )}
      <div style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{l}</div>
      {v && <div style={{ color: vColor || 'var(--ink-3)', fontSize: 13.5 }}>{v}</div>}
      <Icon name="chevron" size={14} color="var(--ink-3)" />
    </div>
  );
}

Object.assign(window, { ScreenChats, ScreenChat, ScreenMe, ScreenEdit, ScreenFilters, ScreenSettings });
