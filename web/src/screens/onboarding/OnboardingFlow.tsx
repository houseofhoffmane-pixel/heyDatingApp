import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { QShell, TileGrid, ChipGrid } from './QShell';
import { Icon } from '../../components/Icon';

/**
 * Onboarding is a linear machine over the 14 steps that match the spec's
 * order. Each step patches the backend as it advances so refreshes don't
 * lose progress. Final step calls POST /onboarding/complete which flips
 * users.status → active (no verification gate).
 */

// `email-pass` step removed — users now set email + password up-front
// via /signup, so onboarding has nothing to collect there. Restore it
// to the end of this array when we bring the phone/OTP flow back.
const STEPS = [
  'name-dob', 'gender', 'lookingfor', 'relationship', 'height', 'work',
  'pronouns', 'starsign', 'lifestyle', 'values', 'interests',
  'prompts', 'bio', 'photos',
] as const;
type Step = (typeof STEPS)[number];

const TOTAL = STEPS.length;

export function OnboardingFlow() {
  const nav = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const step = STEPS[idx];

  // Pre-fetch onboarding state so returning users pick up where they left off.
  useEffect(() => {
    api.get<any>('/onboarding/state').catch(() => undefined);
  }, []);

  function next() {
    if (idx < TOTAL - 1) setIdx((i) => i + 1);
    else finish();
  }
  function back() { setIdx((i) => Math.max(0, i - 1)); }

  async function finish() {
    setBusy(true);
    try {
      await api.post('/onboarding/complete');
      // Refresh user status from /me — the server flips it to 'active'.
      const me = await api.get<{ account: { status: any } }>('/me');
      setUser({ ...useAuthStore.getState().user!, status: me.account?.status ?? 'active' });
      nav('/discover', { replace: true });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Could not complete onboarding.');
    } finally {
      setBusy(false);
    }
  }

  const props = {
    step: idx + 1, total: TOTAL,
    onBack: idx > 0 ? back : undefined,
    onNext: next,
    busy,
  };

  switch (step) {
    case 'name-dob':     return <NameDob {...props} />;
    case 'gender':       return <Gender {...props} />;
    case 'lookingfor':   return <LookingFor {...props} />;
    case 'relationship': return <Relationship {...props} />;
    case 'height':       return <Height {...props} />;
    case 'work':         return <Work {...props} />;
    case 'pronouns':     return <Pronouns {...props} />;
    case 'starsign':     return <StarSign {...props} />;
    case 'lifestyle':    return <Lifestyle {...props} />;
    case 'values':       return <Values {...props} />;
    case 'interests':    return <Interests {...props} />;
    case 'prompts':      return <Prompts {...props} />;
    case 'bio':          return <Bio {...props} />;
    case 'photos':       return <Photos {...props} />;
    case 'email-pass':   return <EmailPass {...props} />;
  }
}

interface StepProps { step: number; total: number; onBack?: () => void; onNext: () => void; busy?: boolean; }

// ─── 1. Name + DOB ─────────────────────────────────────────────

function NameDob(p: StepProps) {
  const [name, setName] = useState('');
  const [mm, setMm] = useState(''); const [dd, setDd] = useState(''); const [yyyy, setYyyy] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const age = useMemo(() => {
    const m = +mm, d = +dd, y = +yyyy;
    if (!m || !d || !y || String(yyyy).length !== 4 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const bday = new Date(y, m - 1, d);
    const t = new Date();
    let a = t.getFullYear() - bday.getFullYear();
    const mo = t.getMonth() - bday.getMonth();
    if (mo < 0 || (mo === 0 && t.getDate() < bday.getDate())) a--;
    return a;
  }, [mm, dd, yyyy]);

  const tooYoung = age !== null && age < 18;
  const isOldEnough = age !== null && age >= 18;
  const valid = !!name.trim() && isOldEnough && confirm;

  async function save() {
    setSaving(true); setErr(null);
    try {
      const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      await api.patch('/onboarding/profile', { name: name.trim(), dob: iso, ageConfirmed: confirm });
      p.onNext();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <QShell {...p} title="okay, the basics." sub="this is what people will see. age is locked once you set it — don't lie."
      required valid={valid} busy={saving || p.busy} onNext={save}
    >
      <div className="eyebrow" style={{ marginBottom: 8 }}>first name</div>
      <input className="input" placeholder="Ada" value={name} onChange={(e) => setName(e.target.value)} autoFocus />

      <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>birthday</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="MM" inputMode="numeric" maxLength={2} value={mm}
          onChange={(e) => setMm(e.target.value.replace(/\D/g, ''))}
          style={{ flex: 1, textAlign: 'center', borderColor: tooYoung ? 'var(--coral)' : undefined }} />
        <input className="input" placeholder="DD" inputMode="numeric" maxLength={2} value={dd}
          onChange={(e) => setDd(e.target.value.replace(/\D/g, ''))}
          style={{ flex: 1, textAlign: 'center', borderColor: tooYoung ? 'var(--coral)' : undefined }} />
        <input className="input" placeholder="YYYY" inputMode="numeric" maxLength={4} value={yyyy}
          onChange={(e) => setYyyy(e.target.value.replace(/\D/g, ''))}
          style={{ flex: 1.5, textAlign: 'center', borderColor: tooYoung ? 'var(--coral)' : undefined }} />
      </div>
      {tooYoung ? (
        <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--coral)', fontWeight: 600 }}>
          you must be 18 or older to use hey.
        </div>
      ) : isOldEnough && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>you're {age}. only your age shows.</div>
      )}

      <button onClick={() => setConfirm((v) => !v)} style={{
        marginTop: 18, display: 'flex', gap: 10, alignItems: 'flex-start',
        background: 'transparent', border: 0, textAlign: 'left', padding: 0,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
          border: `2px solid ${confirm ? 'var(--ink)' : 'var(--line-2)'}`,
          background: confirm ? 'var(--ink)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {confirm && <Icon name="check" size={13} color="#fff" />}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
          <b style={{ color: 'var(--ink)' }}>i confirm i'm 18+</b>
        </div>
      </button>

      {err && <div style={{ marginTop: 12, color: 'var(--coral)', fontSize: 13 }}>{err}</div>}
    </QShell>
  );
}

// ─── 2. Gender ─────────────────────────────────────────────────

function Gender(p: StepProps) {
  const [gender, setGender] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { await api.patch('/onboarding/profile', { gender }); p.onNext(); }
    finally { setSaving(false); }
  }
  return (
    <QShell {...p} title="what's your gender?" sub="how you describe yourself. you can hide it in settings."
      required valid={!!gender} busy={saving || p.busy} onNext={save}
    >
      <TileGrid value={gender} onChange={setGender} options={[
        { value: 'woman', label: 'woman', emoji: '♀️' },
        { value: 'man', label: 'man', emoji: '♂️' },
        { value: 'non_binary', label: 'non-binary', emoji: '⚧️' },
        { value: 'trans_woman', label: 'trans woman' },
        { value: 'trans_man', label: 'trans man' },
        { value: 'other', label: 'self-describe' },
      ]} />
    </QShell>
  );
}

// ─── 3. Looking for ────────────────────────────────────────────

function LookingFor(p: StepProps) {
  const [values, setValues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { await api.patch('/onboarding/profile', { lookingFor: values }); p.onNext(); }
    finally { setSaving(false); }
  }
  const toggle = (o: string) => setValues((vs) => vs.includes(o) ? vs.filter(x => x !== o) : [...vs, o]);

  return (
    <QShell {...p} title="who do you want to see?" sub="pick one or more. change it in filters any time."
      required valid={values.length > 0} busy={saving || p.busy} onNext={save}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { v: 'women', l: 'women' },
          { v: 'men', l: 'men' },
          { v: 'non-binary', l: 'non-binary folks' },
          { v: 'everyone', l: 'everyone' },
        ].map((o) => {
          const on = values.includes(o.v);
          return (
            <button key={o.v} className={'tile' + (on ? ' on' : '')} onClick={() => toggle(o.v)}>
              <span>{o.l}</span>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                border: `2px solid ${on ? '#fff' : 'var(--line-2)'}`,
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

// ─── 4. Relationship intent ────────────────────────────────────

function Relationship(p: StepProps) {
  const [rel, setRel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { await api.patch('/onboarding/profile', { relationshipIntent: rel }); p.onNext(); }
    finally { setSaving(false); }
  }
  return (
    <QShell {...p} title="what are you here for?" sub="no judgement. honesty saves everyone time."
      required valid={!!rel} busy={saving || p.busy} onNext={save}
    >
      <TileGrid value={rel} onChange={setRel} options={[
        { value: 'longterm',      label: 'long-term',              sub: 'open to whatever it turns into', emoji: '💍' },
        { value: 'longterm_open', label: 'long-term, open to short', sub: 'serious but not in a rush', emoji: '🌱' },
        { value: 'short_open',    label: 'short-term, open to long', sub: 'see what happens', emoji: '🍿' },
        { value: 'short',         label: 'short-term · fun',       sub: 'casual, not casual-cruel', emoji: '🎢' },
        { value: 'figuring_out',  label: 'still figuring it out',  sub: 'taste-testing the vibe', emoji: '🌀' },
        { value: 'friends',       label: 'new friends',            sub: 'no romance, just plot twists', emoji: '🤝' },
      ]} />
    </QShell>
  );
}

// ─── 5. Height ─────────────────────────────────────────────────

function Height(p: StepProps) {
  const [inches, setInches] = useState(66);
  const [saving, setSaving] = useState(false);
  const cm = Math.round(inches * 2.54);
  async function save() {
    setSaving(true);
    try { await api.patch('/onboarding/profile', { heightCm: cm }); p.onNext(); }
    finally { setSaving(false); }
  }
  return (
    <QShell {...p} title="how tall?" sub="people use this as a filter. it's okay."
      required valid={inches > 0} busy={saving || p.busy} onNext={save}
    >
      <div className="card" style={{ padding: 22, textAlign: 'center' }}>
        <div className="h-display" style={{ fontSize: 48, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {Math.floor(inches / 12)}<span style={{ fontSize: 28, color: 'var(--ink-3)', margin: '0 6px' }}>′</span>
          {inches % 12}<span style={{ fontSize: 28, color: 'var(--ink-3)', marginLeft: 4 }}>″</span>
        </div>
        <div className="meta" style={{ fontSize: 11, marginTop: 4 }}>{cm} cm</div>
        <input type="range" min={48} max={84} value={inches} onChange={(e) => setInches(+e.target.value)}
          style={{ width: '100%', accentColor: 'var(--coral)', marginTop: 18 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
          <span>4'0"</span><span>7'0"</span>
        </div>
      </div>
    </QShell>
  );
}

// ─── 6. Work + School ─────────────────────────────────────────

function Work(p: StepProps) {
  const [job, setJob] = useState(''); const [school, setSchool] = useState('');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      const patch: any = {};
      if (job.trim()) patch.job = job.trim();
      if (school.trim()) patch.school = school.trim();
      if (Object.keys(patch).length) await api.patch('/onboarding/profile', patch);
      p.onNext();
    } finally { setSaving(false); }
  }
  return (
    <QShell {...p} title="work & school?" sub="optional. people love a little context." valid busy={saving || p.busy} onNext={save} onSkip={p.onNext}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>job</div>
      <input className="input" placeholder="what you do (or what you say at parties)" value={job} onChange={(e) => setJob(e.target.value)} />
      <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>school</div>
      <input className="input" placeholder="university or high school" value={school} onChange={(e) => setSchool(e.target.value)} />
    </QShell>
  );
}

// ─── 7. Pronouns ──────────────────────────────────────────────

function Pronouns(p: StepProps) {
  const [pronouns, setPronouns] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      if (pronouns) await api.patch('/onboarding/profile', { pronouns });
      p.onNext();
    } finally { setSaving(false); }
  }
  return (
    <QShell {...p} title="your pronouns?" sub="shown next to your name on your profile."
      valid={!!pronouns} busy={saving || p.busy} onNext={save} onSkip={p.onNext}
    >
      <TileGrid value={pronouns} onChange={setPronouns} cols={2}
        options={['she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'self-describe']} />
    </QShell>
  );
}

// ─── 8. Star sign ─────────────────────────────────────────────

function StarSign(p: StepProps) {
  const [sign, setSign] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const signs: [string, string][] = [
    ['aries', '♈'], ['taurus', '♉'], ['gemini', '♊'], ['cancer', '♋'],
    ['leo', '♌'], ['virgo', '♍'], ['libra', '♎'], ['scorpio', '♏'],
    ['sagittarius', '♐'], ['capricorn', '♑'], ['aquarius', '♒'], ['pisces', '♓'],
  ];
  async function save() {
    setSaving(true);
    try {
      if (sign) await api.patch('/onboarding/profile', { starSign: sign });
      p.onNext();
    } finally { setSaving(false); }
  }
  return (
    <QShell {...p} title="star sign?" sub="we don't believe it either. people still ask."
      valid={!!sign} busy={saving || p.busy} onNext={save} onSkip={p.onNext}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {signs.map(([s, g]) => {
          const on = sign === s;
          return (
            <button key={s} className={'tile' + (on ? ' on' : '')}
              onClick={() => setSign(s)}
              style={{ flexDirection: 'column', alignItems: 'center', padding: '14px 8px', textAlign: 'center' }}>
              <span style={{ fontSize: 22 }}>{g}</span>
              <span style={{ fontSize: 12.5, marginTop: 4 }}>{s}</span>
            </button>
          );
        })}
      </div>
    </QShell>
  );
}

// ─── 9. Lifestyle ─────────────────────────────────────────────

function Lifestyle(p: StepProps) {
  const [drinks, setDrinks] = useState<string | null>(null);
  const [smokes, setSmokes] = useState<string | null>(null);
  const [exercise, setExercise] = useState<string | null>(null);
  const [w420, setW420] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      const life: any = {};
      if (drinks) life.drinks = drinks;
      if (smokes) life.smokes = smokes.replace(/ /g, '_');
      if (exercise) life.exercise = exercise.replace(/ /g, '_');
      if (w420) life.weed420 = w420;
      if (Object.keys(life).length) await api.patch('/onboarding/profile', { lifestyle: life });
      p.onNext();
    } finally { setSaving(false); }
  }
  const Row = ({ label, opts, val, set }: { label: string; opts: string[]; val: string | null; set: (v: string | null) => void }) => (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {opts.map((o) => {
          const on = val === o;
          return <button key={o} onClick={() => set(on ? null : o)} className={`chip ${on ? 'solid' : ''}`} style={{ fontSize: 13.5, padding: '8px 14px' }}>{o}</button>;
        })}
      </div>
    </div>
  );
  return (
    <QShell {...p} title="your lifestyle." sub="ten seconds. helps the vibe check." valid busy={saving || p.busy} onNext={save} onSkip={p.onNext}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Row label="drinks?" opts={['often', 'socially', 'rarely', 'never']} val={drinks} set={setDrinks} />
        <Row label="smokes?" opts={['regularly', 'socially', 'trying to quit', 'never']} val={smokes} set={setSmokes} />
        <Row label="exercise?" opts={['daily', 'few week', 'sometimes', 'never']} val={exercise} set={setExercise} />
        <Row label="420?" opts={['yes', 'sometimes', 'never']} val={w420} set={setW420} />
      </div>
    </QShell>
  );
}

// ─── 10. Values ───────────────────────────────────────────────

function Values(p: StepProps) {
  const [kids, setKids] = useState<string | null>(null);
  const [politics, setPolitics] = useState<string | null>(null);
  const [religion, setReligion] = useState<string | null>(null);
  const [monogamy, setMonogamy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      const v: any = {};
      if (kids) v.kids = kids.replace(/[ ,'']/g, '_').replace(/_+/g, '_');
      if (politics) v.politics = politics.replace(/ /g, '_');
      if (religion) v.religion = religion;
      if (monogamy) v.monogamy = monogamy.replace(/[- ]/g, '_');
      if (Object.keys(v).length) await api.patch('/onboarding/profile', { values: v });
      p.onNext();
    } finally { setSaving(false); }
  }
  const Row = ({ label, opts, val, set }: { label: string; opts: string[]; val: string | null; set: (v: string | null) => void }) => (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {opts.map((o) => {
          const on = val === o;
          return <button key={o} onClick={() => set(on ? null : o)} className={`chip ${on ? 'solid' : ''}`} style={{ fontSize: 13.5, padding: '8px 14px' }}>{o}</button>;
        })}
      </div>
    </div>
  );
  return (
    <QShell {...p} title="the values stuff." sub="the things people actually want to know before date #2."
      valid busy={saving || p.busy} onNext={save} onSkip={p.onNext}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Row label="kids?" opts={['want', 'have want more', 'have done', 'dont want', 'open', 'not sure']} val={kids} set={setKids} />
        <Row label="politics?" opts={['left', 'moderate', 'right', 'not political', 'rather not say']} val={politics} set={setPolitics} />
        <Row label="religion?" opts={['agnostic', 'atheist', 'christian', 'jewish', 'muslim', 'hindu', 'buddhist', 'spiritual', 'other']} val={religion} set={setReligion} />
        <Row label="monogamy?" opts={['monogamous', 'monogamish', 'non-monogamous', 'figuring']} val={monogamy} set={setMonogamy} />
      </div>
    </QShell>
  );
}

// ─── 11. Interests ────────────────────────────────────────────

function Interests(p: StepProps) {
  const [all, setAll] = useState<{ id: string; slug: string; label: string; category: string }[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get<{ id: string; slug: string; label: string; category: string }[]>('/onboarding/state').catch(() => undefined);
    // Fetch from admin catalog — no auth-gated admin needed; we hit /onboarding/state's server catalogs via a dedicated route.
    // Fallback: fetch via /admin/interests would require admin auth. Use a lightweight bootstrap via the seed.
    fetch('/api/v1/onboarding/interests-catalog', { headers: { authorization: `Bearer ${useAuthStore.getState().accessToken}` } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setAll)
      .catch(() => setAll([]));
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, typeof all> = {};
    for (const i of all) (g[i.category] ??= []).push(i);
    return g;
  }, [all]);

  const toggle = (id: string) => setPicked((ps) => ps.includes(id) ? ps.filter(x => x !== id) : (ps.length < 6 ? [...ps, id] : ps));

  async function save() {
    setSaving(true);
    try {
      await api.post('/onboarding/interests', { interest_ids: picked });
      p.onNext();
    } finally { setSaving(false); }
  }

  return (
    <QShell {...p} title="what's your thing?" sub="pick at least 3. up to 6."
      required valid={picked.length >= 3} primaryLabel={`continue · ${picked.length}/6`}
      busy={saving || p.busy} onNext={save}
    >
      {all.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>loading interests…</div>
      ) : Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{cat.replace(/-/g, ' ')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {items.map((it) => {
              const on = picked.includes(it.id);
              const disabled = !on && picked.length >= 6;
              return (
                <button key={it.id} onClick={() => !disabled && toggle(it.id)}
                  className={`chip ${on ? 'solid' : ''}`}
                  style={{ fontSize: 13, padding: '7px 12px', opacity: disabled ? 0.4 : 1 }}>
                  {on && <Icon name="check" size={10} color="#fff" />} {it.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </QShell>
  );
}

// ─── 12. Prompts ──────────────────────────────────────────────

function Prompts(p: StepProps) {
  const [prompts, setPrompts] = useState<{ id: string; text: string }[]>([]);
  const [chosen, setChosen] = useState<{ prompt_id: string; answer: string }[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch('/api/v1/onboarding/prompts-catalog', { headers: { authorization: `Bearer ${useAuthStore.getState().accessToken}` } })
      .then((r) => r.ok ? r.json() : [])
      .then(setPrompts)
      .catch(() => setPrompts([]));
  }, []);
  async function save() {
    setSaving(true);
    try {
      await api.post('/onboarding/prompts', { items: chosen.filter((c) => c.answer.trim()) });
      p.onNext();
    } finally { setSaving(false); }
  }
  const usable = chosen.filter((c) => c.answer.trim());
  const canAdd = chosen.length < 3;

  return (
    <QShell {...p} title="answer a prompt." sub="pick one to three. write something specific."
      required valid={usable.length >= 1} busy={saving || p.busy} onNext={save}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {chosen.map((c, i) => {
          const prompt = prompts.find((p) => p.id === c.prompt_id);
          const tones = ['peach', 'mint', 'lilac'];
          return (
            <div key={i} className="card" style={{ background: `var(--${tones[i]})`, border: 'none', position: 'relative' }}>
              <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>{prompt?.text}</div>
              <textarea
                className="input"
                style={{ marginTop: 8, minHeight: 80, background: '#fff' }}
                placeholder="be specific. people remember specific."
                value={c.answer} maxLength={140}
                onChange={(e) => setChosen((cs) => cs.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))}
              />
              <button onClick={() => setChosen((cs) => cs.filter((_, j) => j !== i))}
                style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 999, background: '#fff', border: 0 }}>
                <Icon name="x" size={12} />
              </button>
            </div>
          );
        })}
        {canAdd && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>pick a prompt</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {prompts
                .filter((p) => !chosen.find((c) => c.prompt_id === p.id))
                .map((p) => (
                  <button key={p.id} onClick={() => setChosen((cs) => [...cs, { prompt_id: p.id, answer: '' }])}
                    className="chip" style={{ fontSize: 13 }}>+ {p.text}</button>
                ))}
            </div>
          </div>
        )}
      </div>
    </QShell>
  );
}

// ─── 13. Bio ──────────────────────────────────────────────────

function Bio(p: StepProps) {
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { await api.patch('/onboarding/profile', { bio: bio.trim() }); p.onNext(); }
    finally { setSaving(false); }
  }
  return (
    <QShell {...p} title="a tiny bio." sub="three sentences max. tell us something true, not impressive."
      required valid={bio.trim().length >= 8} busy={saving || p.busy} onNext={save}
    >
      <div style={{ position: 'relative' }}>
        <textarea
          className="input"
          placeholder="i make decent pasta, i'm bad at parallel parking, ask me about my hot takes on rom-coms."
          value={bio} maxLength={180}
          onChange={(e) => setBio(e.target.value)}
          style={{ minHeight: 130, lineHeight: 1.45, resize: 'none' }}
        />
        <div style={{ position: 'absolute', right: 12, bottom: 10, fontFamily: 'var(--mono)', fontSize: 11, color: (180 - bio.length) < 20 ? 'var(--coral)' : 'var(--ink-3)' }}>
          {180 - bio.length}
        </div>
      </div>
    </QShell>
  );
}

// ─── 14. Photos ───────────────────────────────────────────────

function Photos(p: StepProps) {
  const [photos, setPhotos] = useState<{ id: string; url: string; position: number; isMain: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = photos.length >= 2;

  async function refresh() {
    const me = await api.get<{ photos?: any[] }>('/me').catch(() => ({ photos: [] as any[] }));
    setPhotos((me.photos ?? []).map((ph) => ({ id: ph.id, url: ph.url, position: ph.position, isMain: ph.isMain })));
  }
  useEffect(() => { refresh(); }, []);

  async function upload(file: File) {
    setUploading(true); setErr(null);
    try {
      const signed = await api.post<{ uploadUrl: string; s3Key: string; headers?: Record<string, string> }>(
        '/photos/upload-url', { contentType: file.type },
      );
      const put = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: signed.headers ?? {},
        body: file,
      });
      if (!put.ok) throw new Error('upload failed');
      await api.post('/photos/confirm', { s3Key: signed.s3Key });
      await refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    await api.delete(`/photos/${id}`);
    await refresh();
  }

  return (
    <QShell {...p} title="show up." sub="add at least 2. first one becomes your main."
      required valid={valid} busy={p.busy} onNext={p.onNext} primaryLabel={`continue · ${photos.length}/6`}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => {
          const ph = photos[i];
          if (ph) {
            return (
              <div key={ph.id} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden' }}>
                <img src={ph.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => remove(ph.id)} style={{
                  position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 999,
                  background: 'rgba(0,0,0,0.6)', border: 0,
                }}>
                  <Icon name="x" size={12} color="#fff" />
                </button>
                {i === 0 && (
                  <div style={{
                    position: 'absolute', top: 8, left: 8, background: 'var(--coral)', color: '#fff',
                    fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 7px', borderRadius: 999,
                  }}>MAIN</div>
                )}
              </div>
            );
          }
          return (
            <label key={i} style={{
              aspectRatio: '3/4', border: '2px dashed var(--line-2)', borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
              gap: 4, color: 'var(--ink-3)', cursor: 'pointer', background: 'var(--bg-2)',
            }}>
              <Icon name="plus" size={20} />
              <input type="file" accept="image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = '';
              }} />
              {i === 0 && <span style={{ fontSize: 10, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 0.08 }}>main</span>}
            </label>
          );
        })}
      </div>

      {uploading && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-3)' }}>uploading…</div>}
      {err && <div style={{ marginTop: 12, color: 'var(--coral)', fontSize: 13 }}>{err}</div>}
    </QShell>
  );
}

// ─── 15. Email + password (optional) ──────────────────────────

function EmailPass(p: StepProps) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const valid = /^\S+@\S+\.\S+$/.test(email) && password.length >= 8;
  async function save() {
    setSaving(true);
    try {
      if (valid) await api.post('/onboarding/email-pass', { email, password });
      p.onNext();
    } finally { setSaving(false); }
  }
  return (
    <QShell {...p} title="secure it." sub="your number is your main login. add an email + password as backup."
      valid busy={saving || p.busy} onNext={save} onSkip={p.onNext}
    >
      <div className="eyebrow" style={{ marginBottom: 8 }}>email</div>
      <input className="input" type="email" placeholder="you@somewhere.com"
        value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" />

      <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>password</div>
      <div style={{ position: 'relative' }}>
        <input className="input" type={reveal ? 'text' : 'password'} placeholder="at least 8 characters"
          value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: 60 }} />
        <button type="button" onClick={() => setReveal((v) => !v)} style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 0, color: 'var(--ink-3)', fontSize: 12, fontWeight: 600,
          padding: '6px 10px', fontFamily: 'var(--mono)', letterSpacing: 0.06,
        }}>{reveal ? 'HIDE' : 'SHOW'}</button>
      </div>
    </QShell>
  );
}
