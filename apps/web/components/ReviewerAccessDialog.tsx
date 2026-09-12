'use client';

import { ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useStoryAccess } from './StoryAccessProvider';

export function ReviewerAccessDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const access = useStoryAccess();
  const input = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode('');
    setError('');
    window.setTimeout(() => input.current?.focus(), 50);
  }, [open]);

  if (!open || !access.native || access.owned) return null;

  function close() {
    if (checking) return;
    setError('');
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) return;

    setChecking(true);
    setError('');
    try {
      if (await access.unlockForReview(code)) {
        onClose();
      } else {
        setError('That review access code is not valid.');
        input.current?.select();
      }
    } catch {
      setError('Review access could not be verified. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  return createPortal(
    <div
      className="purchase-gate-backdrop reviewer-access-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        className="purchase-gate reviewer-access-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reviewer-access-title"
        aria-describedby="reviewer-access-description"
        onKeyDown={(event) => {
          if (event.key === 'Escape') close();
        }}
      >
        <button className="purchase-gate-close" type="button" onClick={close} aria-label="Close review access">
          <X size={18} />
        </button>
        <span className="purchase-gate-icon"><ShieldCheck size={22} /></span>
        <h2 id="reviewer-access-title">Review access</h2>
        <p id="reviewer-access-description">Enter the access code supplied in Google Play Console.</p>
        <form className="reviewer-access-form" onSubmit={submit}>
          <label htmlFor="reviewer-access-code">Access code</label>
          <input
            id="reviewer-access-code"
            ref={input}
            type="password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {error && <p className="reviewer-access-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={checking || !code.trim()}>
            {checking ? 'Checking…' : 'Unlock for review'}
          </button>
          <button className="purchase-cancel" type="button" onClick={close} disabled={checking}>
            Cancel
          </button>
        </form>
      </section>
    </div>,
    document.body,
  );
}
