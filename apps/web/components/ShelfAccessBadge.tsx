'use client';

import { LoaderCircle, LockKeyhole } from 'lucide-react';
import { isPremiumStory } from '@/lib/story-access';
import { useStoryAccess } from './StoryAccessProvider';

export function ShelfAccessBadge({ storyId }: { storyId: string }) {
  const access = useStoryAccess();

  if (!isPremiumStory(storyId) || !access.native || access.owned) return null;

  if (!access.ready) {
    return (
      <span className="shelf-access-badge">
        <LoaderCircle className="spin" size={12} /> Checking access
      </span>
    );
  }

  return (
    <span className="shelf-access-badge">
      <LockKeyhole size={12} /> Locked
    </span>
  );
}
