// screens-safety.jsx — Safety center, emergency contact, reported list,
// message filtering, photo verification check.

// ─── Safety Center ────────────────────────────────────────────
function ScreenSafetyCenter({ onClose }) {
  const [callPrompt, setCallPrompt] = React.useState(null);
  return (
    <SubShell title="safety center" onClose={onClose}
      overlay={callPrompt && <CallPrompt name={callPrompt.name} number={callPrompt.number} onCancel={() => setCallPrompt(null)} onCall={() => setCallPrompt(null)} />}
    >
      <div className="card" style={{ background: 'var(--coral)', color: '#fff', border: 'none', padding: 18 }}>
        <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>need help right now?</div>
        <div className="h-display" style={{ color: '#fff', fontSize: 22, marginTop: 4, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
          tap to share your live location with your emergency contact.
        </div>
        <button className="btn" style={{ marginTop: 14, background: '#fff', color: 'var(--coral)', fontWeight: 700 }}>
          <Icon name="shield" size={16} color="var(--coral)" /> share location now
        </button>
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>before a date</div>
      <div className="card" style={{ padding: 0 }}>
        <SubRow l="meet in public the first time" sub="bar, coffee shop, restaurant — bright + busy" />
        <SubRow l="tell a friend the plan" sub="who, where, when, when you'll text" />
        <SubRow l="keep your own ride home" sub="don't depend on them for the trip back" />
        <SubRow l="trust your gut" sub="if something's off, leave. you don't owe an explanation." last />
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>consent matters</div>
      <div className="card" style={{ padding: 0 }}>
        <SubRow l="consent every time" sub="for every step. enthusiastic. ongoing." />
        <SubRow l="alcohol & consent don't mix" sub="if anyone's too drunk, the answer is no" />
        <SubRow l="no means no, every time" sub="even if it was yes before" last />
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>hotlines · 24/7</div>
      <div className="card" style={{ padding: 0 }}>
        <HotlineRow l="RAINN (sexual assault)" v="800-656-HOPE" tone="rose" onCall={() => setCallPrompt({ name: 'RAINN', number: '800-656-4673' })} />
        <HotlineRow l="Crisis Text Line" v="text HELLO to 741741" tone="sky" onCall={() => setCallPrompt({ name: 'Crisis Text Line', number: '741741' })} />
        <HotlineRow l="National DV Hotline" v="800-799-7233" tone="butter" onCall={() => setCallPrompt({ name: 'National DV Hotline', number: '800-799-7233' })} />
        <HotlineRow l="Trevor Project (LGBTQ+ youth)" v="866-488-7386" tone="lilac" onCall={() => setCallPrompt({ name: 'Trevor Project', number: '866-488-7386' })} last />
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>report something to hey</div>
      <div className="card" style={{ padding: 0 }}>
        <SubRow l="report a profile" chev />
        <SubRow l="report a place or event" chev />
        <SubRow l="report a bug" chev last />
      </div>

      <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: 'var(--card)', border: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.45 }}>
        in an emergency, always call <b style={{ color: 'var(--coral)' }}>911</b> (or your local equivalent) first.
      </div>
    </SubShell>
  );
}

function HotlineRow({ l, v, tone, last, onCall }) {
  return (
    <div onClick={onCall} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: last ? 'none' : '1px solid var(--line)', cursor: 'pointer' }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: `var(--${tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="shield" size={15} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{l}</div>
        <div className="meta" style={{ fontSize: 11.5, marginTop: 1 }}>{v}</div>
      </div>
      <Icon name="chevron" size={14} color="var(--ink-3)" />
    </div>
  );
}

// Modal "call hotline?" iOS-style alert. Uses flex centering on the scrim
// so the modal is dead-center of whatever positioned ancestor it lives in.
function CallPrompt({ name, number, onCancel, onCall }) {
  return (
    <div onClick={onCancel} style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'float-up 200ms both',
    }}>
      <div className="pop-in" onClick={(e) => e.stopPropagation()} style={{
        width: 280, background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ padding: '20px 18px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: '-apple-system', fontWeight: 600, fontSize: 17, color: '#000' }}>Call {name}?</div>
          <div style={{ marginTop: 4, fontSize: 13, color: '#000', lineHeight: 1.35, fontFamily: 'var(--mono)' }}>{number}</div>
        </div>
        <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.2)', display: 'flex' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 0, borderRight: '0.5px solid rgba(0,0,0,0.2)', fontFamily: '-apple-system', fontSize: 17, color: '#007AFF', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onCall} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 0, fontFamily: '-apple-system', fontSize: 17, fontWeight: 600, color: '#007AFF', cursor: 'pointer' }}>Call</button>
        </div>
      </div>
    </div>
  );
}

// ─── Emergency Contact ────────────────────────────────────────
function ScreenEmergencyContact({ onClose }) {
  const [hasContact, setHasContact] = React.useState(true);
  const [shareAuto, setShareAuto] = React.useState(false);
  return (
    <SubShell title="emergency contact" onClose={onClose}>
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 16, lineHeight: 1.45 }}>
        someone we can text if you need help — they'll get your live location and a check-in link.
      </div>

      {hasContact ? (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
            <Avatar name="Sam" size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Sam (best friend)</div>
              <div className="meta" style={{ fontSize: 11.5, marginTop: 1 }}>+1 (555) 010-8821 · added apr 2026</div>
            </div>
            <button onClick={() => setHasContact(false)} className="btn soft" style={{ padding: '6px 12px', fontSize: 12 }}>remove</button>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <button className="btn coral full">
              <Icon name="shield" size={14} color="#fff" /> share location with Sam now
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 18, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--peach)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Icon name="user" size={26} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>no contact yet.</div>
          <div className="meta" style={{ fontSize: 12, marginTop: 4 }}>pick someone from your phonebook.</div>
          <button onClick={() => setHasContact(true)} className="btn coral" style={{ marginTop: 14, padding: '10px 20px' }}>
            <Icon name="plus" size={14} color="#fff" /> add contact
          </button>
        </div>
      )}

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>auto-share triggers</div>
      <div className="card" style={{ padding: 0 }}>
        <ToggleRow label="auto-share on first dates" sub="when you check in at an event or spot tagged as a date" on={shareAuto} onChange={setShareAuto} />
        <ToggleRow label="check-in timer" sub="prompt you to confirm you're safe every hour" on={false} last />
      </div>

      <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: 'var(--mint)', display: 'flex', gap: 10 }}>
        <Icon name="info" size={20} />
        <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>
          your contact never sees your hey account or any matches. they only get your location when you choose to share.
        </div>
      </div>
    </SubShell>
  );
}

// ─── Reported Accounts ────────────────────────────────────────
function ScreenReported({ onClose }) {
  const reports = [
    { name: 'a fake profile', date: 'apr 18', reason: 'fake photos', status: 'reviewed · removed' },
  ];
  return (
    <SubShell title="reported accounts" onClose={onClose}>
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 14, lineHeight: 1.45 }}>
        we review every report. you'll get a notification when there's an update.
      </div>

      {reports.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)' }}>no reports.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {reports.map((r, i) => (
            <div key={i} style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 6, borderBottom: i === reports.length - 1 ? 'none' : '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--bg-2)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--ink-3)' }}>{r.name}</div>
                  <div className="meta" style={{ fontSize: 10.5, marginTop: 1 }}>reported {r.date} · "{r.reason}"</div>
                </div>
              </div>
              <div style={{
                display: 'inline-flex', alignSelf: 'flex-start',
                padding: '4px 9px', borderRadius: 999,
                background: 'var(--mint)', fontSize: 11, fontWeight: 600,
              }}>
                ✓ {r.status}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>about reports</div>
      <div className="card" style={{ padding: 0 }}>
        <SubRow l="all reports are anonymous" sub="we never tell anyone you reported them" />
        <SubRow l="average review time" v="under 4 hrs" />
        <SubRow l="false reports are tracked" sub="repeat offenders face their own consequences" last />
      </div>
    </SubShell>
  );
}

// ─── Message Filtering ────────────────────────────────────────
function ScreenMsgFiltering({ onClose }) {
  const [autoHide, setAutoHide] = React.useState(true);
  const [warnSender, setWarnSender] = React.useState(true);
  const [filterUnsolicited, setFilterUnsolicited] = React.useState(true);
  const [sensitivity, setSensitivity] = React.useState('balanced');
  const [keywords, setKeywords] = React.useState(['my number is', 'cashapp', 'venmo me']);
  return (
    <SubShell title="message filtering" onClose={onClose}>
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 16, lineHeight: 1.45 }}>
        we hide messages that look harmful, scammy, or unsolicited. you can always tap to reveal.
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>filters</div>
      <div className="card" style={{ padding: 0 }}>
        <ToggleRow label="auto-hide abusive language" sub="slurs, threats, harassment" on={autoHide} onChange={setAutoHide} />
        <ToggleRow label="warn senders before sending" sub="prompt them to rewrite borderline messages" on={warnSender} onChange={setWarnSender} />
        <ToggleRow label="filter unsolicited photos" sub="blur and warn before opening" on={filterUnsolicited} onChange={setFilterUnsolicited} last />
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>sensitivity</div>
      <div className="card" style={{ padding: 0 }}>
        {[
          { v: 'loose', l: 'loose', sub: 'only filter the obvious stuff' },
          { v: 'balanced', l: 'balanced', sub: 'recommended for most people' },
          { v: 'strict', l: 'strict', sub: 'filter borderline messages too' },
        ].map((o, i, a) => (
          <div key={o.v} onClick={() => setSensitivity(o.v)} style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i === a.length - 1 ? 'none' : '1px solid var(--line)', cursor: 'pointer' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{o.l}</div>
              <div className="meta" style={{ fontSize: 11.5, marginTop: 1 }}>{o.sub}</div>
            </div>
            <div style={{ width: 22, height: 22, borderRadius: 999, border: '2px solid ' + (sensitivity === o.v ? 'var(--coral)' : 'var(--line-2)'), background: sensitivity === o.v ? 'var(--coral)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {sensitivity === o.v && <i style={{ width: 8, height: 8, borderRadius: 999, background: '#fff' }} />}
            </div>
          </div>
        ))}
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>custom keywords · {keywords.length}</div>
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {keywords.map(k => (
            <span key={k} className="chip" style={{ fontSize: 12.5 }}>
              {k}
              <button onClick={() => setKeywords(keywords.filter(x => x !== k))} style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0, marginLeft: 4, color: 'var(--ink-3)' }}>×</button>
            </span>
          ))}
        </div>
        <input className="input" placeholder="add a word or phrase…" style={{ fontSize: 14 }} />
      </div>
    </SubShell>
  );
}

// ─── Photo Verification Check ─────────────────────────────────
function ScreenPhotoCheck({ onClose }) {
  const [requireVerified, setRequireVerified] = React.useState(false);
  const [hideUnverified, setHideUnverified] = React.useState(false);
  const [showBadge, setShowBadge] = React.useState(true);
  return (
    <SubShell title="photo verification check" onClose={onClose}>
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 16, lineHeight: 1.45 }}>
        verified profiles have done a real-time selfie check. control how strict you want to be.
      </div>

      <div className="card" style={{ padding: 0 }}>
        <ToggleRow label="only let verified users message me" sub="unverified profiles can match but won't be able to text" on={requireVerified} onChange={setRequireVerified} />
        <ToggleRow label="hide unverified profiles entirely" sub="they won't show up in your discover feed" on={hideUnverified} onChange={setHideUnverified} />
        <ToggleRow label="show ✓ on my profile" sub="visible badge so people see you're verified" on={showBadge} onChange={setShowBadge} last />
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>impact preview</div>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <div className="h-display" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
            {hideUnverified ? '~58%' : requireVerified ? '~83%' : '100%'}
          </div>
          <div className="meta" style={{ fontSize: 11.5 }}>of nearby profiles</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
          stricter settings mean a smaller, safer pool. balance is yours.
        </div>
      </div>

      <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: 'var(--peach)', display: 'flex', gap: 10 }}>
        <Icon name="badgeCheck" size={20} color="var(--coral)" />
        <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>
          not verified yet? <b style={{ color: 'var(--coral)' }}>take 30 seconds →</b> match rates jump 3×.
        </div>
      </div>
    </SubShell>
  );
}

Object.assign(window, {
  ScreenSafetyCenter, ScreenEmergencyContact, ScreenReported,
  ScreenMsgFiltering, ScreenPhotoCheck,
});
