'use client';

import { useEffect, useState } from 'react';

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

  useEffect(() => {
    setCompleted(hasCompletedStory(slug));
  }, [slug]);

  return (
    <span className={`story-status${completed ? ' story-status--completed' : ''}`}>
      <span /> {completed ? 'Story completed' : playable ? 'Ready to play' : 'Coming soon'}
    </span>
  );
}
