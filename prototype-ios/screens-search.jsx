// screens-search.jsx — Search overlays for Places and Chats

// ─────────────────────────────────────────────────────────────
// SearchSheet — base search overlay shell. Top input + cancel,
// recents row, grouped results, scrim background.
// ─────────────────────────────────────────────────────────────
function SearchSheet({ placeholder, onClose, recents = [], children }) {
  const [q, setQ] = React.useState('');
  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      <div className="status-pad" />

      {/* Top: input + cancel */}
      <div style={{ padding: '4px 12px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          flex: 1, background: 'var(--card)',
          border: '1px solid var(--line)', borderRadius: 999,
          padding: '10px 14px 10px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="search" size={18} color="var(--ink-3)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            autoFocus
            style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              font: 'inherit', fontSize: 15, color: 'var(--ink)', minWidth: 0,
            }}
          />
          {q && (
            <button onClick={() => setQ('')} style={{
              width: 22, height: 22, borderRadius: 999,
              background: 'rgba(0,0,0,0.08)', border: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 0, cursor: 'pointer',
          font: 'inherit', fontWeight: 600, fontSize: 14.5, color: 'var(--coral)',
          padding: '8px 4px',
        }}>cancel</button>
      </div>

      <div className="screen-scroll" style={{ padding: '4px 16px 20px' }}>
        {!q && recents.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>recent</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {recents.map(r => (
                <button key={r} onClick={() => setQ(r)} className="chip" style={{ fontSize: 12.5 }}>
                  <Icon name="clock" size={11} /> {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {typeof children === 'function' ? children(q) : children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ScreenSearchPlaces — search for a spot or category
// ─────────────────────────────────────────────────────────────
function ScreenSearchPlaces({ onClose, openPlace }) {
  return (
    <SearchSheet
      placeholder="search spots, vibes, kinds…"
      onClose={onClose}
      recents={['attaboy', 'matcha', 'parks near me', 'open late']}
    >
      {(q) => {
        const ql = q.toLowerCase().trim();
        const filtered = ql
          ? PLACES.filter(p =>
              p.label.toLowerCase().includes(ql) ||
              p.kind.toLowerCase().includes(ql) ||
              p.vibe.toLowerCase().includes(ql))
          : PLACES;
        return (
          <>
            {!ql && (
              <>
                <div className="eyebrow" style={{ marginBottom: 8 }}>browse by vibe</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 18 }}>
                  {[
                    { label: 'coffee', tone: 'peach', icon: 'coffee' },
                    { label: 'cocktails', tone: 'lilac', icon: 'cocktail' },
                    { label: 'parks', tone: 'mint', icon: 'park' },
                    { label: 'books', tone: 'butter', icon: 'book' },
                    { label: 'music', tone: 'sky', icon: 'music' },
                    { label: 'late night', tone: 'rose', icon: 'pizza' },
                  ].map(c => (
                    <button key={c.label} className="card" style={{ background: `var(--${c.tone})`, border: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: 14, cursor: 'pointer' }}>
                      <Icon name={c.icon} size={22} />
                      <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.005em' }}>{c.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="eyebrow" style={{ marginBottom: 8 }}>
              {ql ? `${filtered.length} result${filtered.length === 1 ? '' : 's'}` : 'all spots'}
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
                no spots match "{q}". we curate — request one in settings.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(p => (
                  <div key={p.id} onClick={() => openPlace(p.id)} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', padding: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `var(--${p.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={p.icon} size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.005em' }}>{p.label}</div>
                        {p.hot && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--coral)', fontWeight: 700 }}>HOT</span>}
                      </div>
                      <div className="meta" style={{ fontSize: 11.5, marginTop: 1 }}>{p.kind} · {p.here} here · {p.dist}</div>
                    </div>
                    <Icon name="chevron" size={14} color="var(--ink-3)" />
                  </div>
                ))}
              </div>
            )}
          </>
        );
      }}
    </SearchSheet>
  );
}

// ─────────────────────────────────────────────────────────────
// ScreenSearchChats — search matches & messages
// ─────────────────────────────────────────────────────────────
function ScreenSearchChats({ onClose, openChat }) {
  return (
    <SearchSheet
      placeholder="search matches & messages…"
      onClose={onClose}
      recents={['maya', 'thursday', 'bagel', 'attaboy']}
    >
      {(q) => {
        const ql = q.toLowerCase().trim();
        const matchHits = MATCHES.filter(m => !ql || m.name.toLowerCase().includes(ql));
        const messageHits = ql ? MATCHES.filter(m => m.last.toLowerCase().includes(ql)) : [];
        return (
          <>
            {!ql && (
              <>
                <div className="eyebrow" style={{ marginBottom: 8 }}>quick filters</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
                  {['unread', 'new matches', 'plans made', 'archived', 'sent ♥ no reply'].map((c, i) => (
                    <button key={c} className={`chip ${i === 0 ? 'solid' : ''}`}>{c}</button>
                  ))}
                </div>
              </>
            )}

            <div className="eyebrow" style={{ marginBottom: 8 }}>
              matches {ql && `· ${matchHits.length}`}
            </div>
            <div style={{ background: 'var(--card)', borderRadius: 18, border: '1px solid var(--line)', overflow: 'hidden', marginBottom: 18 }}>
              {matchHits.length === 0 ? (
                <div style={{ padding: 18, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13.5 }}>no matches named "{q}"</div>
              ) : matchHits.map((m, i) => (
                <div key={m.id} onClick={() => openChat(m.id)} style={{
                  padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer',
                  borderBottom: i === matchHits.length - 1 ? 'none' : '1px solid var(--line)',
                }}>
                  <Avatar name={m.name} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}><HighlightedText text={m.name} q={q} /></div>
                    <div className="meta" style={{ fontSize: 11.5, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.last}</div>
                  </div>
                  <Icon name="chevron" size={14} color="var(--ink-3)" />
                </div>
              ))}
            </div>

            {ql && messageHits.length > 0 && (
              <>
                <div className="eyebrow" style={{ marginBottom: 8 }}>messages · {messageHits.length}</div>
                <div style={{ background: 'var(--card)', borderRadius: 18, border: '1px solid var(--line)', overflow: 'hidden' }}>
                  {messageHits.map((m, i) => (
                    <div key={m.id} onClick={() => openChat(m.id)} style={{
                      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer',
                      borderBottom: i === messageHits.length - 1 ? 'none' : '1px solid var(--line)',
                    }}>
                      <Avatar name={m.name} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-3)' }}>{m.name} · {m.when}</div>
                        <div style={{ fontSize: 13.5, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <HighlightedText text={m.last} q={q} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        );
      }}
    </SearchSheet>
  );
}

// HighlightedText — wraps any case-insensitive match of q in a coral highlight
function HighlightedText({ text, q }) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ background: 'var(--coral-soft)', color: 'var(--coral-deep)', padding: '0 2px', borderRadius: 3, fontWeight: 700 }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

Object.assign(window, { SearchSheet, ScreenSearchPlaces, ScreenSearchChats, HighlightedText });
