// screens-events.jsx — Events list, Event detail, RSVP flow
// Sits inside the Places tab via a top segmented control. Same check-in/here-now
// model as Places, but events are time-boxed and ticketed.

// ─────────────────────────────────────────────────────────────
// Events list — chips for day filters, scroll list of event cards
// ─────────────────────────────────────────────────────────────
function EventsList({ openEvent, savedEvents, toggleSave }) {
  const [day, setDay] = React.useState('all');
  const [country, setCountry] = React.useState('us-nyc');
  const dayChips = ['all', 'tonight', 'this week', 'free', 'saved'];

  const COUNTRIES = [
    { id: 'us-nyc', flag: '🇺🇸', label: 'NYC' },
    { id: 'us-la', flag: '🇺🇸', label: 'LA' },
    { id: 'us-sf', flag: '🇺🇸', label: 'SF' },
    { id: 'uk-ldn', flag: '🇬🇧', label: 'London' },
    { id: 'in-bom', flag: '🇮🇳', label: 'Mumbai' },
    { id: 'in-blr', flag: '🇮🇳', label: 'Bangalore' },
    { id: 'sg', flag: '🇸🇬', label: 'Singapore' },
    { id: 'jp-tyo', flag: '🇯🇵', label: 'Tokyo' },
  ];
  const sel = COUNTRIES.find(c => c.id === country) ?? COUNTRIES[0];
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const filtered = EVENTS.filter(e => {
    if (day === 'tonight') return e.whenShort === 'thu' || e.whenShort === 'fri';
    if (day === 'this week') return true;
    if (day === 'free') return e.cover === 'free' || e.cover === 'donate';
    if (day === 'saved') return savedEvents.includes(e.id);
    return true;
  });

  return (
    <div className="screen-scroll" style={{ padding: '0 16px 16px' }}>
      {/* Country / city picker — events are city-bound, country-grouped */}
      <button onClick={() => setPickerOpen(!pickerOpen)} className="card" style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', marginBottom: 12, cursor: 'pointer',
      }}>
        <span style={{ fontSize: 22 }}>{sel.flag}</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div className="eyebrow" style={{ fontSize: 9.5 }}>showing events in</div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.005em' }}>{sel.label}</div>
        </div>
        <Icon name={pickerOpen ? 'arrowDown' : 'chevronDown'} size={16} color="var(--ink-3)" />
      </button>

      {pickerOpen && (
        <div style={{ marginBottom: 14, padding: 8, background: 'var(--card)', borderRadius: 14, border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
          {COUNTRIES.map(c => (
            <button key={c.id} onClick={() => { setCountry(c.id); setPickerOpen(false); }} style={{
              padding: '10px 12px', borderRadius: 10, border: 0,
              background: c.id === country ? 'var(--ink)' : 'transparent',
              color: c.id === country ? '#fff' : 'var(--ink)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              font: 'inherit', fontWeight: 500, fontSize: 13.5,
            }}>
              <span style={{ fontSize: 16 }}>{c.flag}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {dayChips.map(d => (
          <button key={d} className={`chip ${day === d ? 'solid' : ''}`} onClick={() => setDay(d)} style={{ flexShrink: 0 }}>
            {d}
          </button>
        ))}
      </div>

      {/* hot tonight strip */}
      {day === 'all' && (
        <div style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>hot tonight</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {EVENTS.filter(e => e.hot).map(e => (
              <div key={e.id} onClick={() => openEvent(e.id)} style={{ flexShrink: 0, width: 220, borderRadius: 18, overflow: 'hidden', position: 'relative', aspectRatio: '4/5', cursor: 'pointer', background: `var(--${e.tone})` }}>
                <EventArt event={e} hideGlyph />
                <div style={{ position: 'absolute', inset: 0, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: '6px 9px', textAlign: 'center', fontFamily: 'var(--display)', fontWeight: 700, lineHeight: 0.95 }}>
                      <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: 0.1, textTransform: 'uppercase' }}>{e.whenShort}</div>
                      <div style={{ fontSize: 16, letterSpacing: '-0.02em' }}>{e.when.split('·')[1].trim().replace(' pm', '').replace(' am', '')}</div>
                    </div>
                    <button onClick={(ev) => { ev.stopPropagation(); toggleSave(e.id); }} style={{
                      width: 32, height: 32, borderRadius: 999, background: 'rgba(255,255,255,0.92)', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                      <Icon name={savedEvents.includes(e.id) ? 'heartFill' : 'heart'} size={14} color={savedEvents.includes(e.id) ? 'var(--coral)' : 'var(--ink)'} />
                    </button>
                  </div>
                  <div>
                    <div className="h-display" style={{ fontSize: 22, lineHeight: 1.05, letterSpacing: '-0.025em' }}>{e.title}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-2)' }}>{e.matchesGoing} matches · {e.going} going</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* upcoming list */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>{day === 'all' ? 'this week' : day}</div>

      {filtered.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
          nothing here yet.{day === 'saved' ? ' tap the ♡ on an event to save it.' : ''}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(e => (
            <div key={e.id} onClick={() => openEvent(e.id)} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', padding: 12 }}>
              <div style={{ width: 78, height: 78, borderRadius: 14, background: `var(--${e.tone})`, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                <EventArt event={e} mini />
                <div style={{ position: 'absolute', bottom: 4, left: 4, background: '#fff', borderRadius: 8, padding: '3px 6px', textAlign: 'center', fontFamily: 'var(--display)', fontWeight: 700, lineHeight: 0.95 }}>
                  <div style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: 0.06, textTransform: 'uppercase' }}>{e.whenShort}</div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>{e.title}</div>
                  {e.hot && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--coral)', fontWeight: 700, letterSpacing: 0.08 }}>HOT</span>}
                </div>
                <div style={{ marginTop: 2, fontSize: 12.5, color: 'var(--ink-3)' }}>{e.when} · {e.cover}</div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex' }}>
                    {Array.from({ length: Math.min(3, e.matchesGoing) }, (_, i) => (
                      <div key={i} style={{ marginLeft: i === 0 ? 0 : -7 }}>
                        <Avatar name={e.id + i} size={20} />
                      </div>
                    ))}
                  </div>
                  <span className="meta" style={{ fontSize: 11 }}>
                    {e.matchesGoing > 0 && <b style={{ color: 'var(--coral)' }}>{e.matchesGoing} matches</b>}
                    {e.matchesGoing > 0 && ' · '}
                    {e.going} going
                  </span>
                </div>
              </div>
              <Icon name="chevron" size={16} color="var(--ink-3)" />
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 12 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EventArt — abstract pastel "poster" art for an event
// ─────────────────────────────────────────────────────────────
function EventArt({ event, mini = false, hideGlyph = false }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '20%', left: '-20%',
        width: '120%', height: '60%',
        background: `var(--${event.tone}-deep)`, opacity: 0.7,
        borderRadius: '50%',
        transform: 'rotate(-12deg)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-30%', right: '-20%',
        width: '90%', height: '80%',
        background: `var(--${event.tone}-deep)`, opacity: 0.5,
        borderRadius: '50%',
      }} />
      {!mini && !hideGlyph && (
        <div style={{
          position: 'absolute', top: '14%', right: '14%',
          width: 38, height: 38, borderRadius: 999,
          background: 'rgba(255,255,255,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={event.icon} size={18} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Event detail screen
// ─────────────────────────────────────────────────────────────
function ScreenEventDetail({ eventId, onClose, openProfile, savedEvents, toggleSave, rsvpd, toggleRsvp }) {
  const e = EVENTS.find(x => x.id === eventId) ?? EVENTS[0];
  const saved = savedEvents.includes(e.id);
  const isRsvpd = rsvpd.includes(e.id);
  const isToday = e.whenShort === 'thu' || e.whenShort === 'fri';
  const [menuOpen, setMenuOpen] = React.useState(false);
  // who's going — first slice = matches, rest = randos
  const goingPeople = PEOPLE.slice(0, Math.min(e.matchesGoing, PEOPLE.length))
    .concat(PEOPLE.slice(0).reverse()).slice(0, 8);

  return (
    <div className="screen">
      <div className="screen-scroll">
        {/* Hero with art */}
        <div style={{ position: 'relative', height: 340, background: `var(--${e.tone})`, overflow: 'hidden' }}>
          <EventArt event={e} hideGlyph />
          <div className="status-pad" />
          <div style={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', zIndex: 5 }}>
            <CircleBtn icon="back" onClick={onClose} bg="rgba(255,255,255,0.92)" />
            <div style={{ display: 'flex', gap: 8 }}>
              <CircleBtn icon={saved ? 'heartFill' : 'heart'} color={saved ? 'var(--coral)' : 'var(--ink)'} onClick={() => toggleSave(e.id)} bg="rgba(255,255,255,0.92)" />
              <CircleBtn icon="moreH" onClick={() => setMenuOpen(true)} bg="rgba(255,255,255,0.92)" />
            </div>
          </div>

          {/* hero text */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 22px 22px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div className="eyebrow">{e.host} · {e.cover}</div>
              <div className="h-display" style={{ fontSize: 36, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 6 }}>{e.title}</div>
            </div>
            <div style={{
              background: '#fff', borderRadius: 14, padding: '8px 11px', textAlign: 'center',
              fontFamily: 'var(--display)', fontWeight: 700, lineHeight: 0.95,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: 0.1, textTransform: 'uppercase' }}>{e.whenShort}</div>
              <div style={{ fontSize: 22, letterSpacing: '-0.02em' }}>{e.when.split('·')[1].trim().replace(' pm', '').replace(' am', '')}</div>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--mono)' }}>{e.when.includes('pm') ? 'PM' : 'AM'}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '18px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* meta */}
          <div style={{ display: 'flex', gap: 10 }}>
            <MetaBlock icon="clock" label="when" value={e.door} />
            <MetaBlock icon="pin" label="where" value={e.where} />
          </div>

          {/* vibe */}
          <div className="card" style={{ background: `var(--${e.tone})`, border: 'none' }}>
            <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>the vibe</div>
            <div className="h-display" style={{ marginTop: 6, fontSize: 22, lineHeight: 1.2, letterSpacing: '-0.02em' }}>{e.vibe}</div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {e.tags.map(t => (
                <span key={t} style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Going CTA */}
          {!isRsvpd ? (
            <button onClick={() => toggleRsvp(e.id)} className="btn coral lg full">
              <Icon name="check" size={16} color="#fff" /> i'm going
            </button>
          ) : (
            <div style={{ background: 'var(--mint)', borderRadius: 18, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={20} color="var(--ink)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>you're going</div>
                <div className="meta" style={{ fontSize: 11 }}>others can see you. cancel anytime.</div>
              </div>
              <button onClick={() => toggleRsvp(e.id)} className="btn soft" style={{ padding: '6px 12px', fontSize: 12 }}>cancel</button>
            </div>
          )}

          {/* "i'm here" — only when day-of */}
          {isToday && isRsvpd && (
            <button className="btn full" style={{ background: 'var(--ink)', color: '#fff' }}>
              <Icon name="pinFill" size={14} color="#fff" /> i'm here · check in to event
            </button>
          )}

          {/* matches going */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="eyebrow">going · {e.going}</div>
              {e.matchesGoing > 0 && (
                <span className="meta" style={{ fontSize: 10, color: 'var(--coral)' }}>{e.matchesGoing} are matches/likes</span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {goingPeople.slice(0, 8).map((p, i) => (
                <div key={p.id + i} onClick={() => openProfile(p.id)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden' }}>
                    <Photo name={p.name + i} label="" />
                    {i < e.matchesGoing && (
                      <div style={{ position: 'absolute', top: 4, right: 4, background: 'var(--coral)', color: '#fff', borderRadius: 999, padding: '2px 5px', fontSize: 9, fontWeight: 700, fontFamily: 'var(--mono)' }}>♥</div>
                    )}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <button onClick={() => openProfile(goingPeople[0].id)} className="btn soft" style={{ fontSize: 12.5, padding: '8px 14px' }}>see all {e.going} →</button>
            </div>
          </div>

          {/* "you'll meet people who" */}
          <div className="card">
            <div className="eyebrow">based on who's going</div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['mostly 24–30', '63% verified', 'into music', 'arrive ~11pm', 'leaves ~2am'].map((t, i) => (
                <span key={t} className={`chip ${['peach','mint','sky','butter','lilac'][i % 5]}`} style={{ fontSize: 11.5 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* host card */}
          <EventHostRow event={e} />

          <div style={{ height: 12 }} />
        </div>
      </div>

      {menuOpen && (
        <EventActionMenu event={e} saved={saved} isRsvpd={isRsvpd} onClose={() => setMenuOpen(false)} onToggleSave={() => { toggleSave(e.id); setMenuOpen(false); }} onToggleRsvp={() => { toggleRsvp(e.id); setMenuOpen(false); }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Event action sheet (3-dots)
// ─────────────────────────────────────────────────────────────
function EventActionMenu({ event, saved, isRsvpd, onClose, onToggleSave, onToggleRsvp }) {
  const actions = [
    { icon: saved ? 'heartFill' : 'heart', label: saved ? 'remove from favourites' : 'add to favourites', onClick: onToggleSave, tone: 'rose' },
    { icon: 'send', label: 'share event', onClick: onClose, tone: 'sky' },
    { icon: 'arrowRight', label: 'get directions', onClick: onClose, tone: 'mint' },
    { icon: 'bell', label: 'remind me 2hr before', onClick: onClose, tone: 'butter' },
    { icon: 'bookmark', label: 'add to calendar', onClick: onClose, tone: 'lilac' },
    ...(isRsvpd ? [{ icon: 'x', label: 'cancel going', onClick: onToggleRsvp, tone: 'peach' }] : []),
    { icon: 'shield', label: 'report event', onClick: onClose, tone: 'peach', danger: true },
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
        <div className="h-display" style={{ fontSize: 19, letterSpacing: '-0.02em' }}>{event.title}</div>
        <div className="meta" style={{ fontSize: 11.5, marginTop: 2 }}>{event.when} · {event.host}</div>

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

function EventHostRow({ event }) {
  const [following, setFollowing] = React.useState(false);
  return (
    <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `var(--${event.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={event.icon} size={22} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="eyebrow">hosted by</div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{event.host}</div>
      </div>
      <button onClick={() => setFollowing(!following)} className={following ? 'btn soft' : 'btn coral'} style={{ padding: '8px 14px', fontSize: 12.5 }}>
        {following ? 'following' : 'follow'}
      </button>
    </div>
  );
}

function MetaBlock({ icon, label, value }) {
  return (
    <div className="card" style={{ flex: 1, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={15} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ fontSize: 9 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 1, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      </div>
    </div>
  );
}

Object.assign(window, { EventsList, EventArt, ScreenEventDetail });
