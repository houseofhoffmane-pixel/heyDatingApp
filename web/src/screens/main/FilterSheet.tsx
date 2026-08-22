import { useEffect, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { api, ApiError } from '../../api/client';

interface Filters {
  lookingFor: string[];
  distanceMi: number;
  ageMin: number; ageMax: number;
  heightMinCm: number; heightMaxCm: number;
}

const LOOKING_FOR = ['women', 'men', 'non-binary', 'everyone'] as const;

/**
 * Discover filters. Bottom sheet on mobile, centered on desktop.
 * Loads current filters via GET /filters, saves on Apply.
 */
export function FilterSheet({ onClose, onApplied }: { onClose: () => void; onApplied: () => void }) {
  const [f, setF] = useState<Filters | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<Filters>('/filters')
      .then((r) => setF({
        lookingFor: r.lookingFor?.length ? r.lookingFor : ['everyone'],
        distanceMi: r.distanceMi ?? 25,
        ageMin: r.ageMin ?? 18,
        ageMax: r.ageMax ?? 99,
        heightMinCm: r.heightMinCm ?? 120,
        heightMaxCm: r.heightMaxCm ?? 220,
      }))
      .catch(() => setErr('Could not load filters.'));
  }, []);

  async function apply() {
    if (!f) return;
    setSaving(true); setErr(null);
    try {
      await api.put('/filters', f);
      onApplied();
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  const toggleLF = (v: string) => {
    if (!f) return;
    setF({
      ...f,
      lookingFor: f.lookingFor.includes(v)
        ? f.lookingFor.filter((x) => x !== v)
        : [...f.lookingFor.filter((x) => x !== 'everyone'), v].filter((x) => v === 'everyone' ? x === 'everyone' : true),
    });
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ padding: '4px 20px 24px', maxWidth: 500, margin: '0 auto' }}>
        <h2 className="h-display" style={{ fontSize: 22, marginBottom: 4 }}>filters</h2>
        <div className="meta" style={{ fontSize: 12, marginBottom: 20 }}>
          who + how far you want to see. saves for future sessions.
        </div>

        {!f ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>loading…</div>
        ) : (
          <>
            <div className="eyebrow" style={{ marginBottom: 10 }}>show me</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
              {LOOKING_FOR.map((v) => (
                <button
                  key={v}
                  onClick={() => toggleLF(v)}
                  className={`chip ${f.lookingFor.includes(v) ? 'solid' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="eyebrow" style={{ marginBottom: 10 }}>
              distance · <b style={{ color: 'var(--ink)' }}>{f.distanceMi} mi</b>
            </div>
            <input
              type="range" min={1} max={100} value={f.distanceMi}
              onChange={(e) => setF({ ...f, distanceMi: Number(e.target.value) })}
              style={{ width: '100%', marginBottom: 22 }}
            />

            <div className="eyebrow" style={{ marginBottom: 10 }}>
              age · <b style={{ color: 'var(--ink)' }}>{f.ageMin} – {f.ageMax}</b>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
              <label style={{ flex: 1, fontSize: 12 }}>
                min
                <input
                  type="number" min={18} max={99} value={f.ageMin}
                  onChange={(e) => setF({ ...f, ageMin: Math.max(18, Math.min(99, Number(e.target.value))) })}
                  className="input" style={{ marginTop: 4 }}
                />
              </label>
              <label style={{ flex: 1, fontSize: 12 }}>
                max
                <input
                  type="number" min={18} max={99} value={f.ageMax}
                  onChange={(e) => setF({ ...f, ageMax: Math.max(18, Math.min(99, Number(e.target.value))) })}
                  className="input" style={{ marginTop: 4 }}
                />
              </label>
            </div>

            <div className="eyebrow" style={{ marginBottom: 10 }}>
              height · <b style={{ color: 'var(--ink)' }}>{f.heightMinCm} – {f.heightMaxCm} cm</b>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
              <label style={{ flex: 1, fontSize: 12 }}>
                min
                <input
                  type="number" min={120} max={230} value={f.heightMinCm}
                  onChange={(e) => setF({ ...f, heightMinCm: Number(e.target.value) })}
                  className="input" style={{ marginTop: 4 }}
                />
              </label>
              <label style={{ flex: 1, fontSize: 12 }}>
                max
                <input
                  type="number" min={120} max={230} value={f.heightMaxCm}
                  onChange={(e) => setF({ ...f, heightMaxCm: Number(e.target.value) })}
                  className="input" style={{ marginTop: 4 }}
                />
              </label>
            </div>

            {err && <div style={{ color: 'var(--coral)', fontSize: 13, marginBottom: 10 }}>{err}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn soft" style={{ flex: 1 }} onClick={onClose}>cancel</button>
              <button className="btn coral" style={{ flex: 2 }} onClick={apply} disabled={saving}>
                {saving ? 'saving…' : 'apply filters'}
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
