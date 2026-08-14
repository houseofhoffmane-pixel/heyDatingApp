import { useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { Photo } from '../../components/Photo';
import { Icon } from '../../components/Icon';

export type LikeAnchor =
  | { kind: 'photo'; photoId: string; photoUrl?: string | null; personName: string; photoIdx: number; photoCount: number }
  | { kind: 'prompt'; promptId: string; question: string; answer: string; personName: string };

interface Props {
  anchor: LikeAnchor;
  onClose: () => void;
  onSend: (comment: string) => Promise<void>;
}

/**
 * "Say something to X" — the like sheet that captures an optional
 * comment before the like fires. Same layout as the prototype's
 * LikeSheet: anchor preview at top, textarea, suggested-comment
 * chips, cancel + send.
 */
export function LikeSheet({ anchor, onClose, onSend }: Props) {
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const max = 140;

  async function send() {
    setSending(true);
    try { await onSend(comment.trim()); }
    finally { setSending(false); }
  }

  return (
    <Sheet onClose={onClose}>
      {anchor.kind === 'prompt' && (
        <div className="card" style={{ background: 'var(--butter)', border: 'none', marginBottom: 14 }}>
          <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>you're replying to {anchor.personName}'s</div>
          <div style={{ marginTop: 4, fontSize: 13, fontWeight: 600 }}>{anchor.question}</div>
          <div className="h-display" style={{ marginTop: 4, fontSize: 18, lineHeight: 1.25, letterSpacing: '-0.015em' }}>
            {anchor.answer}
          </div>
        </div>
      )}

      {anchor.kind === 'photo' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
          <div style={{ width: 64, height: 80, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
            <Photo src={anchor.photoUrl} name={`${anchor.personName}-${anchor.photoIdx}`} vignette={false} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">you're commenting on {anchor.personName}'s</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>
              photo {anchor.photoIdx + 1} of {anchor.photoCount}
            </div>
            <div className="meta" style={{ fontSize: 11, marginTop: 1 }}>your note sticks to this photo</div>
          </div>
        </div>
      )}

      <div className="h-display" style={{ fontSize: 24, letterSpacing: '-0.025em' }}>
        say something to {anchor.personName}.
      </div>
      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-3)' }}>
        optional, but 3× more likely to match. don't be a creep.
      </div>

      <div style={{ marginTop: 14, position: 'relative' }}>
        <textarea
          className="input"
          value={comment} maxLength={max}
          placeholder={anchor.kind === 'photo' ? 'something specific about this photo.' : "something specific. anything but 'hey'."}
          onChange={(e) => setComment(e.target.value)}
          style={{ minHeight: 88, resize: 'none', lineHeight: 1.4 }}
          autoFocus
        />
        <div style={{ position: 'absolute', right: 12, bottom: 10, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
          {max - comment.length}
        </div>
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(anchor.kind === 'photo'
          ? ['"this energy"', '"the outfit specifically"', '"wait where is this"']
          : ['"the bar in your bio…"', '"okay but the matcha thing"', "\"what's the rabbit hole rn?\""])
          .map((s) => (
            <button key={s} onClick={() => setComment(s.replace(/"/g, ''))} style={{
              padding: '6px 12px', borderRadius: 999, background: 'var(--card)',
              border: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-2)',
            }}>{s}</button>
          ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="btn soft" style={{ flex: '0 0 auto', paddingLeft: 22, paddingRight: 22 }} onClick={onClose} disabled={sending}>
          cancel
        </button>
        <button className="btn coral" style={{ flex: 1 }} onClick={send} disabled={sending}>
          <Icon name="heartFill" size={16} color="#fff" />
          {sending ? 'sending…' : comment.trim() ? 'send with comment' : 'send anyway →'}
        </button>
      </div>
    </Sheet>
  );
}
