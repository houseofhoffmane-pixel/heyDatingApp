import { ReactNode } from 'react';
import { Icon } from '../../components/Icon';

interface Props {
  step: number;
  total: number;
  title: string;
  sub?: ReactNode;
  required?: boolean;
  valid: boolean;
  primaryLabel?: string;
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  children: ReactNode;
  busy?: boolean;
}

/**
 * Shared shell for every onboarding step. Progress bar, back button,
 * step counter, title, sub, body slot, sticky continue bar with
 * skip when the step is optional. Same pattern as the prototype's
 * <QShell />.
 */
export function QShell({
  step, total, title, sub, required, valid, primaryLabel = 'continue',
  onBack, onNext, onSkip, children, busy,
}: Props) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 560,
        display: 'flex', flexDirection: 'column',
        padding: '24px 20px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          {onBack ? (
            <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="back" size={18} />
            </button>
          ) : <span />}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 0.06, color: 'var(--ink-3)' }}>
            {step} / {total}
          </div>
        </div>

        <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 999, margin: '4px 0 16px' }}>
          <div style={{ width: `${(step / total) * 100}%`, height: '100%', background: 'var(--coral)', borderRadius: 999, transition: 'width 220ms' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="eyebrow">step {step}</div>
            {required ? (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 6px', borderRadius: 999, background: 'var(--coral)', color: '#fff', letterSpacing: 0.06 }}>REQUIRED</span>
            ) : (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 6px', borderRadius: 999, background: 'rgba(0,0,0,0.06)', color: 'var(--ink-3)', letterSpacing: 0.06 }}>OPTIONAL</span>
            )}
          </div>
          <h1 className="h-display h-2" style={{ marginTop: 10 }}>{title}</h1>
          {sub && <div style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 15, lineHeight: 1.4 }}>{sub}</div>}
          <div style={{ marginTop: 22 }}>{children}</div>
        </div>

        <div style={{
          position: 'sticky', bottom: 0,
          padding: '12px 0 24px',
          background: 'linear-gradient(180deg, transparent, var(--bg) 24%)',
        }}>
          <button className="btn coral full lg" disabled={!valid || busy} onClick={onNext}>
            {busy ? 'saving…' : primaryLabel}
          </button>
          {!required && onSkip && (
            <button className="btn ghost full" onClick={onSkip} style={{ marginTop: 4, fontSize: 13 }}>
              skip — i'll add later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Tile grid — reused across gender / relationship / pronouns / star sign
interface TileOption { value: string; label: string; emoji?: string; sub?: string; }
interface TileGridProps { value: string | null; onChange: (v: string) => void; options: (string | TileOption)[]; cols?: number; }
export function TileGrid({ value, onChange, options, cols = 1 }: TileGridProps) {
  return (
    <div style={{ display: cols === 1 ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      {options.map((o) => {
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
                {sub && <div style={{ fontSize: 12, color: on ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
              </div>
            </div>
            {on && <Icon name="check" size={18} color="#fff" />}
          </button>
        );
      })}
    </div>
  );
}

interface ChipGridProps { options: string[]; values: string[]; onToggle: (v: string) => void; max?: number; }
export function ChipGrid({ options, values, onToggle, max }: ChipGridProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => {
        const on = values.includes(o);
        const disabled = !on && max !== undefined && values.length >= max;
        return (
          <button key={o} onClick={() => !disabled && onToggle(o)} className={`chip ${on ? 'solid' : ''}`}
            style={{ fontSize: 13.5, padding: '8px 14px', opacity: disabled ? 0.4 : 1 }}>
            {on && <Icon name="check" size={11} color="#fff" />} {o}
          </button>
        );
      })}
    </div>
  );
}
