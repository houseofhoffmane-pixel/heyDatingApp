// screens-onboarding-q.jsx — Reworked question screens for a perfect-dating-app onboarding.
// One screen per question, with a shared shell that handles the chrome
// (back button, step indicator, title/subtitle, sticky continue bar).
// Mandatory steps gate the Continue button; optional steps show "skip".

// Order of the question flow:
//   3 name+dob      (mandatory)
//   4 gender        (mandatory) — split from lookingFor
//   5 lookingFor    (mandatory)
//   6 relationship  (mandatory) — what you're here for
//   7 height        (mandatory)
//   8 pronouns      (optional)
//   9 starsign      (optional)
//  10 lifestyle     (drinks/smokes/exercise — optional)
//  11 values        (kids/politics/religion — optional)
//  12 interests     (≥3 — mandatory)
//  13 prompts       (≥1 — mandatory)
//  14 bio           (mandatory)
//  15 photo         (≥2 — mandatory)
//  16 email-pass    (optional but recommended)
//  17 verify        (mandatory to be discoverable)
//
// Total ~14 steps after OTP. Step counter in each shell.

const ONB_STEPS = [
  'name','gender','lookingfor','relationship','height','work',
  'pronouns','starsign','lifestyle','values','interests',
  'prompts','bio','photo','email-pass','verify',
];
function stepNum(id) { return ONB_STEPS.indexOf(id) + 1; }
const TOTAL = ONB_STEPS.length;

// ─────────────────────────────────────────────────────────────
// Q shell — title, subtitle, body, sticky CTA.
// `required` shows "* required" tag, gates skip.
// `valid` controls Continue enable.
// ─────────────────────────────────────────────────────────────
function QShell({ stepId, prev, next, go, title, sub, required, valid, children, skipLabel = 'skip', primaryLabel = 'continue' }) {
  const n = stepNum(stepId);
  return (
    <div className="screen">
      <div className="status-pad" />
      <SheetHead onBack={() => go(prev)} title="" right={
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 0.06, color: 'var(--ink-3)' }}>
          {n} / {TOTAL}
        </div>
      } />

      {/* progress bar */}
      <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', margin: '4px 18px 12px', borderRadius: 999 }}>
        <div style={{ width: `${(n / TOTAL) * 100}%`, height: '100%', background: 'var(--coral)', borderRadius: 999, transition: 'width 200ms' }} />
      </div>

      <div className="screen-scroll" style={{ padding: '4px 24px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="eyebrow">step {n}</div>
          {required && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 6px', borderRadius: 999, background: 'var(--coral)', color: '#fff', letterSpacing: 0.06 }}>REQUIRED</span>}
          {!required && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 6px', borderRadius: 999, background: 'rgba(0,0,0,0.06)', color: 'var(--ink-3)', letterSpacing: 0.06 }}>OPTIONAL</span>}
        </div>
        <div className="h-display h-2" style={{ marginTop: 8 }}>{title}</div>
        {sub && <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 14.5, lineHeight: 1.4 }}>{sub}</div>}
        <div style={{ marginTop: 22 }}>{children}</div>
        <div style={{ height: 80 }} />
      </div>

      <div style={{ padding: '8px 16px 14px', background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
        <button className="btn coral full lg" onClick={() => go(next)} disabled={!valid} style={{ opacity: valid ? 1 : 0.4 }}>
          {primaryLabel}
        </button>
        {!required && (
          <button className="btn ghost full" onClick={() => go(next)} style={{ marginTop: 4, fontSize: 13 }}>
            {skipLabel} — i'll add later
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reusable tile-grid for single-select
// ─────────────────────────────────────────────────────────────
function TileGrid({ options, value, onChange, cols = 1 }) {
  return (
    <div style={{ display: cols === 1 ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const emoji = typeof o === 'string' ? null : o.emoji;
        const sub = typeof o === 'string' ? null : o.sub;
        const on = value === v;
        return (
          <button key={v} className={'tile' + (on ? ' on' : '')} onClick={() => onChange(v)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              {emoji && <span style={{ fontSize: 20 }}>{emoji}</span>}
              <div>
                <div>{label}</div>
                {sub && <div style={{ fontSize: 11.5, color: on ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
              </div>
            </div>
            {on && <Icon name="check" size={18} color="#fff" />}
          </button>
        );
      })}
    </div>
  );
}

// Reusable multi-select chip grid
function ChipMulti({ options, values, onToggle, min, max }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => {
        const on = values.includes(o);
        return (
          <button key={o} onClick={() => onToggle(o)} className={`chip ${on ? 'solid' : ''}`} style={{ fontSize: 13.5, padding: '8px 14px' }}>
            {on && <Icon name="check" size={11} color="#fff" />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. Gender — own screen, mandatory
// ─────────────────────────────────────────────────────────────
function QGender({ go, gender, setGender }) {
  return (
    <QShell stepId="gender" prev="otp" next="lookingfor" go={go}
      title="what's your gender?"
      sub="this is how you describe yourself. you can show or hide it on your profile in settings."
      required valid={!!gender}
    >
      <TileGrid
        value={gender}
        onChange={setGender}
        options={[
          { value: 'woman', label: 'woman', emoji: '♀️' },
          { value: 'man', label: 'man', emoji: '♂️' },
          { value: 'non-binary', label: 'non-binary', emoji: '⚧️' },
          { value: 'trans woman', label: 'trans woman' },
          { value: 'trans man', label: 'trans man' },
          { value: 'self-describe', label: 'other' },
        ]}
      />
    </QShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Looking for — own screen, mandatory, multi-select
// ─────────────────────────────────────────────────────────────
function QLookingFor({ go, lookingFor, setLookingFor }) {
  const toggle = (o) => setLookingFor(lookingFor.includes(o) ? lookingFor.filter(x => x !== o) : [...lookingFor, o]);
  return (
    <QShell stepId="lookingfor" prev="gender" next="relationship" go={go}
      title="who do you want to see?"
      sub="pick one or more. you can change this anytime in filters."
      required valid={lookingFor.length > 0}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['women', 'men', 'non-binary folks', 'everyone'].map(o => {
          const on = lookingFor.includes(o);
          return (
            <button key={o} className={'tile' + (on ? ' on' : '')} onClick={() => toggle(o)}>
              <span>{o}</span>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                border: '2px solid ' + (on ? '#fff' : 'var(--line-2)'),
                background: on ? '#fff' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {on && <Icon name="check" size={14} color="var(--ink)" />}
              </div>
            </button>
          );
        })}
      </div>
    </QShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Relationship type — mandatory
// ─────────────────────────────────────────────────────────────
function QRelationship({ go, relationship, setRelationship }) {
  return (
    <QShell stepId="relationship" prev="lookingfor" next="height" go={go}
      title="what are you here for?"
      sub="no judgement. honesty saves everyone time."
      required valid={!!relationship}
    >
      <TileGrid
        value={relationship}
        onChange={setRelationship}
        options={[
          { value: 'longterm', label: 'long-term', sub: 'open to whatever it turns into', emoji: '💍' },
          { value: 'longterm-open', label: 'long-term, open to short', sub: 'serious but not in a rush', emoji: '🌱' },
          { value: 'short-open', label: 'short-term, open to long', sub: 'see what happens', emoji: '🍿' },
          { value: 'short', label: 'short-term · fun', sub: 'casual, not casual-cruel', emoji: '🎢' },
          { value: 'figuring-out', label: 'still figuring it out', sub: 'taste-testing the vibe', emoji: '🌀' },
          { value: 'friends', label: 'new friends', sub: 'no romance, just plot twists', emoji: '🤝' },
        ]}
      />
    </QShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Height — mandatory (slider)
// ─────────────────────────────────────────────────────────────
function QHeight({ go, height, setHeight }) {
  // height stored as inches (48–84). Default 66 (5'6").
  const inches = height || 66;
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  const cm = Math.round(inches * 2.54);
  return (
    <QShell stepId="height" prev="relationship" next="work" go={go}
      title="how tall?"
      sub="people use this as a filter. it's okay."
      required valid={inches > 0}
    >
      <div className="card" style={{ padding: 22, textAlign: 'center' }}>
        <div className="h-display" style={{ fontSize: 48, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {ft}<span style={{ fontSize: 28, color: 'var(--ink-3)', margin: '0 6px' }}>′</span>{inch}<span style={{ fontSize: 28, color: 'var(--ink-3)', marginLeft: 4 }}>″</span>
        </div>
        <div className="meta" style={{ fontSize: 11, marginTop: 4 }}>{cm} cm</div>
        <input
          type="range" min={48} max={84} value={inches}
          onChange={(e) => setHeight(+e.target.value)}
          style={{ width: '100%', accentColor: 'var(--coral)', marginTop: 16 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
          <span>4'0"</span><span>7'0"</span>
        </div>
      </div>
      <div className="meta" style={{ marginTop: 14, textAlign: 'center', fontSize: 11.5 }}>
        toggle to <b>cm</b> in settings later.
      </div>
    </QShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 4b. Work & school — optional text fields
// ─────────────────────────────────────────────────────────────
function QWork({ go, job, setJob, school, setSchool }) {
  return (
    <QShell stepId="work" prev="height" next="pronouns" go={go}
      title="work & school?"
      sub="optional. people love a little context."
      valid={true}
    >
      <div className="eyebrow" style={{ marginBottom: 8 }}>job</div>
      <input className="input" placeholder="what you do (or what you say at parties)" value={job} onChange={(e) => setJob(e.target.value)} />
      <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>school</div>
      <input className="input" placeholder="university or high school" value={school} onChange={(e) => setSchool(e.target.value)} />
    </QShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. Pronouns — optional
// ─────────────────────────────────────────────────────────────
function QPronouns({ go, pronouns, setPronouns }) {
  return (
    <QShell stepId="pronouns" prev="height" next="starsign" go={go}
      title="your pronouns?"
      sub="shown next to your name on your profile."
      valid={!!pronouns}
    >
      <TileGrid
        value={pronouns}
        onChange={setPronouns}
        cols={2}
        options={['she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'self-describe']}
      />
    </QShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. Star sign — optional
// ─────────────────────────────────────────────────────────────
function QStarSign({ go, starSign, setStarSign }) {
  const signs = [
    ['aries', '♈'], ['taurus', '♉'], ['gemini', '♊'], ['cancer', '♋'],
    ['leo', '♌'], ['virgo', '♍'], ['libra', '♎'], ['scorpio', '♏'],
    ['sagittarius', '♐'], ['capricorn', '♑'], ['aquarius', '♒'], ['pisces', '♓'],
  ];
  return (
    <QShell stepId="starsign" prev="pronouns" next="lifestyle" go={go}
      title="star sign?"
      sub="we don't believe it either. people still ask."
      valid={!!starSign}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {signs.map(([s, g]) => {
          const on = starSign === s;
          return (
            <button key={s} onClick={() => setStarSign(s)} className={'tile' + (on ? ' on' : '')} style={{ flexDirection: 'column', alignItems: 'center', padding: '14px 8px', textAlign: 'center' }}>
              <span style={{ fontSize: 22 }}>{g}</span>
              <span style={{ fontSize: 12.5, marginTop: 4 }}>{s}</span>
            </button>
          );
        })}
      </div>
    </QShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. Lifestyle — drinks, smokes, exercise (optional)
// ─────────────────────────────────────────────────────────────
function QLifestyle({ go, lifestyle, setLifestyle }) {
  const set = (k, v) => setLifestyle({ ...lifestyle, [k]: v });
  const groups = [
    { key: 'drinks', label: 'drinks?', opts: ['often', 'socially', 'rarely', 'never'] },
    { key: 'smokes', label: 'smokes?', opts: ['regularly', 'socially', 'trying to quit', 'never'] },
    { key: 'exercise', label: 'exercise?', opts: ['daily', 'a few times a week', 'sometimes', 'never'] },
    { key: '420', label: '420?', opts: ['yes', 'sometimes', 'never'] },
  ];
  const filled = groups.every(g => lifestyle[g.key]);
  return (
    <QShell stepId="lifestyle" prev="starsign" next="values" go={go}
      title="your lifestyle."
      sub="all four answers required. takes ten seconds."
      required valid={filled}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {groups.map(g => (
          <div key={g.key}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{g.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {g.opts.map(o => {
                const on = lifestyle[g.key] === o;
                return (
                  <button key={o} onClick={() => set(g.key, on ? null : o)} className={`chip ${on ? 'solid' : ''}`} style={{ fontSize: 13.5, padding: '8px 14px' }}>{o}</button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </QShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. Values — kids, politics, religion (optional)
// ─────────────────────────────────────────────────────────────
function QValues({ go, values, setValues }) {
  const set = (k, v) => setValues({ ...values, [k]: v });
  const groups = [
    { key: 'kids', label: 'kids?', opts: ['want some', 'have some, want more', 'have some, done', 'don\'t want', 'open to it'] },
    { key: 'politics', label: 'politics?', opts: ['left', 'moderate', 'right', 'not political', 'rather not say'] },
    { key: 'religion', label: 'religion?', opts: ['agnostic', 'atheist', 'christian', 'jewish', 'muslim', 'hindu', 'buddhist', 'spiritual', 'other'] },
    { key: 'monogamy', label: 'monogamy?', opts: ['monogamous', 'monogamish', 'non-monogamous', 'figuring it out'] },
  ];
  return (
    <QShell stepId="values" prev="lifestyle" next="interests" go={go}
      title="the values stuff."
      sub="the things people actually want to know before date #2."
      valid={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {groups.map(g => (
          <div key={g.key}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{g.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {g.opts.map(o => {
                const on = values[g.key] === o;
                return (
                  <button key={o} onClick={() => set(g.key, on ? null : o)} className={`chip ${on ? 'solid' : ''}`} style={{ fontSize: 13.5, padding: '8px 14px' }}>{o}</button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </QShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. Interests — mandatory, min 3
// ─────────────────────────────────────────────────────────────
function QInterests({ go, interests, setInterests }) {
  const buckets = {
    'creative':   ['art', 'music', 'photography', 'design', 'zines', 'writing', 'theatre', 'film'],
    'outdoors':   ['hiking', 'running', 'climbing', 'cycling', 'surfing', 'camping', 'yoga', 'gym'],
    'food & drink': ['cooking', 'coffee', 'natural wine', 'cocktails', 'baking', 'street food', 'matcha', 'BYOB'],
    'going out':  ['live music', 'house parties', 'dive bars', 'speakeasies', 'pop-ups', 'comedy', 'raves'],
    'staying in': ['reading', 'gaming', 'board games', 'puzzles', 'baking', 'studio ghibli', 'pinterest'],
    'tech & nerd':['coding', 'AI', 'startups', 'chess', 'F1', 'crypto', 'lego'],
    'media':      ['letterboxd', 'NYT games', 'A24', 'k-drama', 'podcasts', 'criterion'],
  };
  const toggle = (o) => setInterests(interests.includes(o) ? interests.filter(x => x !== o) : (interests.length < 6 ? [...interests, o] : interests));
  return (
    <QShell stepId="interests" prev="values" next="prompts" go={go}
      title="what's your thing?"
      sub="pick at least 3. up to 6. these show up on your profile."
      required valid={interests.length >= 3}
      primaryLabel={`continue · ${interests.length}/6`}
    >
      {Object.entries(buckets).map(([cat, opts]) => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{cat}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {opts.map(o => {
              const on = interests.includes(o);
              return (
                <button key={o} onClick={() => toggle(o)} className={`chip ${on ? 'solid' : ''}`} style={{ fontSize: 13, padding: '7px 12px' }}>
                  {on && <Icon name="check" size={10} color="#fff" />}
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </QShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 10. Prompts — pick + answer (mandatory, ≥1)
// ─────────────────────────────────────────────────────────────
const PROMPT_LIBRARY = [
  'green flag i look for',
  'my hottest take',
  'the way to my heart',
  "i'll fall for you if",
  'a non-negotiable',
  'two truths and a lie',
  'sunday morning is for',
  'a recent rabbit hole',
  'i\'m a 10 but',
  'unusual skill',
  'best meal i\'ve had',
  'my therapist would say',
];

function QPrompts({ go, prompts, setPrompts }) {
  const [picking, setPicking] = React.useState(null); // index being picked
  const [editing, setEditing] = React.useState(null); // index being edited
  const [draft, setDraft] = React.useState('');

  const slots = [0, 1, 2];
  const filled = slots.filter(i => prompts[i] && prompts[i].a).length;

  const pickPrompt = (q) => {
    const next = [...prompts];
    next[picking] = { q, a: '' };
    setPrompts(next);
    setEditing(picking);
    setDraft('');
    setPicking(null);
  };
  const saveAnswer = () => {
    if (!draft.trim()) return;
    const next = [...prompts];
    next[editing] = { ...next[editing], a: draft.trim() };
    setPrompts(next);
    setEditing(null);
    setDraft('');
  };
  const removeSlot = (i) => {
    const next = [...prompts];
    next[i] = null;
    setPrompts(next);
  };

  return (
    <QShell stepId="prompts" prev="interests" next="bio" go={go}
      title="answer 3 prompts."
      sub="pick a prompt, write a sharp answer. at least 1."
      required valid={filled >= 1}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {slots.map(i => {
          const p = prompts[i];
          if (!p) {
            return (
              <button key={i} onClick={() => setPicking(i)} className="tile" style={{ borderStyle: 'dashed', borderColor: 'var(--line-2)' }}>
                <span style={{ color: 'var(--ink-3)' }}>add prompt #{i + 1}</span>
                <Icon name="plus" size={18} color="var(--ink-3)" />
              </button>
            );
          }
          return (
            <div key={i} className="card" style={{ background: `var(--${['peach','mint','lilac'][i]})`, border: 'none', position: 'relative' }}>
              <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>{p.q}</div>
              {p.a ? (
                <div className="h-display" style={{ marginTop: 4, fontSize: 19, lineHeight: 1.2, letterSpacing: '-0.015em', paddingRight: 70 }}>"{p.a}"</div>
              ) : (
                <button onClick={() => { setEditing(i); setDraft(''); }} className="btn soft" style={{ marginTop: 8, padding: '8px 14px', fontSize: 13 }}>write answer →</button>
              )}
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4 }}>
                <button onClick={() => { setEditing(i); setDraft(p.a || ''); }} style={{ width: 28, height: 28, borderRadius: 999, background: '#fff', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon name="edit" size={12} />
                </button>
                <button onClick={() => removeSlot(i)} style={{ width: 28, height: 28, borderRadius: 999, background: '#fff', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon name="x" size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* prompt picker sheet */}
      {picking !== null && (
        <>
          <div onClick={() => setPicking(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90 }} />
          <div className="float-up" style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 91, maxHeight: '85%',
            background: 'var(--bg)', borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: '14px 18px 24px', boxShadow: '0 -20px 60px rgba(0,0,0,0.2)',
            overflowY: 'auto',
          }}>
            <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--line-2)', margin: '0 auto 14px' }} />
            <div className="h-display" style={{ fontSize: 20, letterSpacing: '-0.025em' }}>pick a prompt</div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PROMPT_LIBRARY.map((q, idx) => (
                <button key={q} onClick={() => pickPrompt(q)} className="tile" style={{ background: `var(--${['peach','mint','lilac','butter','sky','rose'][idx % 6]})`, borderColor: 'transparent' }}>
                  <span>{q}</span>
                  <Icon name="chevron" size={14} color="var(--ink-3)" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* answer editor sheet */}
      {editing !== null && (
        <>
          <div onClick={() => setEditing(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90 }} />
          <div className="float-up" style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 91,
            background: 'var(--bg)', borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: '14px 18px 24px', boxShadow: '0 -20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--line-2)', margin: '0 auto 14px' }} />
            <div className="eyebrow">your prompt</div>
            <div className="h-display" style={{ fontSize: 20, letterSpacing: '-0.025em', marginTop: 4 }}>"{prompts[editing]?.q}"</div>
            <textarea
              className="input"
              autoFocus
              placeholder="be specific. be a little weird. people remember specific."
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 140))}
              style={{ marginTop: 14, minHeight: 100, resize: 'none', lineHeight: 1.4 }}
            />
            <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'right' }}>{140 - draft.length}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn soft" style={{ flex: '0 0 auto', paddingLeft: 22, paddingRight: 22 }} onClick={() => setEditing(null)}>cancel</button>
              <button className="btn coral" style={{ flex: 1 }} onClick={saveAnswer} disabled={!draft.trim()}>save</button>
            </div>
          </div>
        </>
      )}
    </QShell>
  );
}

Object.assign(window, {
  ONB_STEPS, stepNum, TOTAL,
  QShell, TileGrid, ChipMulti,
  QGender, QLookingFor, QRelationship, QHeight, QWork,
  QPronouns, QStarSign, QLifestyle, QValues, QInterests, QPrompts,
});
