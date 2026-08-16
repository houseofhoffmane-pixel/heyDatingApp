// screens-permissions.jsx — Native-style permission prompts for push, camera, location.
// These are mocked iOS-style alerts that show before the system dialog,
// so users understand WHY we need it.

function PermShell({ icon, tone, title, sub, bullets, primary, onAllow, onLater, mockPromptText, mockPromptSub }) {
  const [showMock, setShowMock] = React.useState(false);

  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      <div className="status-pad" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 28px 24px' }}>
        <div style={{
          width: 88, height: 88, borderRadius: 26,
          background: `var(--${tone})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 22, boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}>
          <Icon name={icon} size={42} />
        </div>

        <div className="h-display" style={{ fontSize: 36, letterSpacing: '-0.035em', lineHeight: 1.0 }}>{title}</div>
        <div style={{ marginTop: 12, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.45, maxWidth: 300 }}>{sub}</div>

        <div className="card" style={{ marginTop: 24, padding: 0 }}>
          {bullets.map((b, i) => (
            <div key={i} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i === bullets.length - 1 ? 'none' : '1px solid var(--line)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `var(--${tone})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="check" size={14} />
              </div>
              <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.4 }}>{b}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <button className="btn coral full lg" onClick={() => setShowMock(true)}>{primary}</button>
        <button className="btn ghost full" onClick={onLater} style={{ marginTop: 4, fontSize: 14 }}>not now</button>
      </div>

      {/* Native iOS-style permission alert mock */}
      {showMock && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, animation: 'float-up 200ms' }} />
          <div className="pop-in" style={{
            position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 280, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(40px)',
            borderRadius: 14, overflow: 'hidden', zIndex: 101,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ padding: '20px 18px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: '-apple-system', fontWeight: 600, fontSize: 17, color: '#000' }}>{mockPromptText}</div>
              <div style={{ marginTop: 4, fontSize: 13, color: '#000', lineHeight: 1.35 }}>{mockPromptSub}</div>
            </div>
            <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.2)', display: 'flex' }}>
              <button onClick={() => { setShowMock(false); onLater(); }} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 0, borderRight: '0.5px solid rgba(0,0,0,0.2)', fontFamily: '-apple-system', fontSize: 17, color: '#007AFF', cursor: 'pointer' }}>Don't Allow</button>
              <button onClick={() => { setShowMock(false); onAllow(); }} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 0, fontFamily: '-apple-system', fontSize: 17, fontWeight: 600, color: '#007AFF', cursor: 'pointer' }}>Allow</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PermPush({ onAllow, onLater }) {
  return (
    <PermShell
      icon="bell" tone="butter"
      title="don't miss the moment."
      sub="we'll only ping you for things that matter — matches, messages, and people at your spot."
      bullets={[
        "when someone you like matches with you",
        "new messages from your matches",
        "when a match checks into the same spot as you",
        "saved event reminders, 2 hours before",
      ]}
      primary="turn on notifications"
      mockPromptText='"Hey" would like to send you notifications'
      mockPromptSub="Notifications may include alerts, sounds, and icon badges. These can be configured in Settings."
      onAllow={onAllow} onLater={onLater}
    />
  );
}

function PermCamera({ onAllow, onLater }) {
  return (
    <PermShell
      icon="photo" tone="peach"
      title="show up. literally."
      sub="we need camera access for your verification selfie and to add photos to your profile."
      bullets={[
        "take your selfie for verification",
        "add new photos to your profile",
        "share photos in chat",
      ]}
      primary="turn on camera"
      mockPromptText='"Hey" Would Like to Access the Camera'
      mockPromptSub="Used for profile photos and selfie verification. Photos stay on your device until you upload them."
      onAllow={onAllow} onLater={onLater}
    />
  );
}

function PermLocation({ onAllow, onLater }) {
  return (
    <PermShell
      icon="locate" tone="mint"
      title="who's nearby?"
      sub="hey only works if we know where you are. we'll never share your exact spot — just your neighborhood + rough distance."
      bullets={[
        "show people nearby in Discover",
        "let you check in at spots (100m range)",
        "match you with the right city for Events",
        "never visible to other users",
      ]}
      primary="turn on location"
      mockPromptText='Allow "Hey" to use your location?'
      mockPromptSub="Your precise location is used to find people nearby and confirm spot check-ins. Hey will never share it with others."
      onAllow={onAllow} onLater={onLater}
    />
  );
}

Object.assign(window, { PermShell, PermPush, PermCamera, PermLocation });
