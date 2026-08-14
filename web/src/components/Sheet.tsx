import { ReactNode, useEffect } from 'react';

interface Props {
  onClose: () => void;
  children: ReactNode;
  /** Prevent close-on-scrim-click. Useful for destructive confirmations. */
  lockScrim?: boolean;
}

/**
 * Bottom-sheet modal (mobile) that centers itself on desktop. Uses the
 * `.scrim` + `.sheet` classes from globals.css so the slide-up + fade
 * animations are inherited.
 */
export function Sheet({ onClose, children, lockScrim }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="scrim" onClick={() => !lockScrim && onClose()}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {children}
      </div>
    </div>
  );
}
