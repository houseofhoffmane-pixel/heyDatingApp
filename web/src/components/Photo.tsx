import { CSSProperties, ReactNode } from 'react';
import { toneFor } from './tone';

interface PhotoProps {
  /** URL for a real image. When omitted, the abstract painter runs. */
  src?: string | null;
  /** Seed for the deterministic abstract painter (name / photo id / etc.). */
  name?: string;
  style?: CSSProperties;
  vignette?: boolean;
  children?: ReactNode;
}

/**
 * Photo — either an actual signed URL from the backend OR an abstract
 * pastel painter driven off a stable seed. Never draws a face, and the
 * initial watermark is decorative only.
 *
 * Used everywhere: hero photos, carousels, profile cards, saved-spot
 * strips. Consumers put it inside a positioned wrapper — the photo
 * fills 100% of its parent.
 */
export function Photo({ src, name = 'A', style, vignette = true, children }: PhotoProps) {
  const tone = toneFor(name);
  const initial = (name || 'A').trim()[0]?.toUpperCase() ?? 'A';

  if (src) {
    return (
      <div className="photo" style={{ background: tone.bg, ...style }}>
        <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        {vignette && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.18))',
          }} />
        )}
        {children}
      </div>
    );
  }

  return (
    <div className="photo" style={{ background: tone.bg, ...style }}>
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
