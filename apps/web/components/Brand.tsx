'use client';

import Link from 'next/link';
import { MoonStar } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ReviewerAccessDialog } from './ReviewerAccessDialog';
import { useStoryAccess } from './StoryAccessProvider';

export function Brand() {
  const access = useStoryAccess();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const longPressTimer = useRef<number | undefined>(undefined);
  const suppressNextClick = useRef(false);

  function cancelLongPress() {
    if (longPressTimer.current !== undefined) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  }

  function beginLongPress(event: PointerEvent<HTMLAnchorElement>) {
    if (!access.native || access.owned || event.button !== 0) return;
    cancelLongPress();
    longPressTimer.current = window.setTimeout(() => {
      suppressNextClick.current = true;
      setReviewDialogOpen(true);
      longPressTimer.current = undefined;
    }, 1500);
  }

  useEffect(() => cancelLongPress, []);

  return (
    <>
      <Link
        className="brand"
        href="/"
        aria-label="Moonlit Stories home"
        onPointerDown={beginLongPress}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onContextMenu={(event) => {
          if (access.native) event.preventDefault();
        }}
        onClick={(event) => {
          if (!suppressNextClick.current) return;
          event.preventDefault();
          suppressNextClick.current = false;
        }}
      >
        <span className="brand-mark" aria-hidden="true">
          <MoonStar size={18} strokeWidth={1.7} />
        </span>
        <span>Moonlit Stories</span>
      </Link>
      <ReviewerAccessDialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} />
    </>
  );
}
