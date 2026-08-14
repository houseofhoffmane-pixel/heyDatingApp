// design-system.jsx — shared bits used across screens
// Avatars, photo placeholders, icons, top headers, bottom tab bar.

// ─────────────────────────────────────────────────────────────
// Photo placeholder — pastel tone with the person's initial as a watermark.
// Never tries to draw a face; honest about being a placeholder.
// ─────────────────────────────────────────────────────────────
const PHOTO_TONES = [
  { bg: 'var(--peach)', accent: '#F8C4A8' },
  { bg: 'var(--mint)',  accent: '#A8D6B0' },
  { bg: 'var(--sky)',   accent: '#B5CDE5' },
  { bg: 'var(--butter)',accent: '#F4D784' },
  { bg: 'var(--lilac)', accent: '#C8B8E0' },
  { bg: 'var(--rose)',  accent: '#F0A9B5' },
];

function toneFor(seed) {
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PHOTO_TONES[h % PHOTO_TONES.length];
}

function Photo({ name = 'A', label = 'photo', size, style = {}, children, vignette = true }) {
  const tone = toneFor(name);
  const initial = (name || 'A').trim()[0]?.toUpperCase() || 'A';
  const w = size?.w ?? '100%';
  const h = size?.h ?? '100%';
  return (
    <div className="photo" data-label={label} style={{
      background: tone.bg, width: w, height: h, ...style,
    }}>
      {/* abstract blob shapes — pretend imagery, no faces */}
      <div style={{
        position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)',
        width: '52%', aspectRatio: '1/1', borderRadius: '50%',
        background: tone.accent, opacity: 0.65,
      }} />
      <div style={{
        position: 'absolute', bottom: '-30%', left: '50%', transform: 'translateX(-50%)',
        width: '120%', height: '60%', borderRadius: '50%',
        background: tone.accent, opacity: 0.55,
      }} />
      {vignette && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.18))',
        }} />
      )}
      <div className="initial" style={{
        fontSize: 'min(38vh, 220px)',
        right: '6%', bottom: '-12%',
        opacity: 0.13,
      }}>{initial}</div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar — small round version of the photo. Used in chat & lists.
// ─────────────────────────────────────────────────────────────
function Avatar({ name = 'A', size = 44, ring = false, ringColor = 'var(--coral)' }) {
  const tone = toneFor(name);
  const initial = (name || 'A').trim()[0]?.toUpperCase() || 'A';
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: tone.bg,
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: ring ? `0 0 0 2.5px var(--bg), 0 0 0 5px ${ringColor}` : 'none',
    }}>
      <div style={{
        position: 'absolute', top: '30%', left: '50%',
        transform: 'translate(-50%, 0)',
        width: '55%', aspectRatio: '1', borderRadius: '50%',
        background: tone.accent, opacity: 0.7,
      }} />
      <div style={{
        position: 'absolute', bottom: '-40%', left: '50%',
        transform: 'translateX(-50%)',
        width: '130%', height: '70%', borderRadius: '50%',
        background: tone.accent, opacity: 0.55,
      }} />
      <span style={{
        position: 'relative',
        fontFamily: 'var(--display)', fontWeight: 700,
        fontSize: size * 0.42, color: 'rgba(0,0,0,0.32)',
      }}>{initial}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Icons — tiny custom set, all 24x24
// ─────────────────────────────────────────────────────────────
const Icon = ({ name, size = 22, color = 'currentColor', strokeWidth = 1.8 }) => {
  const p = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    sparkle: <><path {...p} d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle {...p} cx="12" cy="12" r="2.6"/></>,
    heart: <path {...p} d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z"/>,
    heartFill: <path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z" fill={color}/>,
    x: <path {...p} d="M6 6l12 12M18 6L6 18"/>,
    chat: <><path {...p} d="M4 5h16v11H10l-4 4v-4H4z"/></>,
    pin: <><path {...p} d="M12 21s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"/><circle {...p} cx="12" cy="9" r="2.5"/></>,
    pinFill: <><path d="M12 21s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z" fill={color}/><circle cx="12" cy="9" r="2.5" fill="#fff"/></>,
    user: <><circle {...p} cx="12" cy="8" r="4"/><path {...p} d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7"/></>,
    userFill: <><circle cx="12" cy="8" r="4" fill={color}/><path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7" fill={color}/></>,
    settings: <><circle {...p} cx="12" cy="12" r="3"/><path {...p} d="M19.4 15a1.7 1.7 0 0 0 .4 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.4 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .4-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.4H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.4 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    chevron: <path {...p} d="M9 6l6 6-6 6"/>,
    back: <path {...p} d="M15 6l-6 6 6 6"/>,
    chevronDown: <path {...p} d="M6 9l6 6 6-6"/>,
    plus: <path {...p} d="M12 5v14M5 12h14"/>,
    check: <path {...p} d="M5 12l5 5L20 7"/>,
    photo: <><rect {...p} x="3" y="5" width="18" height="14" rx="2"/><circle {...p} cx="9" cy="11" r="2"/><path {...p} d="M21 17l-5-5-9 7"/></>,
    filter: <path {...p} d="M3 5h18M6 12h12M10 19h4"/>,
    bolt: <path {...p} d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/>,
    search: <><circle {...p} cx="11" cy="11" r="7"/><path {...p} d="M20 20l-3.5-3.5"/></>,
    send: <path {...p} d="M3 12l18-9-7 18-2-7-9-2z"/>,
    mic: <><rect {...p} x="9" y="3" width="6" height="12" rx="3"/><path {...p} d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
    sparkles: <><path {...p} d="M5 12l1.5-3 3-1.5L6.5 6 5 3 3.5 6 0.5 7.5 3.5 9z" transform="translate(8 8)"/></>,
    flame: <path {...p} d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1-3s-2 2-2 5a5 5 0 0 0 10 0c0-5-5-10-5-10z"/>,
    shield: <><path {...p} d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path {...p} d="M9 12l2 2 4-4"/></>,
    bookmark: <path {...p} d="M6 4h12v17l-6-4-6 4z"/>,
    eye: <><path {...p} d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle {...p} cx="12" cy="12" r="3"/></>,
    moreH: <><circle cx="6" cy="12" r="1.6" fill={color}/><circle cx="12" cy="12" r="1.6" fill={color}/><circle cx="18" cy="12" r="1.6" fill={color}/></>,
    moreV: <><circle cx="12" cy="6" r="1.6" fill={color}/><circle cx="12" cy="12" r="1.6" fill={color}/><circle cx="12" cy="18" r="1.6" fill={color}/></>,
    grid: <><rect {...p} x="3" y="3" width="7" height="7" rx="1.5"/><rect {...p} x="14" y="3" width="7" height="7" rx="1.5"/><rect {...p} x="3" y="14" width="7" height="7" rx="1.5"/><rect {...p} x="14" y="14" width="7" height="7" rx="1.5"/></>,
    list: <><path {...p} d="M8 6h13M8 12h13M8 18h13"/><circle {...p} cx="4" cy="6" r="1"/><circle {...p} cx="4" cy="12" r="1"/><circle {...p} cx="4" cy="18" r="1"/></>,
    stack: <><rect {...p} x="6" y="6" width="14" height="14" rx="2.5"/><path {...p} d="M3 9v9a3 3 0 0 0 3 3h9"/></>,
    edit: <><path {...p} d="M4 20h4l10-10-4-4L4 16z"/></>,
    arrowRight: <path {...p} d="M5 12h14M13 6l6 6-6 6"/>,
    arrowDown: <path {...p} d="M12 5v14M6 13l6 6 6-6"/>,
    locate: <><circle {...p} cx="12" cy="12" r="3"/><path {...p} d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
    clock: <><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M12 7v5l3 2"/></>,
    bell: <><path {...p} d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path {...p} d="M10 21a2 2 0 0 0 4 0"/></>,
    instagram: <><rect {...p} x="3" y="3" width="18" height="18" rx="5"/><circle {...p} cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill={color}/></>,
    spotify: <><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M7 9c4-1 8 0 11 2M7.5 12.5c3-0.8 6-0.2 9 1.5M8 16c2.5-0.5 5 0 7 1.2"/></>,
    refresh: <><path {...p} d="M20 12a8 8 0 1 1-3-6.3L20 8"/><path {...p} d="M20 3v5h-5"/></>,
    cigarette: <><rect {...p} x="3" y="13" width="14" height="3" rx="0.5"/><path {...p} d="M19 13c2 0 2-3 0-3"/></>,
    cocktail: <><path {...p} d="M4 4h16l-8 9v6M8 19h8"/></>,
    coffee: <><path {...p} d="M5 8h12v6a4 4 0 0 1-8 0V8z"/><path {...p} d="M17 9h2a2 2 0 0 1 0 4h-2"/><path {...p} d="M7 4v2M11 4v2M15 4v2"/></>,
    book: <><path {...p} d="M4 4h7v16H6a2 2 0 0 1-2-2zM13 4h7v14a2 2 0 0 0-2 2h-5z"/></>,
    pizza: <><path {...p} d="M12 3l9 18H3z"/><circle cx="10" cy="13" r="1" fill={color}/><circle cx="14" cy="13" r="1" fill={color}/><circle cx="12" cy="17" r="1" fill={color}/></>,
    music: <><circle {...p} cx="6" cy="18" r="2.5"/><circle {...p} cx="18" cy="16" r="2.5"/><path {...p} d="M8.5 18V5l12-2v13"/></>,
    leaf: <path {...p} d="M5 19s.5-9 8-13c3.5 0 6.5 3 6.5 6.5C19.5 18 11 19 5 19zm0 0c4-3 8-7 12-9"/>,
    park: <><path {...p} d="M12 3l6 9h-3l3 5h-12l3-5H6z"/><path {...p} d="M12 17v5"/></>,
    badgeCheck: <><path {...p} d="M12 2l2.5 2 3.5-.5L19 7l2 3-2 3 .5 3.5L17 18l-2.5 2L12 22l-2.5-2L6 20l-1.5-3.5L2 13l2-3-2-3 2.5-3.5L9 4z"/><path {...p} d="M8 12l3 3 5-5"/></>,
    fire: <path {...p} d="M12 22a6 6 0 0 0 6-6c0-3-2.5-5.5-6-9-2 3-3 5-3 5s-1-1-1-3a8 8 0 0 0-4 7 8 8 0 0 0 8 6z"/>,
    star: <path {...p} d="M12 3l2.7 6 6.3.6-4.8 4.3 1.4 6.1L12 17l-5.6 3 1.4-6.1L3 9.6l6.3-.6z"/>,
    info: <><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M12 8h0M11 12h1v5h1"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
      {paths[name] ?? null}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Sheet header — back button + optional right action
// ─────────────────────────────────────────────────────────────
function SheetHead({ onBack, title, right }) {
  return (
    <div className="sheet-head" style={{ paddingTop: 8, paddingBottom: 6 }}>
      {onBack && (
        <button className="back" onClick={onBack} aria-label="Back">
          <Icon name="back" size={18} />
        </button>
      )}
      <div style={{
        fontFamily: 'var(--display)', fontWeight: 700, fontSize: 19,
        letterSpacing: '-0.02em', flex: 1, paddingLeft: 4,
      }}>{title}</div>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom tab bar (Discover / Places / Chats / Me)
// ─────────────────────────────────────────────────────────────
function TabBar({ active, onChange, hasUnread = true, hasMatch = true }) {
  const tabs = [
    { id: 'discover', label: 'Discover', icon: 'flame', iconActive: 'flame' },
    { id: 'places', label: 'Places', icon: 'pin', iconActive: 'pinFill' },
    { id: 'chats', label: 'Chats', icon: 'chat', iconActive: 'chat' },
    { id: 'me', label: 'Me', icon: 'user', iconActive: 'userFill' },
  ];
  return (
    <div className="tabbar">
      {tabs.map(t => {
        const isActive = active === t.id;
        const badge = (t.id === 'chats' && hasUnread) || (t.id === 'discover' && hasMatch);
        return (
          <button key={t.id} className={isActive ? 'active' : ''} onClick={() => onChange(t.id)}>
            <div style={{ position: 'relative' }}>
              <Icon name={isActive ? t.iconActive : t.icon} size={24} />
              {badge && <span className="dot-badge" style={{ position: 'absolute', top: -2, right: -4 }} />}
            </div>
            <div className="label">{t.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Floating tabbar w/ home indicator pad — used at bottom of all main screens
// ─────────────────────────────────────────────────────────────
function HomePad() {
  return <div style={{ height: 34, flexShrink: 0 }} />;
}

Object.assign(window, {
  Photo, Avatar, Icon, SheetHead, TabBar, HomePad, toneFor, PHOTO_TONES,
});
