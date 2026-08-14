// screens-settings-sub.jsx — Sub-screens reachable from Settings.
// Each is a small page; the goal is coverage, not feature-completeness.

// ─────────────────────────────────────────────────────────────
// Reusable shell for a settings sub-screen
// ─────────────────────────────────────────────────────────────
function SubShell({ title, onClose, children, right, overlay }) {
  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={onClose} title={title} right={right} />
      <div className="screen-scroll" style={{ padding: '8px 16px 24px' }}>
        {children}
      </div>
      {overlay}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Phone number
// ─────────────────────────────────────────────────────────────
function ScreenSetPhone({ onClose }) {
  return (
    <SubShell title="phone number" onClose={onClose}>
      <div className="card" style={{ padding: 16 }}>
        <div className="eyebrow">your number</div>
        <div className="h-display" style={{ marginTop: 4, fontSize: 26, letterSpacing: '-0.025em' }}>+1 (555) 010-4242</div>
        <div className="meta" style={{ marginTop: 6, fontSize: 11.5 }}>verified · sms · last used today</div>
      </div>
      <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: 'var(--peach)', display: 'flex', gap: 10 }}>
        <Icon name="shield" size={20} />
        <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>
          your phone is your account. it's never shown to other users.
        </div>
      </div>
    </SubShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Verification
// ─────────────────────────────────────────────────────────────
function ScreenSetVerify({ onClose }) {
  return (
    <SubShell title="verification" onClose={onClose}>
      <div className="card" style={{ padding: 18, background: 'var(--mint)', border: 'none', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Icon name="badgeCheck" size={36} color="var(--coral)" />
        </div>
        <div className="h-display h-3" style={{ letterSpacing: '-0.025em' }}>you're verified.</div>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-2)' }}>verified on may 16, 2026 · valid until may 16, 2027</div>
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>perks</div>
      <div className="card" style={{ padding: 0 }}>
        <SubRow l="visible ✓ badge on your profile" />
        <SubRow l="appear in 'verified only' filters" />
        <SubRow l="3× more likely to match" last />
      </div>
    </SubShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Privacy & safety
// ─────────────────────────────────────────────────────────────
function ScreenSetPrivacy({ onClose, go }) {
  const [readReceipts, setReadReceipts] = React.useState(true);
  const [activeStatus, setActiveStatus] = React.useState(false);
  const [photoBlur, setPhotoBlur] = React.useState(true);
  return (
    <SubShell title="privacy & safety" onClose={onClose}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>privacy</div>
      <div className="card" style={{ padding: 0 }}>
        <ToggleRow label="read receipts" sub="show people when you've read their message" on={readReceipts} onChange={setReadReceipts} />
        <ToggleRow label="active status" sub="show when you were last online" on={activeStatus} onChange={setActiveStatus} />
        <ToggleRow label="blur explicit photos" sub="we'll blur photos until you tap" on={photoBlur} onChange={setPhotoBlur} last />
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>safety</div>
      <div className="card" style={{ padding: 0 }}>
        <SubRow l="blocked accounts" v="3" chev onClick={() => go && go('blocked')} />
        <SubRow l="reported accounts" v="1" chev onClick={() => go && go('reported')} />
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>safety tools</div>
      <div className="card" style={{ padding: 0 }}>
        <SubRow l="safety center" sub="resources, hotlines, dating tips" chev onClick={() => go && go('safety-center')} />
        <SubRow l="emergency contact" sub="quick-share location with one tap" chev onClick={() => go && go('emergency')} last />
      </div>
    </SubShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────
function ScreenSetNotifs({ onClose }) {
  const [matches, setMatches] = React.useState(true);
  const [messages, setMessages] = React.useState(true);
  const [likes, setLikes] = React.useState(true);
  const [places, setPlaces] = React.useState(true);
  const [marketing, setMarketing] = React.useState(false);
  return (
    <SubShell title="notifications" onClose={onClose}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>activity</div>
      <div className="card" style={{ padding: 0 }}>
        <ToggleRow label="new matches" sub="when someone matches with you" on={matches} onChange={setMatches} />
        <ToggleRow label="new messages" sub="when you get a message" on={messages} onChange={setMessages} />
        <ToggleRow label="new likes" sub="when someone likes your profile" on={likes} onChange={setLikes} last />
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>places & events</div>
      <div className="card" style={{ padding: 0 }}>
        <ToggleRow label="people at your spot" sub="when matches check into the same place" on={places} onChange={setPlaces} />
        <ToggleRow label="event reminders" sub="2 hours before saved events" on={true} last />
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>other</div>
      <div className="card" style={{ padding: 0 }}>
        <ToggleRow label="news & updates" sub="occasional app updates" on={marketing} onChange={setMarketing} />
        <ToggleRow label="email digest" sub="weekly recap" on={false} last />
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>do not disturb</div>
      <div className="card" style={{ padding: 0 }}>
        <SubRow l="quiet hours" v="10pm — 8am" chev last />
      </div>
    </SubShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Location
// ─────────────────────────────────────────────────────────────
function ScreenSetLocation({ onClose }) {
  return (
    <SubShell title="location" onClose={onClose}>
      <div className="card" style={{ padding: 16, background: 'var(--peach)', border: 'none' }}>
        <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>your location</div>
        <div className="h-display" style={{ marginTop: 4, fontSize: 22, letterSpacing: '-0.025em' }}>nolita, nyc</div>
        <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-2)' }}>updated 4 minutes ago · accurate to ±30m</div>
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>permissions</div>
      <div className="card" style={{ padding: 0 }}>
        <SubRow l="precise location" sub="required to check in at spots" v="on" chev />
        <SubRow l="background location" sub="auto-update without opening app" v="off" chev last />
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>what we use it for</div>
      <div className="card" style={{ padding: 0 }}>
        <SubRow l="show nearby people in Discover" />
        <SubRow l="confirm spot check-ins (100m radius)" />
        <SubRow l="city assignment for Events" last />
      </div>
      <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: 'var(--mint)', display: 'flex', gap: 10 }}>
        <Icon name="shield" size={20} />
        <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>
          <b>we never share your live location with other users.</b> only neighborhood + distance is visible.
        </div>
      </div>
    </SubShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Who sees me
// ─────────────────────────────────────────────────────────────
function ScreenSetWhoSees({ onClose }) {
  const [mode, setMode] = React.useState('everyone');
  return (
    <SubShell title="who sees me" onClose={onClose}>
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 14, lineHeight: 1.45 }}>
        control who can see your profile in Discover & Spots.
      </div>
      <div className="card" style={{ padding: 0 }}>
        <ModeRow label="everyone in my filters" sub="standard. most matches." on={mode === 'everyone'} onClick={() => setMode('everyone')} tone="mint" icon="bolt" />
        <ModeRow label="only people i like" sub="i swipe first. they can like back." on={mode === 'liked'} onClick={() => setMode('liked')} tone="butter" icon="heartFill" />
        <ModeRow label="only people at my spot" sub="hyper-local. only check-ins." on={mode === 'spot'} onClick={() => setMode('spot')} tone="lilac" icon="pinFill" last />
      </div>

      <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>visibility</div>
      <div className="card" style={{ padding: 0 }}>
        <ToggleRow label="show me to people i pass" sub="reciprocal: i can't see them either if off" on={true} />
        <ToggleRow label="show my distance" sub="display ~mi away on profile" on={true} last />
      </div>
    </SubShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Legal pages — same shape, different text
// ─────────────────────────────────────────────────────────────
function ScreenLegal({ onClose, title, sections }) {
  return (
    <SubShell title={title} onClose={onClose}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: 0.08, marginBottom: 16 }}>
        EFFECTIVE MAY 1, 2026 · v 1.0
      </div>
      {sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 22 }}>
          <div className="h-display" style={{ fontSize: 18, letterSpacing: '-0.02em', marginBottom: 8 }}>{s.h}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{s.p}</div>
        </div>
      ))}
    </SubShell>
  );
}

function ScreenGuidelines({ onClose }) {
  return <ScreenLegal title="community guidelines" onClose={onClose} sections={[
    { h: 'be a person.', p: "real people, real photos, real intentions. no bots, no fake profiles, no recycled selfies from 2018." },
    { h: 'respect a no.', p: "if someone unmatches, that's the conversation ending. don't make new accounts to find them again." },
    { h: 'keep it consensual.', p: "no unsolicited photos, no pressure, no creepy behavior. consent every time, every step." },
    { h: 'no commercial use.', p: "Hey isn't for promoting OnlyFans, MLMs, or your DJ set. we'll remove those profiles fast." },
    { h: 'protect the vibe.', p: "discrimination, harassment, and hate speech are an instant ban. period." },
  ]} />;
}

function ScreenTerms({ onClose }) {
  return <ScreenLegal title="terms of service" onClose={onClose} sections={[
    { h: '1. who can use hey', p: "you must be at least 18 years old and have the legal capacity to enter into a binding agreement. minors get reported and removed." },
    { h: '2. your account', p: "you're responsible for everything that happens through your account. don't share your login. don't impersonate anyone." },
    { h: '3. content you post', p: "you keep ownership of your photos and text. by posting, you give us a limited license to display them inside the app." },
    { h: '4. ending the relationship', p: "you can delete your account anytime in settings. we can suspend accounts that violate community guidelines." },
    { h: '5. disclaimers', p: "we don't background check users. we're not responsible for offline interactions. always meet in public the first time." },
  ]} />;
}

function ScreenPrivacyPolicy({ onClose }) {
  return <ScreenLegal title="privacy policy" onClose={onClose} sections={[
    { h: 'what we collect', p: "phone number, name, age, location (when permitted), photos, prompts, messages with matches, app interactions." },
    { h: 'why', p: "to match you with relevant people, to verify you're real, to keep the platform safe, to improve the product." },
    { h: 'who sees what', p: "other users see your profile, photos, and rough distance. they never see your phone number, exact location, or anything you didn't post." },
    { h: 'how long', p: "active account data stays as long as you're a user. deleted accounts are wiped within 30 days, except for fraud-prevention records." },
    { h: 'your rights', p: "request your data, correct it, or delete it. write us at privacy@hey.app." },
  ]} />;
}

function ScreenBlocked({ onClose }) {
  const blocked = [
    { name: 'random_dude_42', when: 'feb 14' },
    { name: 'an unmatched profile', when: 'mar 02' },
    { name: 'someone who got weird', when: 'apr 18' },
  ];
  return (
    <SubShell title="blocked accounts" onClose={onClose}>
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 14, lineHeight: 1.45 }}>
        these people can't see, message, or match with you. ever.
      </div>
      {blocked.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)' }}>no blocked accounts.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {blocked.map((b, i) => (
            <div key={i} style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i === blocked.length - 1 ? 'none' : '1px solid var(--line)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--bg-2)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--ink-3)' }}>{b.name}</div>
                <div className="meta" style={{ fontSize: 10.5, marginTop: 1 }}>blocked {b.when}</div>
              </div>
              <button className="btn soft" style={{ padding: '6px 12px', fontSize: 12 }}>unblock</button>
            </div>
          ))}
        </div>
      )}
    </SubShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function SubRow({ l, sub, v, chev, last, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: last ? 'none' : '1px solid var(--line)',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{l}</div>
        {sub && <div className="meta" style={{ fontSize: 11.5, marginTop: 2, lineHeight: 1.35 }}>{sub}</div>}
      </div>
      {v && <div style={{ color: 'var(--ink-3)', fontSize: 13.5, marginRight: chev ? 4 : 0 }}>{v}</div>}
      {chev && <Icon name="chevron" size={14} color="var(--ink-3)" />}
    </div>
  );
}

Object.assign(window, {
  ScreenSetPhone, ScreenSetVerify, ScreenSetPrivacy, ScreenSetNotifs,
  ScreenSetLocation, ScreenSetWhoSees,
  ScreenGuidelines, ScreenTerms, ScreenPrivacyPolicy, ScreenBlocked,
  SubShell, SubRow,
});
