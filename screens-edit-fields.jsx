// screens-edit-fields.jsx — Individual editor screens for each profile basic.
// Reached by tapping the row in the Edit Profile screen.

function EditShell({ title, onClose, onSave, canSave = true, children }) {
  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={onClose} title={title} right={
        <button onClick={onSave} className="btn coral" style={{ padding: '8px 14px', fontSize: 13, opacity: canSave ? 1 : 0.4 }} disabled={!canSave}>save</button>
      } />
      <div className="screen-scroll" style={{ padding: '12px 18px 24px' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Pronouns ─────────────────────────────────────────────────
function EditPronouns({ onClose }) {
  const [v, setV] = React.useState('she/her');
  return (
    <EditShell title="pronouns" onClose={onClose} onSave={onClose}>
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 16, lineHeight: 1.45 }}>
        shown next to your name on your profile.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {['she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'self-describe'].map(o => {
          const on = v === o;
          return (
            <button key={o} onClick={() => setV(o)} className={'tile' + (on ? ' on' : '')}>
              <span>{o}</span>
              {on && <Icon name="check" size={16} color="#fff" />}
            </button>
          );
        })}
      </div>
    </EditShell>
  );
}

// ─── Height ───────────────────────────────────────────────────
function EditHeight({ onClose }) {
  const [inches, setInches] = React.useState(66);
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return (
    <EditShell title="height" onClose={onClose} onSave={onClose}>
      <div className="card" style={{ padding: 22, textAlign: 'center' }}>
        <div className="h-display" style={{ fontSize: 56, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {ft}<span style={{ fontSize: 28, color: 'var(--ink-3)', margin: '0 6px' }}>′</span>{inch}<span style={{ fontSize: 28, color: 'var(--ink-3)', marginLeft: 4 }}>″</span>
        </div>
        <div className="meta" style={{ fontSize: 11, marginTop: 4 }}>{Math.round(inches * 2.54)} cm</div>
        <input type="range" min={48} max={84} value={inches} onChange={(e) => setInches(+e.target.value)} style={{ width: '100%', accentColor: 'var(--coral)', marginTop: 18 }} />
      </div>
    </EditShell>
  );
}

// ─── Star sign ────────────────────────────────────────────────
function EditStarSign({ onClose }) {
  const [v, setV] = React.useState('cancer');
  const signs = [
    ['aries', '♈'], ['taurus', '♉'], ['gemini', '♊'], ['cancer', '♋'],
    ['leo', '♌'], ['virgo', '♍'], ['libra', '♎'], ['scorpio', '♏'],
    ['sagittarius', '♐'], ['capricorn', '♑'], ['aquarius', '♒'], ['pisces', '♓'],
  ];
  return (
    <EditShell title="star sign" onClose={onClose} onSave={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {signs.map(([s, g]) => {
          const on = v === s;
          return (
            <button key={s} onClick={() => setV(s)} className={'tile' + (on ? ' on' : '')} style={{ flexDirection: 'column', alignItems: 'center', padding: '14px 8px', textAlign: 'center' }}>
              <span style={{ fontSize: 22 }}>{g}</span>
              <span style={{ fontSize: 12.5, marginTop: 4 }}>{s}</span>
            </button>
          );
        })}
      </div>
    </EditShell>
  );
}

// ─── Drinks / Smokes (shares pattern) ─────────────────────────
function EditPicker({ onClose, title, options, initial }) {
  const [v, setV] = React.useState(initial);
  return (
    <EditShell title={title} onClose={onClose} onSave={onClose}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(o => {
          const on = v === o;
          return (
            <button key={o} onClick={() => setV(on ? null : o)} className={`chip ${on ? 'solid' : ''}`} style={{ fontSize: 13.5, padding: '10px 16px' }}>
              {on && <Icon name="check" size={12} color="#fff" />}
              {o}
            </button>
          );
        })}
      </div>
    </EditShell>
  );
}
function EditDrinks(p) { return <EditPicker {...p} title="drinks" options={['often', 'socially', 'rarely', 'never']} initial="socially" />; }
function EditSmokes(p) { return <EditPicker {...p} title="smokes" options={['regularly', 'socially', 'trying to quit', 'never']} initial="never" />; }
function EditExercise(p) { return <EditPicker {...p} title="exercise" options={['daily', 'a few times a week', 'sometimes', 'never']} initial="a few times a week" />; }
function EditKids(p) { return <EditPicker {...p} title="kids" options={['want some', 'have some, want more', 'have some, done', "don't want", 'open to it']} initial="open to it" />; }
function EditRelationship(p) { return <EditPicker {...p} title="relationship type" options={['long-term', 'long-term, open to short', 'short, open to long', 'short-term', 'figuring it out', 'new friends']} initial="long-term" />; }

// ─── School / Job (text input) ────────────────────────────────
function EditText({ onClose, title, placeholder, initial }) {
  const [v, setV] = React.useState(initial);
  return (
    <EditShell title={title} onClose={onClose} onSave={onClose} canSave={!!v.trim()}>
      <input className="input" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} autoFocus />
      <div className="meta" style={{ fontSize: 11.5, marginTop: 8 }}>shown on your profile basics.</div>
    </EditShell>
  );
}
function EditSchool(p) { return <EditText {...p} title="school" placeholder="university or high school" initial="NYU" />; }
function EditJob(p)    { return <EditText {...p} title="job" placeholder="what you do" initial="comms @ startup" />; }

Object.assign(window, {
  EditShell, EditPronouns, EditHeight, EditStarSign,
  EditDrinks, EditSmokes, EditExercise, EditKids, EditRelationship,
  EditSchool, EditJob, EditText, EditPicker,
});
