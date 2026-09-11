'use client';

import { LockKeyhole, RefreshCw, ShoppingBag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStoryAccess } from './StoryAccessProvider';

type PremiumPurchaseDialogProps = {
  open: boolean;
  onClose(): void;
  onUnlocked?(): void;
};

const PURCHASE_HISTORY_KEY = 'moonlitPurchaseDialog';

export function PremiumPurchaseDialog({ open, onClose, onUnlocked }: PremiumPurchaseDialogProps) {
  const access = useStoryAccess();
  const dialog = useRef<HTMLElement>(null);
  const historyEntry = useRef(false);
  const onCloseRef = useRef(onClose);
  const [feedback, setFeedback] = useState('');

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    window.history.pushState(
      { ...window.history.state, [PURCHASE_HISTORY_KEY]: true },
      '',
      window.location.href,
    );
    historyEntry.current = true;
    dialog.current?.focus();

    const handleBack = () => {
      historyEntry.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [open]);

  if (!open || !access.native || access.owned) return null;

  function close(force = false) {
    if (access.purchasing && !force) return;
    setFeedback('');
    if (historyEntry.current && window.history.state?.[PURCHASE_HISTORY_KEY]) {
      historyEntry.current = false;
      window.history.back();
    }
    onClose();
  }

  async function purchase() {
    setFeedback('');
    try {
      const result = await access.purchase();
      if (result.owned) {
        close(true);
        window.setTimeout(() => onUnlocked?.(), 50);
      } else if (result.pending) {
        setFeedback('Waiting for approval. The shelf will unlock automatically when Google Play confirms the purchase.');
      } else if (result.cancelled) {
        setFeedback('No purchase was made.');
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The purchase could not be completed.');
    }
  }

  async function restore() {
    setFeedback('');
    try {
      const result = await access.restore();
      if (result.owned) {
        close(true);
        window.setTimeout(() => onUnlocked?.(), 50);
      } else {
        setFeedback('No previous purchase was found for this Google Play account.');
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Purchases could not be restored.');
    }
  }

  return createPortal(
    <div className="purchase-gate-backdrop" role="presentation" onPointerDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <section
        className="purchase-gate"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-gate-title"
        aria-describedby="purchase-gate-description"
        ref={dialog}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close();
        }}
      >
        <button className="purchase-gate-close" type="button" onClick={() => close()} aria-label="Close purchase window">
          <X size={18} />
        </button>
        <span className="purchase-gate-icon"><ShoppingBag size={22} /></span>
        <h2 id="purchase-gate-title">Unlock the whole shelf</h2>
        <p id="purchase-gate-description">Unlock the whole shelf and enjoy all stories.</p>
        <div className="purchase-gate-actions">
          <button
            className="primary-button"
            type="button"
            onClick={purchase}
            disabled={access.purchasing || !access.available}
          >
            {access.purchasing ? 'Opening Google Play…' : 'Continue to Google Play'}
          </button>
          <p className="purchase-play-note">
            {!access.ready
              ? 'Checking purchase availability.'
              : access.available
                ? 'Google Play will show the price before you confirm.'
                : 'The payment screen will become available after this product is activated in Google Play.'}
          </p>
          <button className="purchase-cancel" type="button" onClick={() => close()} disabled={access.purchasing}>
            Not now
          </button>
          <button className="purchase-restore" type="button" onClick={restore} disabled={access.purchasing}>
            <RefreshCw size={15} /> Already purchased? Restore
          </button>
        </div>
        {feedback && <p className="purchase-feedback" role="status">{feedback}</p>}
      </section>
    </div>,
    document.body,
  );
}

export function PremiumPurchaseButton({
  className = 'primary-button',
  label = 'Unlock the whole shelf',
  onUnlocked,
}: {
  className?: string;
  label?: string;
  onUnlocked?(): void;
}) {
  const access = useStoryAccess();
  const [open, setOpen] = useState(false);

  if (!access.native || access.owned) return null;

  return (
    <>
      <button className={`${className} purchase-button`} type="button" onClick={() => setOpen(true)}>
        <LockKeyhole size={17} /> {label}
      </button>
      <PremiumPurchaseDialog open={open} onClose={() => setOpen(false)} onUnlocked={onUnlocked} />
    </>
  );
}
