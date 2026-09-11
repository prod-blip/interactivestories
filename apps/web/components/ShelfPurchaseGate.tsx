'use client';

import { type MouseEvent, type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isPremiumStory } from '@/lib/story-access';
import { PremiumPurchaseDialog } from './PremiumPurchaseButton';
import { useStoryAccess } from './StoryAccessProvider';

export function ShelfPurchaseGate({ children }: { children: ReactNode }) {
  const access = useStoryAccess();
  const router = useRouter();
  const [selectedHref, setSelectedHref] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedHref || !access.ready || !access.owned) return;
    const href = selectedHref;
    setSelectedHref(null);
    router.push(href);
  }, [access.owned, access.ready, router, selectedHref]);

  function interceptLockedStory(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-story-id]');
    const storyId = anchor?.dataset.storyId;

    if (!anchor || !storyId || !access.native || access.owned || !isPremiumStory(storyId)) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedHref(anchor.getAttribute('href'));
  }

  return (
    <div className="shelf-purchase-gate" onClickCapture={interceptLockedStory}>
      {children}
      <PremiumPurchaseDialog
        open={selectedHref !== null}
        onClose={() => setSelectedHref(null)}
        onUnlocked={() => {
          if (selectedHref) router.push(selectedHref);
        }}
      />
    </div>
  );
}
