// screens-discover.jsx — Browse feed (3 variants), Profile detail, Like+comment, Match moment

// ─────────────────────────────────────────────────────────────
// Top bar used across main tabs — brand on left, filters on right
// ─────────────────────────────────────────────────────────────
function TopBar({ title, right, sub }) {
  return (
    <div style={{ padding: '4px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div className="h-display" style={{ fontSize: 28, letterSpacing: '-0.035em' }}>{title}</div>
        {sub && <div className="meta" style={{ marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>{right}</div>
    </div>
  );
}

function CircleBtn({ icon, onClick, badge, color = 'var(--ink)', bg = 'var(--card)' }) {
  return (
    <button onClick={onClick} style={{
      width: 42, height: 42, borderRadius: 999,
      background: bg, border: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', position: 'relative',
    }}>
      <Icon name={icon} size={20} color={color} />
      {badge && <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 999, background: 'var(--coral)' }} />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// PhotoCarousel — swipe/tap through a deck of photos
// Tap left/right edges to advance; drag horizontally to swipe.
// Reports the currently-visible photo index up so anchored likes
// know which photo the user was looking at when they tapped ♥.
// ─────────────────────────────────────────────────────────────
function PhotoCarousel({ photos, name, photoIdx, setPhotoIdx, onOpen, onLike, height }) {
  const ref = React.useRef(null);
  const [drag, setDrag] = React.useState(null);
  const n = photos.length;

  const advance = (d) => {
    const next = Math.max(0, Math.min(n - 1, photoIdx + d));
    setPhotoIdx(next);
  };

  const onPointerDown = (e) => {
    setDrag({ x0: e.clientX, dx: 0, t0: Date.now() });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag) return;
    setDrag({ ...drag, dx: e.clientX - drag.x0 });
  };
  const onPointerUp = () => {
    if (!drag) return;
    const { dx, t0 } = drag;
    const dt = Date.now() - t0;
    const fast = Math.abs(dx) > 60 || (dt < 250 && Math.abs(dx) > 30);
    if (fast) advance(dx < 0 ? 1 : -1);
    setDrag(null);
  };

  const w = ref.current?.offsetWidth || 1;
  const offset = drag ? Math.max(-w * 0.3, Math.min(w * 0.3, drag.dx)) : 0;

  return (
    <div ref={ref} style={{ position: 'relative', height: height || '100%', overflow: 'hidden', userSelect: 'none', touchAction: 'pan-y' }}
         onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)}>

      {/* photo deck — render current + neighbors */}
      {photos.map((ph, i) => {
        const dist = i - photoIdx;
        if (Math.abs(dist) > 1) return null;
        return (
          <div key={ph.id} style={{
            position: 'absolute', inset: 0,
            transform: `translateX(calc(${dist * 100}% + ${offset}px))`,
            transition: drag ? 'none' : 'transform 260ms cubic-bezier(.3,.7,.4,1)',
          }}>
            <Photo name={ph.seed || (name + i)} label="" />
          </div>
        );
      })}

      {/* tap zones — left/right thirds advance, middle opens profile */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        <div onClick={(e) => { e.stopPropagation(); advance(-1); }} style={{ flex: 1, cursor: 'pointer' }} />
        <div onClick={(e) => { e.stopPropagation(); onOpen && onOpen(); }} style={{ flex: 1.4, cursor: onOpen ? 'pointer' : 'default' }} />
        <div onClick={(e) => { e.stopPropagation(); advance(1); }} style={{ flex: 1, cursor: 'pointer' }} />
      </div>

      {/* dot indicators at top */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 4, zIndex: 2 }}>
        {photos.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'background 200ms' }} />
        ))}
      </div>

      {/* "♥ pinned a comment" badge — shows when on a photo with an anchored comment */}
      {photos[photoIdx]?.pinnedComment && (
        <div style={{
          position: 'absolute', top: 28, right: 12,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px)',
          color: '#fff', fontSize: 10, fontFamily: 'var(--mono)',
          padding: '3px 7px', borderRadius: 999, letterSpacing: 0.05,
          zIndex: 2,
        }}>
          ♥ has a comment
        </div>
      )}

      {/* heart button — like + comment on THIS photo (same as prompt cards) */}
      {onLike && (
        <button onClick={(e) => { e.stopPropagation(); onLike(photoIdx); }} style={{
          position: 'absolute', bottom: 14, right: 14, zIndex: 4,
          width: 48, height: 48, borderRadius: 999,
          background: '#fff', border: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
        }}>
          <Icon name="heartFill" size={20} color="var(--coral)" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Browse — Swipe variant (cards stack with photo carousel)
// ─────────────────────────────────────────────────────────────
function BrowseSwipe({ density, onTap, onLike, onPass, openSheet }) {
  const [idx, setIdx] = React.useState(0);
  // photoIdx per person — drag-resets each time the stack advances
  const [photoIdxMap, setPhotoIdxMap] = React.useState({});
  const cardH = density === 'compact' ? 380 : 460;
  const stack = PEOPLE.slice(idx, idx + 3);
  const dec = () => { setIdx((idx + 1) % PEOPLE.length); setPhotoIdxMap({}); };

  return (
    <div style={{ padding: '4px 20px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: cardH, marginBottom: 14 }}>
        {stack.slice().reverse().map((p, ri) => {
          const i = stack.length - 1 - ri;
          const offset = i;
          const isTop = i === 0;
          const photoIdx = photoIdxMap[p.id] || 0;
          const setPhotoIdx = (n) => setPhotoIdxMap({ ...photoIdxMap, [p.id]: n });
          return (
            <div key={p.id + idx} style={{
              position: 'absolute',
              top: offset * 10, left: offset * 4, right: offset * 4,
              bottom: -offset * 6,
              borderRadius: 24, overflow: 'hidden',
              background: 'var(--card)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
              zIndex: 10 - i,
              transform: `scale(${1 - i * 0.04})`,
              opacity: isTop ? 1 : 0.9,
              transition: 'transform 200ms, top 200ms',
            }}>
              {isTop ? (
                <PhotoCarousel photos={p.photos} name={p.name} photoIdx={photoIdx} setPhotoIdx={setPhotoIdx} onOpen={() => onTap(p.id)} />
              ) : (
                <Photo name={p.name + (photoIdxMap[p.id] || 0)} label="" />
              )}

              {/* place check-in pill */}
              <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6, alignItems: 'center', pointerEvents: 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
                  borderRadius: 999, padding: '6px 11px 6px 8px',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12.5, fontWeight: 600,
                  marginTop: 18,
                }}>
                  <Icon name="pinFill" size={13} color="var(--coral)" />
                  at {p.place.label}
                </div>
              </div>
              <div style={{ position: 'absolute', top: 14, right: 14, pointerEvents: 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
                  borderRadius: 999, padding: '5px 10px',
                  fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--mono)',
                  letterSpacing: 0.06,
                  marginTop: 18,
                }}>{p.distance}</div>
              </div>

              {/* bottom info — name/age tap opens full profile.
                  We render a dedicated tap target so users don't have to
                  hit the middle carousel zone to open the profile. */}
              <div onClick={(e) => { if (isTop) { e.stopPropagation(); onTap(p.id); } }} style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '60px 18px 16px',
                background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.6))',
                color: '#fff', cursor: isTop ? 'pointer' : 'default',
                zIndex: 3,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div className="h-display" style={{ color: '#fff', fontSize: 30, letterSpacing: '-0.03em' }}>{p.name}, {p.age}</div>
                  {p.verified && <Icon name="badgeCheck" size={18} color="#fff" />}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85, lineHeight: 1.35 }}>{p.job}</div>
                {isTop && (
                  <div style={{ marginTop: 6, fontSize: 11, opacity: 0.75, fontFamily: 'var(--mono)', letterSpacing: 0.06 }}>
                    PHOTO {photoIdx + 1} / {p.photos.length} · swipe ←→
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* swipe actions — reject · like · rewind */}
      <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 12 }}>
        <ActionFab icon="x" size={58} onClick={() => { onPass(stack[0].id); dec(); }} color="var(--ink-2)" />
        <ActionFab icon="heartFill" size={72} onClick={() => onLike(stack[0].id, { kind: 'photo', photoIdx: photoIdxMap[stack[0].id] || 0 })} color="#fff" tone="var(--coral)" />
        <ActionFab icon="refresh" size={58} onClick={dec} color="var(--ink-2)" />
      </div>
    </div>
  );
}

function ActionFab({ icon, size = 54, onClick, color = 'var(--ink)', tone = 'var(--card)' }) {
  const iconSize = Math.round(size * 0.42);
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: 999,
      background: tone, border: tone === 'var(--card)' ? '1px solid var(--line)' : 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 6px 18px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <Icon name={icon} size={iconSize} color={color} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Browse — Scroll variant (vertical feed, Hinge-style)
// ─────────────────────────────────────────────────────────────
function BrowseScroll({ density, onTap, onLike, openSheet }) {
  const gap = density === 'compact' ? 12 : 18;
  return (
    <div className="screen-scroll" style={{ padding: `4px 18px ${gap}px` }}>
      {PEOPLE.map((p, i) => {
        const promptIdx = i % p.prompts.length;
        const isPromptCard = i % 3 === 1;
        return (
          <div key={p.id} style={{ marginBottom: gap, background: 'var(--card)', borderRadius: 22, overflow: 'hidden', border: '1px solid var(--line)' }}>
            {/* header */}
            <div onClick={() => onTap(p.id)} style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <Avatar name={p.name} size={42} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>{p.name}, {p.age}</div>
                  {p.verified && <Icon name="badgeCheck" size={14} color="var(--coral)" />}
                </div>
                <div className="meta" style={{ marginTop: 1, fontSize: 11.5 }}>
                  <Icon name="pin" size={11} color="var(--ink-3)" /> at {p.place.label} · {p.distance}
                </div>
              </div>
              <CircleBtn icon="moreH" onClick={() => openSheet && openSheet({ kind: 'report-profile', id: p.id })} />
            </div>

            {isPromptCard ? (
              <div onClick={() => onTap(p.id)} style={{ margin: '4px 14px 14px', padding: '18px 18px 18px', borderRadius: 18, background: `var(--${['peach','mint','sky','butter','lilac','rose'][i % 6]})`, cursor: 'pointer' }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>{p.prompts[promptIdx].q}</div>
                <div className="h-display" style={{ fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{p.prompts[promptIdx].a}</div>
              </div>
            ) : (
              <div onClick={() => onTap(p.id)} style={{ position: 'relative', cursor: 'pointer' }}>
                <div style={{ aspectRatio: '1', position: 'relative' }}>
                  <Photo name={p.name} label="" />
                </div>
              </div>
            )}

            {/* like button strip */}
            <div style={{ padding: '0 14px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', flex: 1, paddingRight: 12 }}>
                {isPromptCard ? '"' + p.bio.slice(0, 60) + (p.bio.length > 60 ? '…' : '') + '"' : (p.interests || p.tags).slice(0, 3).map(t => `· ${t}`).join(' ')}
              </div>
              <button onClick={(e) => { e.stopPropagation(); onLike(p.id); }} style={{
                width: 44, height: 44, borderRadius: 999,
                background: 'var(--coral)', border: 0, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255,90,95,0.32)',
              }}>
                <Icon name="heartFill" size={20} color="#fff" />
              </button>
            </div>
          </div>
        );
      })}
      <div style={{ textAlign: 'center', padding: '24px 0 40px', color: 'var(--ink-3)', fontSize: 13 }}>
        that's everyone in your radius today.<br />
        <span style={{ color: 'var(--coral)', fontWeight: 600 }}>open Places →</span> to find more.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Browse — Grid variant
// ─────────────────────────────────────────────────────────────
function BrowseGrid({ density, onTap, onLike }) {
  const cols = density === 'compact' ? 3 : 2;
  return (
    <div className="screen-scroll" style={{ padding: '0 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
        {PEOPLE.concat(PEOPLE).slice(0, cols === 3 ? 9 : 8).map((p, i) => (
          <div key={i} onClick={() => onTap(p.id)} style={{ position: 'relative', aspectRatio: cols === 3 ? '3/4' : '3/4.2', borderRadius: 18, overflow: 'hidden', cursor: 'pointer' }}>
            <Photo name={p.name + i} label="" />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: cols === 3 ? '20px 8px 8px' : '40px 12px 10px',
              background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7))',
              color: '#fff',
            }}>
              <div style={{ fontWeight: 700, fontSize: cols === 3 ? 13 : 16, letterSpacing: '-0.01em', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span>{p.name}, {p.age}</span>
                {p.verified && cols !== 3 && <Icon name="badgeCheck" size={12} color="#fff" />}
              </div>
              {cols === 2 && (
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="pin" size={10} color="#fff" />
                  {p.place.label}
                </div>
              )}
            </div>
            {p.place.id === 'attaboy' && (
              <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--coral)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 6px', borderRadius: 999, letterSpacing: 0.06 }}>HOT</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ height: 30 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Discover screen — wraps the three variants + header
// ─────────────────────────────────────────────────────────────
function ScreenDiscover({ browseStyle, density, openProfile, openLike, openFilters, openSheet }) {
  const variantLabel = { swipe: 'stack', scroll: 'feed', grid: 'grid' }[browseStyle] || browseStyle;
  return (
    <>
      <div className="status-pad" />
      <TopBar
        title="discover"
        sub={`${PEOPLE.length} nearby · ${variantLabel} view`}
        right={
          <CircleBtn icon="filter" onClick={openFilters} />
        }
      />
        {browseStyle === 'swipe' && <BrowseSwipe density={density} onTap={openProfile} onLike={openLike} openSheet={openSheet} onPass={() => {}} />}
      {browseStyle === 'scroll' && <BrowseScroll density={density} onTap={openProfile} onLike={openLike} openSheet={openSheet} />}
      {browseStyle === 'grid' && <BrowseGrid density={density} onTap={openProfile} onLike={openLike} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Profile detail — full scrollable profile (hero is a carousel)
// ─────────────────────────────────────────────────────────────
function ScreenProfile({ personId, onClose, onLike, openSheet }) {
  const p = PEOPLE.find(x => x.id === personId) ?? PEOPLE[0];
  const [photoIdx, setPhotoIdx] = React.useState(0);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  return (
    <div className="screen">
      <div className="screen-scroll">
        {/* Big photo carousel with overlay info */}
        <div style={{ position: 'relative', height: 460 }}>
          <PhotoCarousel photos={p.photos} name={p.name} photoIdx={photoIdx} setPhotoIdx={setPhotoIdx} />

          <div className="status-pad" style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' }} />

          {/* top controls */}
          <div style={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', zIndex: 5 }}>
            <CircleBtn icon="back" onClick={onClose} bg="rgba(255,255,255,0.92)" />
          </div>

          {/* hero info — pointerEvents none so carousel taps pass through */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '120px 22px 22px',
            background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.65))',
            color: '#fff', pointerEvents: 'none', zIndex: 3,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{
                background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)',
                borderRadius: 999, padding: '5px 10px 5px 8px',
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600,
              }}>
                <Icon name="pinFill" size={12} color="var(--coral)" />
                at {p.place.label}
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)',
                borderRadius: 999, padding: '5px 10px',
                fontSize: 11.5, fontFamily: 'var(--mono)', letterSpacing: 0.06,
              }}>{p.distance}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div className="h-display" style={{ color: '#fff', fontSize: 38, letterSpacing: '-0.035em' }}>{p.name}, {p.age}</div>
              {p.verified && <Icon name="badgeCheck" size={22} color="#fff" />}
            </div>
            <div style={{ marginTop: 6, fontSize: 14.5, opacity: 0.9, lineHeight: 1.4 }}>{p.job}</div>
          </div>
        </div>

        {/* Body cards */}
        <div style={{ padding: '18px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* basics */}
          <div className="card">
            <div className="eyebrow">basics</div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: 'pronouns', value: p.pronouns },
                { label: 'height', value: p.height },
                { label: 'here for', value: p.here4 },
                { label: 'school', value: p.school },
                { label: 'job', value: p.job },
                { label: '♈ sign', value: p.starSign },
                { label: 'drinks', value: p.drinks },
                { label: 'smokes', value: p.smokes },
                { label: 'gym', value: p.exercise },
                { label: 'kids', value: p.kids },
              ].filter(b => b.value).map((b, i) => (
                <span key={b.label} className={`chip ${['peach','mint','sky','butter','lilac','rose'][i % 6]}`} style={{ fontSize: 12.5 }}>
                  <span style={{ opacity: 0.55, marginRight: 5, fontSize: 11 }}>{b.label}</span>{b.value}
                </span>
              ))}
            </div>
          </div>

          {/* bio */}
          <div className="card" style={{ background: 'var(--peach)', border: 'none' }}>
            <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>their bio</div>
            <div className="h-display" style={{ marginTop: 6, fontSize: 22, lineHeight: 1.25, letterSpacing: '-0.02em' }}>"{p.bio}"</div>
          </div>

          {/* photo #2 */}
          <div style={{ aspectRatio: '4/5', borderRadius: 22, overflow: 'hidden', position: 'relative' }}>
            <Photo name={p.name + '2'} label="" />
            <button onClick={() => onLike(p.id, { kind: 'photo', photoIdx: 1 })} style={{
              position: 'absolute', bottom: 14, right: 14,
              width: 48, height: 48, borderRadius: 999,
              background: '#fff', border: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
            }}>
              <Icon name="heartFill" size={20} color="var(--coral)" />
            </button>
          </div>

          {/* prompt 1 */}
          <PromptCard q={p.prompts[0].q} a={p.prompts[0].a} tone="mint" personId={p.id} prompt={0} onLike={onLike} />

          {/* interests */}
          <div className="card">
            <div className="eyebrow">into</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(p.interests || p.tags).map((t, i) => (
                <span key={t} className={`chip ${['peach','mint','sky','butter','lilac'][i % 5]}`}>{t}</span>
              ))}
            </div>
          </div>

          {/* photo #3 */}
          <div style={{ aspectRatio: '4/5', borderRadius: 22, overflow: 'hidden', position: 'relative' }}>
            <Photo name={p.name + '3'} label="" />
            <button onClick={() => onLike(p.id, { kind: 'photo', photoIdx: 2 })} style={{
              position: 'absolute', bottom: 14, right: 14,
              width: 48, height: 48, borderRadius: 999,
              background: '#fff', border: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
            }}>
              <Icon name="heartFill" size={20} color="var(--coral)" />
            </button>
          </div>

          {/* prompt 2 */}
          <PromptCard q={p.prompts[1].q} a={p.prompts[1].a} tone="lilac" personId={p.id} prompt={1} onLike={onLike} />

          {/* prompt 3 */}
          <PromptCard q={p.prompts[2].q} a={p.prompts[2].a} tone="butter" personId={p.id} prompt={2} onLike={onLike} />

          {/* report */}
          <div style={{ marginTop: 8, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => openSheet && openSheet({ kind: 'report-profile', id: p.id })} className="btn soft" style={{ alignSelf: 'center', fontSize: 13 }}>
              <Icon name="shield" size={14} /> report {p.name}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 16px 24px',
        background: 'linear-gradient(180deg, transparent, var(--bg) 24%)',
        display: 'flex', gap: 10, justifyContent: 'center',
      }}>
        <button onClick={onClose} style={{
          flex: 1, height: 56, borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
          fontWeight: 600, fontSize: 15, color: 'var(--ink-2)',
        }}>
          <Icon name="x" size={20} color="var(--ink-2)" /> pass
        </button>
      </div>
    </div>
  );
}

function Basic({ label, value }) {
  return (
    <div>
      <div className="eyebrow" style={{ fontSize: 10 }}>{label}</div>
      <div style={{ fontSize: 14.5, fontWeight: 500, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function PromptCard({ q, a, tone, onLike, personId, prompt }) {
  return (
    <div className="card" style={{ background: `var(--${tone})`, border: 'none', position: 'relative' }}>
      <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>{q}</div>
      <div className="h-display" style={{ marginTop: 6, fontSize: 22, lineHeight: 1.2, letterSpacing: '-0.02em', paddingRight: 50 }}>{a}</div>
      <button onClick={() => onLike(personId, { kind: 'prompt', q, a })} style={{
        position: 'absolute', bottom: 14, right: 14,
        width: 44, height: 44, borderRadius: 999,
        background: '#fff', border: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
      }}>
        <Icon name="heartFill" size={18} color="var(--coral)" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Like with optional comment sheet (modal)
// Two anchor kinds: 'photo' (with photoIdx) and 'prompt' (with q, a)
// ─────────────────────────────────────────────────────────────
function LikeSheet({ personId, anchor, onClose, onSend }) {
  const p = PEOPLE.find(x => x.id === personId) ?? PEOPLE[0];
  const [comment, setComment] = React.useState('');
  const max = 140;
  const isPhoto = anchor?.kind === 'photo';
  const photo = isPhoto ? (p.photos[anchor.photoIdx] || p.photos[0]) : null;
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90,
        animation: 'float-up 200ms both',
      }} />
      <div className="float-up" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 91,
        background: 'var(--bg)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '14px 22px 28px',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.2)',
        maxHeight: '85%', overflowY: 'auto',
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--line-2)', margin: '0 auto 14px' }} />

        {anchor && anchor.kind === 'prompt' && (
          <div className="card" style={{ background: 'var(--butter)', border: 'none', marginBottom: 14 }}>
            <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>you're replying to {p.name}'s</div>
            <div style={{ marginTop: 4, fontSize: 13, fontWeight: 600 }}>{anchor.q}</div>
            <div className="h-display" style={{ marginTop: 4, fontSize: 17, lineHeight: 1.25, letterSpacing: '-0.015em' }}>{anchor.a}</div>
          </div>
        )}

        {isPhoto && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
            <div style={{ width: 64, height: 80, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
              <Photo name={photo.seed || (p.name + anchor.photoIdx)} label="" vignette={false} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="eyebrow">you're commenting on {p.name}'s</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>photo {anchor.photoIdx + 1} of {p.photos.length}</div>
              <div className="meta" style={{ fontSize: 11, marginTop: 1 }}>your note sticks to this photo</div>
            </div>
          </div>
        )}

        <div className="h-display" style={{ fontSize: 22, letterSpacing: '-0.025em' }}>say something to {p.name}.</div>
        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-3)' }}>optional, but 3× more likely to match. don't be a creep.</div>

        <div style={{ marginTop: 14, position: 'relative' }}>
          <textarea
            className="input"
            placeholder={isPhoto ? 'something specific about this photo.' : "something specific. anything but 'hey'."}
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, max))}
            style={{ minHeight: 88, resize: 'none', lineHeight: 1.4 }}
            autoFocus
          />
          <div style={{ position: 'absolute', right: 12, bottom: 10, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            {max - comment.length}
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(isPhoto
            ? ['"this energy"', '"the outfit specifically"', '"wait where is this"']
            : ['"the bar in your bio…"', '"okay but the matcha thing"', '"what\'s the rabbit hole rn?"']
          ).map(s => (
            <button key={s} onClick={() => setComment(s.replace(/"/g, ''))} style={{
              padding: '6px 12px', borderRadius: 999, background: 'var(--card)',
              border: '1px solid var(--line)', cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)',
            }}>{s}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="btn soft" style={{ flex: '0 0 auto', paddingLeft: 22, paddingRight: 22 }} onClick={onClose}>cancel</button>
          <button className="btn coral" style={{ flex: 1 }} onClick={() => onSend(personId, comment, anchor)}>
            {comment ? 'send like with comment' : 'send anyway →'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Match moment — three animation variants
// ─────────────────────────────────────────────────────────────
function MatchMoment({ personId, animation = 'confetti', onChat, onKeep }) {
  const p = PEOPLE.find(x => x.id === personId) ?? PEOPLE[0];
  return (
    <div className="screen" style={{
      background: 'radial-gradient(110% 80% at 50% 30%, var(--rose), var(--peach) 50%, var(--bg) 100%)',
      position: 'absolute', inset: 0, zIndex: 99,
    }}>
      {animation === 'confetti' && <Confetti />}
      {animation === 'hearts'   && <HeartsFloat />}
      {animation === 'paper'    && <PaperFold />}
      {animation === 'minimal'  && null}

      <div className="status-pad" />
      <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'flex-end' }}>
        <CircleBtn icon="x" onClick={onKeep} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 22px', position: 'relative', zIndex: 2 }}>
        <div className="eyebrow pop-in" style={{ color: 'var(--coral)' }}>it's a match · {animation}</div>
        <div className="h-display pop-in" style={{ fontSize: 56, letterSpacing: '-0.045em', marginTop: 6, lineHeight: 0.95 }}>
          okay,<br/>okay.
        </div>
        <div className="pop-in" style={{ marginTop: 14, fontSize: 15, color: 'var(--ink-2)', maxWidth: 280, lineHeight: 1.4, animationDelay: '120ms' }}>
          you and <b style={{ color: 'var(--ink)' }}>{p.name}</b> both said hey. nice taste, both of you.
        </div>

        <div style={{ display: 'flex', gap: 20, marginTop: 32, alignItems: 'center' }}>
          <div className="pop-in" style={{ width: 130, height: 170, borderRadius: 24, overflow: 'hidden', transform: 'rotate(-7deg)' }}>
            <Photo name="you" label="" />
          </div>
          <div className="pop-in" style={{ width: 130, height: 170, borderRadius: 24, overflow: 'hidden', transform: 'rotate(7deg)', animationDelay: '100ms' }}>
            <Photo name={p.name} label="" />
          </div>
        </div>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320 }}>
          <button className="btn coral lg full" onClick={onChat}>
            <Icon name="chat" size={18} color="#fff" /> send a message
          </button>
          <button className="btn ghost full" onClick={onKeep} style={{ fontSize: 14 }}>keep swiping</button>
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ['#FF5A5F', '#F4D784', '#A8D6B0', '#B5CDE5', '#C8B8E0', '#F0A9B5'];
  return (
    <>
      {Array.from({ length: 32 }, (_, i) => {
        const left = (i * 263) % 100;
        const delay = (i * 73) % 600;
        const color = colors[i % colors.length];
        const rotate = (i * 47) % 360;
        return (
          <div key={i} className="confetti" style={{
            top: '20%', left: `${left}%`, background: color,
            transform: `rotate(${rotate}deg)`,
            animation: `confetti-fall 2.2s ${delay}ms cubic-bezier(.3,.7,.4,1) forwards`,
          }} />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-40px) rotate(0); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(120vh) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </>
  );
}

function HeartsFloat() {
  // 24 hearts with varied speed, drift, size, hue — feels denser & livelier.
  // Bursts in three waves so the first hearts aren't lonely.
  const items = Array.from({ length: 26 }, (_, i) => {
    const left = (i * 173 + 37) % 96 + 2;
    const delay = (i * 91) % 1800;
    const size = 14 + ((i * 11) % 30);
    const dur = 3.6 + ((i * 37) % 22) / 10;
    const driftX = (((i * 211) % 80) - 40);
    const hue = i % 4;
    const colors = ['var(--coral)', '#FF8B8E', 'var(--rose-deep)', '#FFB4BA'];
    return { left, delay, size, dur, driftX, color: colors[hue], i };
  });
  return (
    <>
      {items.map(h => (
        <div key={h.i} style={{
          position: 'absolute', left: `${h.left}%`, bottom: -30,
          color: h.color,
          opacity: 0,
          ['--dx']: `${h.driftX}px`,
          animation: `heart-rise ${h.dur}s ${h.delay}ms cubic-bezier(.42,0,.58,1) infinite`,
          filter: 'drop-shadow(0 2px 6px rgba(255,90,95,0.25))',
        }}>
          <Icon name="heartFill" size={h.size} color="currentColor" />
        </div>
      ))}
      {/* a soft radial glow behind the centerpiece */}
      <div style={{
        position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(255,90,95,0.18), transparent 70%)',
        pointerEvents: 'none',
        animation: 'pulse-glow 2.2s ease-in-out infinite',
      }} />
      <style>{`
        @keyframes heart-rise {
          0%   { transform: translate3d(0, 0, 0) scale(0.4) rotate(-6deg); opacity: 0; }
          12%  { opacity: 1; }
          70%  { opacity: 0.9; }
          100% { transform: translate3d(var(--dx), -130vh, 0) scale(0.85) rotate(8deg); opacity: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.55; }
          50%      { transform: translate(-50%, -50%) scale(1.1);  opacity: 1; }
        }
      `}</style>
    </>
  );
}

function PaperFold() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'conic-gradient(from 90deg at 50% 50%, transparent 0deg, rgba(255,90,95,0.06) 60deg, transparent 120deg, rgba(168,214,176,0.07) 180deg, transparent 240deg, rgba(255,90,95,0.06) 300deg, transparent 360deg)',
      animation: 'fold-spin 8s linear infinite',
    }}>
      <style>{`@keyframes fold-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

Object.assign(window, {
  ScreenDiscover, ScreenProfile, LikeSheet, MatchMoment, TopBar, CircleBtn, PhotoCarousel, ActionFab,
});
