// screens-places.jsx — PLACES (hero feature)
// Map with floating pins, list, detail w/ people-here grid, check-in confirmation

// ─────────────────────────────────────────────────────────────
// Stylized map background — dotted grid, soft streets, water blob
// ─────────────────────────────────────────────────────────────
function MapCanvas({ children }) {
  return (
    <div className="map-bg" style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
    }}>
      {/* water + park blobs */}
      <div style={{
        position: 'absolute', top: '-12%', right: '-20%',
        width: '70%', height: '50%', borderRadius: '50%',
        background: 'var(--sky)', opacity: 0.65,
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-15%',
        width: '60%', height: '45%', borderRadius: '50%',
        background: 'var(--mint)', opacity: 0.55,
      }} />
      <div style={{
        position: 'absolute', top: '30%', left: '30%',
        width: '30%', height: '20%', borderRadius: '50%',
        background: 'var(--mint)', opacity: 0.7,
      }} />

      {/* streets — diagonal lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18 }}>
        <line x1="0" y1="65%" x2="100%" y2="40%" stroke="#000" strokeWidth="1.5" />
        <line x1="0" y1="80%" x2="100%" y2="55%" stroke="#000" strokeWidth="1.5" />
        <line x1="20%" y1="0" x2="55%" y2="100%" stroke="#000" strokeWidth="1.5" />
        <line x1="40%" y1="0" x2="75%" y2="100%" stroke="#000" strokeWidth="1.5" />
        <line x1="60%" y1="0" x2="95%" y2="100%" stroke="#000" strokeWidth="1.5" />
      </svg>

      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Place pin — floating pill with count
// ─────────────────────────────────────────────────────────────
function PlacePin({ place, style, onClick, big = false }) {
  return (
    <button onClick={onClick} className="place-pin" style={{
      position: 'absolute', cursor: 'pointer', ...style,
      zIndex: big ? 5 : 2,
      padding: big ? '8px 14px 8px 10px' : '6px 12px 6px 8px',
      ...(place.hot ? { borderColor: 'var(--coral)', borderWidth: 1.5 } : {}),
    }}>
      <div style={{ width: big ? 26 : 20, height: big ? 26 : 20, borderRadius: 999, background: `var(--${place.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={place.icon} size={big ? 14 : 12} color="var(--ink)" />
      </div>
      <span style={{ fontSize: big ? 14 : 13 }}>{place.label}</span>
      <span className="ct">{place.here}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Segmented control — Spots | Events
// ─────────────────────────────────────────────────────────────
function OutSegment({ mode, setMode }) {
  return (
    <div style={{ padding: '0 16px 10px' }}>
      <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 14, padding: 4, position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 4, bottom: 4,
          left: mode === 'spots' ? 4 : '50%',
          right: mode === 'spots' ? '50%' : 4,
          background: '#fff', borderRadius: 10,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          transition: 'left 180ms cubic-bezier(.3,.7,.4,1), right 180ms cubic-bezier(.3,.7,.4,1)',
        }} />
        {['spots', 'events'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '10px 0', background: 'transparent', border: 0,
            position: 'relative', zIndex: 1, cursor: 'pointer',
            font: 'inherit', fontWeight: 600, fontSize: 14,
            color: mode === m ? 'var(--ink)' : 'var(--ink-3)',
            letterSpacing: '-0.005em',
          }}>
            {m}
            {m === 'events' && <span style={{ display: 'inline-block', marginLeft: 6, width: 6, height: 6, borderRadius: 999, background: 'var(--coral)', verticalAlign: 'middle' }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Places tab — Map view (default) with current location + nearby pins + bottom sheet
// ─────────────────────────────────────────────────────────────
function ScreenPlaces({ checkinPlace, openPlace, openEvent, openSearch, openFilters, doCheckIn, setView, view, outMode, setOutMode, savedEvents, toggleSave }) {
  const myPlace = checkinPlace ? PLACES.find(p => p.id === checkinPlace) : null;

  return (
    <>
      <div className="status-pad" />
      <TopBar
        title="out"
        sub={outMode === 'spots' ? 'people right here, right now' : 'things to actually show up to'}
        right={
          outMode === 'spots' ? (
            <>
              <CircleBtn icon={view === 'map' ? 'list' : 'pin'} onClick={() => setView(view === 'map' ? 'list' : 'map')} />
              <CircleBtn icon="search" onClick={openSearch} />
            </>
          ) : (
            <CircleBtn icon="filter" onClick={openFilters} />
          )
        }
      />
      <OutSegment mode={outMode} setMode={setOutMode} />

      {outMode === 'events' && (
        <EventsList openEvent={openEvent} savedEvents={savedEvents} toggleSave={toggleSave} />
      )}

      {outMode === 'spots' && view === 'map' && (
        <div style={{ flex: 1, position: 'relative', margin: '0 16px', borderRadius: 22, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <MapCanvas>
            {/* current location dot */}
            <div style={{ position: 'absolute', top: '52%', left: '48%' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(255,90,95,0.15)',
                position: 'absolute', top: -40, left: -40,
                animation: 'pulse-loc 2.4s ease-out infinite',
              }} />
              <div style={{ width: 18, height: 18, borderRadius: 999, background: 'var(--coral)', border: '3px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', position: 'absolute' }} />
              <style>{`
                @keyframes pulse-loc {
                  0% { transform: scale(0.5); opacity: 0.7; }
                  100% { transform: scale(1.8); opacity: 0; }
                }
              `}</style>
            </div>

            {/* place pins, scattered */}
            <PlacePin place={PLACES[0]} style={{ top: '30%', left: '14%' }} onClick={() => openPlace(PLACES[0].id)} />
            <PlacePin place={PLACES[1]} style={{ top: '20%', left: '52%' }} onClick={() => openPlace(PLACES[1].id)} big />
            <PlacePin place={PLACES[3]} style={{ top: '38%', right: '8%' }} onClick={() => openPlace(PLACES[3].id)} />
            <PlacePin place={PLACES[5]} style={{ top: '68%', left: '10%' }} onClick={() => openPlace(PLACES[5].id)} />
            <PlacePin place={PLACES[7]} style={{ top: '78%', left: '54%' }} onClick={() => openPlace(PLACES[7].id)} />
            <PlacePin place={PLACES[2]} style={{ bottom: '10%', right: '10%' }} onClick={() => openPlace(PLACES[2].id)} />

            {/* zoom / locate buttons */}
            <div style={{ position: 'absolute', bottom: 100, right: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button style={{ width: 40, height: 40, borderRadius: 12, border: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.12)', cursor: 'pointer' }}>
                <Icon name="locate" size={18} />
              </button>
            </div>
          </MapCanvas>

          {/* "where are you?" sheet — always above pins so it doesn't get covered.
              User can pan/zoom the map (or scroll if pins are obscured) to reveal them. */}
          <div style={{
            position: 'absolute', left: 12, right: 12, bottom: 12,
            background: '#fff', borderRadius: 18, padding: '14px 16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
            zIndex: 20,
          }}>
            {myPlace ? (
              <div>
                <div className="eyebrow" style={{ color: 'var(--coral)' }}>you're checked in</div>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 999, background: `var(--${myPlace.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={myPlace.icon} size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>{myPlace.label}</div>
                    <div className="meta" style={{ fontSize: 11.5 }}>{myPlace.here} people here · auto-out in 2h</div>
                  </div>
                  <button onClick={() => openPlace(myPlace.id)} className="btn soft" style={{ padding: '8px 14px', fontSize: 13 }}>view</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="pinFill" size={16} color="var(--coral)" />
                  <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>where are you right now?</div>
                </div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                  tap a pin within 100m to check in. you'll show up under "people here" for 2 hours.
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  {PLACES.slice(0, 4).map(p => (
                    <button key={p.id} onClick={() => doCheckIn(p.id)} className="chip" style={{ background: `var(--${p.tone})`, border: 'none' }}>
                      <Icon name={p.icon} size={12} /> {p.label}
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginLeft: 2 }}>{p.dist}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {outMode === 'spots' && view === 'list' && (
        <SpotsList openPlace={openPlace} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Spots list — chips filter the rendered list by kind/state
// ─────────────────────────────────────────────────────────────
function SpotsList({ openPlace }) {
  const [filter, setFilter] = React.useState('all');
  const filters = [
    { v: 'all', l: 'all', test: () => true },
    { v: 'hot', l: 'hot rn', test: (p) => p.hot },
    { v: 'coffee', l: 'coffee', test: (p) => p.kind.toLowerCase().includes('coffee') },
    { v: 'cocktail', l: 'cocktail', test: (p) => p.kind.toLowerCase().includes('cocktail') || p.kind.toLowerCase().includes('wine') },
    { v: 'parks', l: 'parks', test: (p) => p.kind.toLowerCase().includes('park') },
    { v: 'gym', l: 'gym', test: (p) => p.kind.toLowerCase().includes('gym') },
    { v: 'music', l: 'music', test: (p) => p.kind.toLowerCase().includes('music') },
  ];
  const test = filters.find(f => f.v === filter)?.test ?? (() => true);
  const filtered = PLACES.filter(test);

  return (
    <div className="screen-scroll" style={{ padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto' }}>
        {filters.map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)} className={`chip ${filter === f.v ? 'solid' : ''}`} style={{ flexShrink: 0 }}>{f.l}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
            no spots match that filter yet.
          </div>
        ) : filtered.map(p => (
          <div key={p.id} onClick={() => openPlace(p.id)} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer', padding: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: `var(--${p.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
              <Icon name={p.icon} size={26} />
              {p.hot && <div style={{ position: 'absolute', top: -4, right: -4, background: 'var(--coral)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 8, padding: '2px 5px', borderRadius: 999, letterSpacing: 0.06 }}>HOT</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>{p.label}</div>
                <div className="meta" style={{ fontSize: 11 }}>· {p.kind}</div>
              </div>
              <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.vibe}
              </div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex' }}>
                  {Array.from({ length: Math.min(3, Math.floor(p.here / 6) + 1) }, (_, i) => (
                    <div key={i} style={{ marginLeft: i === 0 ? 0 : -6 }}>
                      <Avatar name={p.label + i} size={20} />
                    </div>
                  ))}
                </div>
                <span className="meta" style={{ fontSize: 11 }}>{p.here} here · {p.dist}</span>
              </div>
            </div>
            <Icon name="chevron" size={16} color="var(--ink-3)" />
          </div>
        ))}
        <div style={{ marginTop: 6, padding: '14px 16px', borderRadius: 18, background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="shield" size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: '-0.005em' }}>spots are curated by hey</div>
            <div className="meta" style={{ fontSize: 11, marginTop: 1, lineHeight: 1.35 }}>can't see your favorite? send us a note.</div>
          </div>
          <button className="btn soft" style={{ padding: '8px 12px', fontSize: 12 }}>request →</button>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Place detail — who's here, vibe, photos
// ─────────────────────────────────────────────────────────────
function ScreenPlaceDetail({ placeId, onClose, openProfile, doCheckIn, checkinPlace, savedSpots = [], toggleSaveSpot = () => {}, leaveCheckin = () => {} }) {
  const p = PLACES.find(x => x.id === placeId) ?? PLACES[0];
  const isHere = checkinPlace === p.id;
  const saved = savedSpots.includes(p.id);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const people = PEOPLE.filter(per => per.place.id === p.id || per.place.tone === p.tone).slice(0, 6).concat(PEOPLE.slice(0, 6)).slice(0, 8);
  return (
    <div className="screen">
      <div className="screen-scroll">
        {/* Hero */}
        <div style={{ position: 'relative', height: 280, background: `var(--${p.tone})` }}>
          <div className="status-pad" />
          <div style={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', zIndex: 5 }}>
            <CircleBtn icon="back" onClick={onClose} bg="rgba(255,255,255,0.92)" />
            <div style={{ display: 'flex', gap: 8 }}>
              <CircleBtn icon={saved ? 'heartFill' : 'bookmark'} color={saved ? 'var(--coral)' : 'var(--ink)'} onClick={() => toggleSaveSpot(p.id)} bg="rgba(255,255,255,0.92)" />
              <CircleBtn icon="moreH" onClick={() => setMenuOpen(true)} bg="rgba(255,255,255,0.92)" />
            </div>
          </div>

          {/* place glyph */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 96, height: 96, borderRadius: 28, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              <Icon name={p.icon} size={44} />
            </div>
          </div>

          {/* hot/here badges */}
          <div style={{ position: 'absolute', bottom: 14, left: 16, display: 'flex', gap: 6 }}>
            {p.hot && <span className="chip coral" style={{ fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: 0.06 }}>HOT RN</span>}
            <span className="chip" style={{ fontSize: 11 }}>{p.here} people here</span>
            <span className="chip" style={{ fontSize: 11, background: 'rgba(255,255,255,0.92)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="badgeCheck" size={11} color="var(--coral)" /> verified
            </span>
          </div>
        </div>

        <div style={{ padding: '20px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="eyebrow">{p.kind} · {p.dist}</div>
            <div className="h-display h-2" style={{ marginTop: 4, letterSpacing: '-0.035em' }}>{p.label}</div>
            <div style={{ marginTop: 6, fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>{p.vibe}</div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-3)' }}>
              <Icon name="pin" size={13} /> {p.address}
            </div>
          </div>

          {/* Check-in button */}
          {!isHere ? (
            <button onClick={() => doCheckIn(p.id)} className="btn coral lg full">
              <Icon name="pinFill" size={16} color="#fff" /> check in here
            </button>
          ) : (
            <div style={{ background: 'var(--mint)', borderRadius: 18, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={20} color="var(--ink)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>you're checked in</div>
                <div className="meta" style={{ fontSize: 11 }}>auto-out in 1h 47m</div>
              </div>
              <button onClick={() => leaveCheckin()} className="btn soft" style={{ padding: '6px 12px', fontSize: 12 }}>leave</button>
            </div>
          )}

          {/* People here grid — gated by being physically here */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="eyebrow">here right now · {p.here}</div>
              <span className="meta" style={{ fontSize: 10 }}>{isHere ? 'visible to people here' : '🔒 unlock by checking in'}</span>
            </div>

            {isHere ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {people.map((per, i) => (
                  <div key={per.id + i} onClick={() => openProfile(per.id)} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}>
                    <Photo name={per.name + i} label="" />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '24px 8px 6px',
                      background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7))',
                      color: '#fff', fontSize: 11.5, fontWeight: 600,
                      letterSpacing: '-0.005em',
                    }}>
                      {per.name}, {per.age}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Locked state — blurred grid with a center-mounted unlock CTA.
              // Privacy promise: you can only see people if you're also physically here.
              <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, filter: 'blur(14px) saturate(140%)', opacity: 0.55, pointerEvents: 'none' }}>
                  {people.map((per, i) => (
                    <div key={per.id + i} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden' }}>
                      <Photo name={per.name + i} label="" />
                    </div>
                  ))}
                </div>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: 22, textAlign: 'center',
                  background: 'linear-gradient(180deg, rgba(250,247,242,0.4), rgba(250,247,242,0.85))',
                }}>
                  <div style={{ width: 52, height: 52, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.12)', marginBottom: 10 }}>
                    <Icon name="shield" size={24} color="var(--coral)" />
                  </div>
                  <div className="h-display" style={{ fontSize: 22, lineHeight: 1.1, letterSpacing: '-0.025em', maxWidth: 240 }}>
                    {p.here} people are here.
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4, maxWidth: 260 }}>
                    you can only see who when you're <b>actually at {p.label}</b>. tap to check in if you're within 100m.
                  </div>
                  <button onClick={() => doCheckIn(p.id)} className="btn coral" style={{ marginTop: 14, padding: '12px 22px' }}>
                    <Icon name="pinFill" size={14} color="#fff" /> check in to unlock
                  </button>
                  <div className="meta" style={{ marginTop: 10, fontSize: 10, letterSpacing: 0.06 }}>YOUR LOCATION VERIFIED VIA GPS · NEVER SHARED</div>
                </div>
              </div>
            )}
          </div>

          {/* Vibe metadata */}
          <div className="card">
            <div className="eyebrow">tonight's vibe</div>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 12, columnGap: 16 }}>
              <Basic label="crowd" value="20s & 30s" />
              <Basic label="loudness" value="🔊 medium-high" />
              <Basic label="wait" value="~10 min" />
              <Basic label="closes" value="2:00 am" />
            </div>
          </div>

          {/* Other places nearby */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>also nearby</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {PLACES.filter(x => x.id !== p.id).slice(0, 4).map(other => (
                <div key={other.id} style={{ flexShrink: 0, width: 140 }}>
                  <div style={{ aspectRatio: '1', borderRadius: 14, background: `var(--${other.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, position: 'relative' }}>
                    <Icon name={other.icon} size={32} />
                    <div style={{ position: 'absolute', bottom: 6, right: 6, background: '#fff', borderRadius: 999, padding: '2px 7px', fontSize: 10, fontWeight: 600 }}>{other.here}</div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: '-0.005em' }}>{other.label}</div>
                  <div className="meta" style={{ fontSize: 10.5 }}>{other.kind} · {other.dist}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 20 }} />
        </div>
      </div>

      {menuOpen && (
        <PlaceActionMenu place={p} saved={saved} isHere={isHere} onClose={() => setMenuOpen(false)} onToggleSave={() => { toggleSaveSpot(p.id); setMenuOpen(false); }} onLeave={() => { leaveCheckin(); setMenuOpen(false); }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Spot action sheet (3-dots)
// ─────────────────────────────────────────────────────────────
function PlaceActionMenu({ place, saved, isHere, onClose, onToggleSave, onLeave }) {
  const actions = [
    { icon: saved ? 'heartFill' : 'bookmark', label: saved ? 'unsave spot' : 'save to my list', onClick: onToggleSave, tone: 'rose' },
    { icon: 'send', label: 'share spot', onClick: onClose, tone: 'sky' },
    { icon: 'arrowRight', label: 'get directions', onClick: onClose, tone: 'mint' },
    { icon: 'bell', label: 'notify me when busy', onClick: onClose, tone: 'butter' },
    ...(isHere ? [{ icon: 'pinFill', label: 'leave spot', onClick: onLeave, tone: 'peach' }] : []),
    { icon: 'shield', label: 'report spot', onClick: onClose, tone: 'peach', danger: true },
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
        <div className="h-display" style={{ fontSize: 19, letterSpacing: '-0.02em' }}>{place.label}</div>
        <div className="meta" style={{ fontSize: 11.5, marginTop: 2 }}>{place.kind} · {place.dist}</div>

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
              <div style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: a.danger ? 'var(--coral)' : 'var(--ink)' }}>{a.label}</div>
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
// Check-in success toast (mini moment)
// ─────────────────────────────────────────────────────────────
function CheckinToast({ placeId, onClose }) {
  const p = PLACES.find(x => x.id === placeId) ?? PLACES[0];
  React.useEffect(() => {
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="float-up" style={{
      position: 'absolute', top: 80, left: 16, right: 16,
      background: 'var(--ink)', color: '#fff',
      borderRadius: 18, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      zIndex: 95,
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 999, background: `var(--${p.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={p.icon} size={18} color="var(--ink)" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>checked in at {p.label}</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>{p.here} people can see you for 2hrs</div>
      </div>
      <button onClick={onClose} style={{ background: 'transparent', border: 0, color: '#fff', cursor: 'pointer', padding: 4 }}>
        <Icon name="x" size={16} color="#fff" />
      </button>
    </div>
  );
}

Object.assign(window, { ScreenPlaces, ScreenPlaceDetail, CheckinToast, MapCanvas, PlacePin });
