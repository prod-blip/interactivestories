'use client';

import { LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isPremiumStory } from '@/lib/story-access';
import { useStoryAccess } from './StoryAccessProvider';

const COMPLETED_STORIES_KEY = 'moonlit:completed-stories';

function hasCompletedStory(slug: string): boolean {
  try {
    const value = JSON.parse(window.localStorage.getItem(COMPLETED_STORIES_KEY) ?? '[]');
    return Array.isArray(value) && value.includes(slug);
  } catch {
    return false;
  }
}

export function StoryProgressBadge({ slug, playable }: { slug: string; playable: boolean }) {
  const [completed, setCompleted] = useState(false);
  const access = useStoryAccess();

  useEffect(() => {
    setCompleted(hasCompletedStory(slug));
  }, [slug]);

  if (isPremiumStory(slug) && !access.ready) {
    return <span className="story-status story-status--checking">Checking access…</span>;
  }

  if (!access.canAccess(slug)) {
    return (
      <span className="story-status story-status--locked">
        <LockKeyhole size={13} /> Locked
      </span>
    );
  }

  return (
    <span className={`story-status${completed ? ' story-status--completed' : ''}`}>
      <span /> {completed ? 'Story completed' : playable ? 'Ready to play' : 'Coming soon'}
    </span>
  );
}
