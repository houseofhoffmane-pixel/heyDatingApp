// screens-action-sheets.jsx — Modal action flows that overlay any screen:
// Report (profile/spot), Unmatch, Share (profile/spot), Block confirmation.
// Each is a bottom sheet + scrim, animated in via .float-up.

// ─────────────────────────────────────────────────────────────
// Generic sheet shell
// ─────────────────────────────────────────────────────────────
function ActionSheet({ onClose, children, tall = false }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 95,
        animation: 'float-up 200ms both',
      }} />
      <div className="float-up" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 96,
        background: 'var(--bg)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '14px 18px 24px',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.2)',
        maxHeight: tall ? '90%' : '70%',
        overflowY: 'auto',
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--line-2)', margin: '0 auto 14px' }} />
        {children}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Report a profile — pick reason, optional details, submit, confirmation
// ─────────────────────────────────────────────────────────────
function ReportProfileSheet({ personId, onClose }) {
  const p = PEOPLE.find(x => x.id === personId) ?? PEOPLE[0];
  const [reason, setReason] = React.useState(null);
  const [detail, setDetail] = React.useState('');
  const [blockToo, setBlockToo] = React.useState(true);
  const [step, setStep] = React.useState('pick'); // pick → detail → submitted

  const reasons = [
    { v: 'fake', l: 'fake profile', sub: 'photos look fake, AI, or stolen' },
    { v: 'inappropriate', l: 'inappropriate photos', sub: 'nudity, sexual content, violence' },
    { v: 'harassment', l: 'harassment or hate', sub: 'slurs, threats, discrimination' },
    { v: 'spam', l: 'spam or promotion', sub: 'OnlyFans, MLM, business stuff' },
    { v: 'underage', l: 'looks underage', sub: 'might be under 18' },
    { v: 'scam', l: 'scam / money request', sub: 'asking for $, gift cards, crypto' },
    { v: 'other', l: 'something else', sub: 'tell us in the next step' },
  ];

  if (step === 'submitted') {
    return (
      <ActionSheet onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '20px 0 6px' }}>
          <div className="pop-in" style={{ width: 72, height: 72, borderRadius: 22, background: 'var(--mint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Icon name="check" size={36} />
          </div>
          <div className="h-display" style={{ fontSize: 24, letterSpacing: '-0.025em' }}>report sent.</div>
          <div style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.4, maxWidth: 280, margin: '8px auto 0' }}>
            we review every one. usually under 4 hours.
            {blockToo && <> we've also <b>blocked {p.name}</b> for you.</>}
          </div>
        </div>
        <button className="btn coral full lg" style={{ marginTop: 22 }} onClick={onClose}>done</button>
      </ActionSheet>
    );
  }

  if (step === 'detail') {
    return (
      <ActionSheet onClose={onClose} tall>
        <div className="eyebrow">reporting</div>
        <div className="h-display" style={{ fontSize: 22, letterSpacing: '-0.025em', marginTop: 4 }}>{p.name}</div>
        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-3)' }}>reason: {reasons.find(r => r.v === reason)?.l}</div>

        <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>
          tell us what happened <span style={{ color: 'var(--coral)' }}>*</span>
        </div>
        <textarea className="input" placeholder="describe what you saw. specifics help us act fast." value={detail} onChange={(e) => setDetail(e.target.value.slice(0, 280))} style={{ minHeight: 120, resize: 'none', lineHeight: 1.4 }} autoFocus />
        <div className="meta" style={{ fontSize: 10.5, textAlign: 'right', marginTop: 4 }}>{280 - detail.length} · min 10 chars</div>

        <div className="card" style={{ marginTop: 14, padding: 0 }}>
          <ToggleRow label={`also block ${p.name}`} sub="they won't see or message you ever" on={blockToo} onChange={setBlockToo} last />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button className="btn soft" style={{ flex: '0 0 auto', paddingLeft: 22, paddingRight: 22 }} onClick={() => setStep('pick')}>back</button>
          <button className="btn coral" style={{ flex: 1, opacity: detail.trim().length >= 10 ? 1 : 0.4 }} disabled={detail.trim().length < 10} onClick={() => setStep('submitted')}>submit report</button>
        </div>
      </ActionSheet>
    );
  }

  return (
    <ActionSheet onClose={onClose} tall>
      <div className="eyebrow" style={{ color: 'var(--coral)' }}>reporting</div>
      <div className="h-display" style={{ fontSize: 22, letterSpacing: '-0.025em', marginTop: 4 }}>what happened with {p.name}?</div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-2)' }}>this is anonymous. {p.name} will never know.</div>

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {reasons.map(r => {
          const on = reason === r.v;
          return (
            <button key={r.v} onClick={() => setReason(r.v)} className="card" style={{
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
              background: on ? 'var(--ink)' : 'var(--card)',
              color: on ? '#fff' : 'var(--ink)',
              borderColor: on ? 'var(--ink)' : 'var(--line)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.l}</div>
                <div style={{ fontSize: 11.5, marginTop: 2, color: on ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)' }}>{r.sub}</div>
              </div>
              {on && <Icon name="check" size={16} color="#fff" />}
            </button>
          );
        })}
      </div>

      <button className="btn coral full lg" style={{ marginTop: 18 }} disabled={!reason} onClick={() => setStep('detail')}>
        continue
      </button>
    </ActionSheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Report a spot — same 2-step shape as profile
// ─────────────────────────────────────────────────────────────
function ReportSpotSheet({ placeId, onClose }) {
  const p = PLACES.find(x => x.id === placeId) ?? PLACES[0];
  const [reason, setReason] = React.useState(null);
  const [detail, setDetail] = React.useState('');
  const [step, setStep] = React.useState('pick');

  const reasons = [
    { v: 'closed', l: 'permanently closed' },
    { v: 'wrong-info', l: 'wrong info (hours, address, etc.)' },
    { v: 'unsafe', l: 'unsafe place to meet' },
    { v: 'duplicate', l: 'duplicate of another spot' },
    { v: 'inappropriate', l: 'inappropriate for hey' },
    { v: 'other', l: 'something else' },
  ];

  if (step === 'submitted') {
    return (
      <ActionSheet onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '20px 0 6px' }}>
          <div className="pop-in" style={{ width: 72, height: 72, borderRadius: 22, background: 'var(--mint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Icon name="check" size={36} />
          </div>
          <div className="h-display" style={{ fontSize: 24, letterSpacing: '-0.025em' }}>thanks for flagging.</div>
          <div style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.4, maxWidth: 280, margin: '8px auto 0' }}>
            we'll review {p.label} and update or remove it if needed.
          </div>
        </div>
        <button className="btn coral full lg" style={{ marginTop: 22 }} onClick={onClose}>done</button>
      </ActionSheet>
    );
  }

  if (step === 'detail') {
    return (
      <ActionSheet onClose={onClose} tall>
        <div className="eyebrow">reporting</div>
        <div style={{ marginTop: 4, fontWeight: 700, fontSize: 18, letterSpacing: '-0.015em' }}>{p.label}</div>
        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-3)' }}>reason: {reasons.find(r => r.v === reason)?.l}</div>
        <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>
          tell us what's wrong <span style={{ color: 'var(--coral)' }}>*</span>
        </div>
        <textarea className="input" placeholder="more context helps us fix or remove it faster." value={detail} onChange={(e) => setDetail(e.target.value.slice(0, 280))} style={{ minHeight: 120, resize: 'none', lineHeight: 1.4 }} autoFocus />
        <div className="meta" style={{ fontSize: 10.5, textAlign: 'right', marginTop: 4 }}>{280 - detail.length} · min 10 chars</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button className="btn soft" style={{ flex: '0 0 auto', paddingLeft: 22, paddingRight: 22 }} onClick={() => setStep('pick')}>back</button>
          <button className="btn coral" style={{ flex: 1, opacity: detail.trim().length >= 10 ? 1 : 0.4 }} disabled={detail.trim().length < 10} onClick={() => setStep('submitted')}>submit report</button>
        </div>
      </ActionSheet>
    );
  }

  return (
    <ActionSheet onClose={onClose} tall>
      <div className="eyebrow" style={{ color: 'var(--coral)' }}>reporting</div>
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: `var(--${p.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={p.icon} size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{p.label}</div>
          <div className="meta" style={{ fontSize: 11 }}>{p.kind} · {p.address}</div>
        </div>
      </div>

      <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>what's wrong with this spot?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {reasons.map(r => {
          const on = reason === r.v;
          return (
            <button key={r.v} onClick={() => setReason(r.v)} className={'tile' + (on ? ' on' : '')}>
              <span>{r.l}</span>
              {on && <Icon name="check" size={16} color="#fff" />}
            </button>
          );
        })}
      </div>

      <button className="btn coral full lg" style={{ marginTop: 18 }} disabled={!reason} onClick={() => setStep('detail')}>
        continue
      </button>
    </ActionSheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Report an event — same shape as spot
// ─────────────────────────────────────────────────────────────
function ReportEventSheet({ eventId, onClose }) {
  const e = EVENTS.find(x => x.id === eventId) ?? EVENTS[0];
  const [reason, setReason] = React.useState(null);
  const [detail, setDetail] = React.useState('');
  const [step, setStep] = React.useState('pick');

  const reasons = [
    { v: 'cancelled', l: 'event was cancelled' },
    { v: 'wrong-info', l: 'wrong date / time / address' },
    { v: 'unsafe', l: 'unsafe or sketchy' },
    { v: 'misleading', l: 'misleading description' },
    { v: 'inappropriate', l: 'inappropriate for hey' },
    { v: 'scam', l: 'scam / fake event' },
    { v: 'other', l: 'something else' },
  ];

  if (step === 'submitted') {
    return (
      <ActionSheet onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '20px 0 6px' }}>
          <div className="pop-in" style={{ width: 72, height: 72, borderRadius: 22, background: 'var(--mint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Icon name="check" size={36} />
          </div>
          <div className="h-display" style={{ fontSize: 24, letterSpacing: '-0.025em' }}>thanks for flagging.</div>
          <div style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.4, maxWidth: 280, margin: '8px auto 0' }}>
            we'll review "{e.title}" and act if it breaks our rules.
          </div>
        </div>
        <button className="btn coral full lg" style={{ marginTop: 22 }} onClick={onClose}>done</button>
      </ActionSheet>
    );
  }

  if (step === 'detail') {
    return (
      <ActionSheet onClose={onClose} tall>
        <div className="eyebrow">reporting event</div>
        <div style={{ marginTop: 4, fontWeight: 700, fontSize: 18, letterSpacing: '-0.015em' }}>{e.title}</div>
        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-3)' }}>reason: {reasons.find(r => r.v === reason)?.l}</div>
        <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>
          tell us more <span style={{ color: 'var(--coral)' }}>*</span>
        </div>
        <textarea className="input" placeholder="give us details — what made it sketchy, off, or wrong?" value={detail} onChange={(e2) => setDetail(e2.target.value.slice(0, 280))} style={{ minHeight: 120, resize: 'none', lineHeight: 1.4 }} autoFocus />
        <div className="meta" style={{ fontSize: 10.5, textAlign: 'right', marginTop: 4 }}>{280 - detail.length} · min 10 chars</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button className="btn soft" style={{ flex: '0 0 auto', paddingLeft: 22, paddingRight: 22 }} onClick={() => setStep('pick')}>back</button>
          <button className="btn coral" style={{ flex: 1, opacity: detail.trim().length >= 10 ? 1 : 0.4 }} disabled={detail.trim().length < 10} onClick={() => setStep('submitted')}>submit report</button>
        </div>
      </ActionSheet>
    );
  }

  return (
    <ActionSheet onClose={onClose} tall>
      <div className="eyebrow" style={{ color: 'var(--coral)' }}>reporting event</div>
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: `var(--${e.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={e.icon} size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{e.title}</div>
          <div className="meta" style={{ fontSize: 11 }}>{e.host} · {e.when}</div>
        </div>
      </div>

      <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>what's wrong with this event?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {reasons.map(r => {
          const on = reason === r.v;
          return (
            <button key={r.v} onClick={() => setReason(r.v)} className={'tile' + (on ? ' on' : '')}>
              <span>{r.l}</span>
              {on && <Icon name="check" size={16} color="#fff" />}
            </button>
          );
        })}
      </div>

      <button className="btn coral full lg" style={{ marginTop: 18 }} disabled={!reason} onClick={() => setStep('detail')}>
        continue
      </button>
    </ActionSheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Unmatch confirmation
// ─────────────────────────────────────────────────────────────
function UnmatchSheet({ matchId, onClose, onConfirm }) {
  const m = MATCHES.find(x => x.id === matchId) ?? MATCHES[0];
  const p = PEOPLE.find(x => x.id === m.id) ?? PEOPLE[0];
  return (
    <ActionSheet onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '6px 0 0' }}>
        <Avatar name={p.name} size={64} />
        <div className="h-display" style={{ fontSize: 22, letterSpacing: '-0.025em', marginTop: 12 }}>
          unmatch {p.name}?
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.45, maxWidth: 280, margin: '8px auto 0' }}>
          you'll both lose this chat. they won't be told. they can't see your profile again.
        </div>
      </div>

      <div className="card" style={{ marginTop: 18, padding: 12, background: 'var(--peach)', border: 'none', display: 'flex', gap: 10 }}>
        <Icon name="info" size={18} />
        <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.4 }}>
          if they were harassing you, please <b>report</b> instead. it stays anonymous and helps everyone.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
        <button className="btn full lg" style={{ background: 'var(--coral)', color: '#fff' }} onClick={onConfirm}>
          unmatch
        </button>
        <button className="btn soft full" onClick={onClose}>cancel</button>
      </div>
    </ActionSheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Block confirmation
// ─────────────────────────────────────────────────────────────
function BlockSheet({ personId, onClose, onConfirm }) {
  const p = PEOPLE.find(x => x.id === personId) ?? PEOPLE[0];
  return (
    <ActionSheet onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '6px 0 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: 'var(--coral-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Icon name="shield" size={36} color="var(--coral)" />
        </div>
        <div className="h-display" style={{ fontSize: 22, letterSpacing: '-0.025em' }}>block {p.name}?</div>
        <div style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.45, maxWidth: 290, margin: '8px auto 0' }}>
          they will never see your profile, send you messages, or appear in Discover for you. ever.
        </div>
      </div>

      <div className="card" style={{ marginTop: 18, padding: 0 }}>
        {[
          { l: 'you won\'t see them in Discover', icon: 'eye' },
          { l: 'they won\'t see you anywhere', icon: 'shield' },
          { l: 'any existing match is removed', icon: 'x' },
          { l: 'they\'re never told you blocked them', icon: 'check' },
        ].map((row, i, a) => (
          <div key={i} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i === a.length - 1 ? 'none' : '1px solid var(--line)' }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={row.icon} size={14} />
            </div>
            <div style={{ flex: 1, fontSize: 13 }}>{row.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
        <button className="btn full lg" style={{ background: 'var(--coral)', color: '#fff' }} onClick={onConfirm}>
          block & remove
        </button>
        <button className="btn soft full" onClick={onClose}>cancel</button>
      </div>
    </ActionSheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Share — profile or spot
// kind: 'profile' | 'spot'
// ─────────────────────────────────────────────────────────────
function ShareSheet({ kind, id, onClose }) {
  const isProfile = kind === 'profile';
  const item = isProfile
    ? (PEOPLE.find(x => x.id === id) ?? PEOPLE[0])
    : (PLACES.find(x => x.id === id) ?? PLACES[0]);
  const [copied, setCopied] = React.useState(false);

  const link = isProfile
    ? `hey.app/p/${item.id}`
    : `hey.app/spot/${item.id}`;

  const matches = MATCHES.slice(0, 4);

  return (
    <ActionSheet onClose={onClose} tall>
      {/* Header card */}
      <div className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
        {isProfile ? (
          <Avatar name={item.name} size={48} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `var(--${item.tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={item.icon} size={22} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">share</div>
          <div style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.005em' }}>
            {isProfile ? `${item.name}, ${item.age}` : item.label}
          </div>
          <div className="meta" style={{ fontSize: 11, marginTop: 1 }}>
            {isProfile ? `at ${item.place.label}` : `${item.kind} · ${item.dist}`}
          </div>
        </div>
      </div>

      {/* Share inside Hey — pick a match */}
      <div className="eyebrow" style={{ marginTop: 18, marginBottom: 10 }}>share with a match</div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {matches.map(m => (
          <button key={m.id} onClick={() => { onClose(); }} style={{
            flexShrink: 0, textAlign: 'center', width: 64,
            background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
          }}>
            <Avatar name={m.name} size={56} />
            <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
          </button>
        ))}
      </div>

      {/* Link row */}
      <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>share link</div>
      <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</div>
        <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }} className="btn soft" style={{ padding: '8px 12px', fontSize: 12 }}>
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>

      {/* Apps grid */}
      <div className="eyebrow" style={{ marginTop: 18, marginBottom: 10 }}>send via</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { l: 'iMessage', tone: 'mint', emoji: '💬' },
          { l: 'WhatsApp', tone: 'mint', emoji: '🟢' },
          { l: 'Instagram', tone: 'rose', emoji: '📸' },
          { l: 'Snapchat', tone: 'butter', emoji: '👻' },
          { l: 'Twitter', tone: 'sky', emoji: '𝕏' },
          { l: 'AirDrop', tone: 'lilac', emoji: '📡' },
          { l: 'Mail', tone: 'sky', emoji: '✉️' },
          { l: 'more', tone: 'peach', emoji: '⋯' },
        ].map(a => (
          <button key={a.l} onClick={onClose} style={{
            background: 'transparent', border: 0, cursor: 'pointer', padding: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: 54, height: 54, borderRadius: 16, background: `var(--${a.tone})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
            }}>{a.emoji}</div>
            <span style={{ fontSize: 11, fontWeight: 500 }}>{a.l}</span>
          </button>
        ))}
      </div>

      {!isProfile && (
        <div style={{ marginTop: 18, padding: 12, borderRadius: 12, background: 'var(--peach)', display: 'flex', gap: 10, fontSize: 12.5, lineHeight: 1.4 }}>
          <Icon name="info" size={16} />
          <span>links open in the hey app. people without it see a preview + an install link.</span>
        </div>
      )}
    </ActionSheet>
  );
}

Object.assign(window, { ActionSheet, ReportProfileSheet, ReportSpotSheet, ReportEventSheet, UnmatchSheet, BlockSheet, ShareSheet });
