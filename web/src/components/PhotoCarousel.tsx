import { useRef, useState } from 'react';
import { Photo } from './Photo';
import { Icon } from './Icon';

export interface CarouselPhoto {
  id: string;
  url?: string | null;
  seed?: string;
}

interface Props {
  photos: CarouselPhoto[];
  name: string;
  photoIdx: number;
  setPhotoIdx: (n: number) => void;
  height?: number | string;
  onOpen?: () => void;
  onLike?: (photoIdx: number) => void;
}

/**
 * Swipe/tap through a deck of photos.
 * - Tap left/right thirds → prev/next
 * - Tap center → onOpen (open profile)
 * - Drag horizontally → swipe
 * - Dot indicators at top
 * - Optional ♥ button in the corner
 *
 * Ported from screens-discover.jsx PhotoCarousel with pointer-based
 * gestures that work on mouse + touch alike.
 */
export function PhotoCarousel({ photos, name, photoIdx, setPhotoIdx, height, onOpen, onLike }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x0: number; dx: number; t0: number } | null>(null);
  const n = photos.length;

  const advance = (d: number) => {
    const next = Math.max(0, Math.min(n - 1, photoIdx + d));
    setPhotoIdx(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setDrag({ x0: e.clientX, dx: 0, t0: Date.now() });
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ ...drag, dx: e.clientX - drag.x0 });
  };
  const onPointerUp = () => {
    if (!drag) return;
    const { dx, t0 } = drag;
    const dt = Date.now() - t0;
    const fast = Math.abs(dx) > 60 || (dt < 250 && Math.abs(dx) > 30);
    if (fast) advance(dx < 0 ? 1 : -1);
    setDrag(null);
  };

  const w = ref.current?.offsetWidth || 1;
  const offset = drag ? Math.max(-w * 0.3, Math.min(w * 0.3, drag.dx)) : 0;

  return (
    <div ref={ref}
      style={{ position: 'relative', height: height ?? '100%', overflow: 'hidden', userSelect: 'none', touchAction: 'pan-y' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)}
    >
      {photos.map((ph, i) => {
        const dist = i - photoIdx;
        if (Math.abs(dist) > 1) return null;
        return (
          <div key={ph.id} style={{
            position: 'absolute', inset: 0,
            transform: `translateX(calc(${dist * 100}% + ${offset}px))`,
            transition: drag ? 'none' : 'transform 260ms cubic-bezier(.3,.7,.4,1)',
          }}>
            <Photo src={ph.url} name={ph.seed ?? `${name}-${i}`} />
          </div>
        );
      })}

      {/* tap zones */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        <div onClick={(e) => { e.stopPropagation(); advance(-1); }} style={{ flex: 1, cursor: 'pointer' }} />
        <div onClick={(e) => { e.stopPropagation(); onOpen?.(); }} style={{ flex: 1.4, cursor: onOpen ? 'pointer' : 'default' }} />
        <div onClick={(e) => { e.stopPropagation(); advance(1); }} style={{ flex: 1, cursor: 'pointer' }} />
      </div>

      {/* dot indicators */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 4, zIndex: 2 }}>
        {photos.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 999,
            background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)',
            transition: 'background 200ms',
          }} />
        ))}
      </div>

      {onLike && (
        <button onClick={(e) => { e.stopPropagation(); onLike(photoIdx); }} style={{
          position: 'absolute', bottom: 14, right: 14, zIndex: 4,
          width: 48, height: 48, borderRadius: 999, border: 0,
          background: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
        }}>
          <Icon name="heartFill" size={20} color="var(--coral)" />
        </button>
      )}
    </div>
  );
}
