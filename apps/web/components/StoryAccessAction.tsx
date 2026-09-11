'use client';

import { LoaderCircle } from 'lucide-react';
import { BeginStoryButton } from './BeginStoryButton';
import { PremiumPurchaseButton } from './PremiumPurchaseButton';
import { useStoryAccess } from './StoryAccessProvider';
import { isPremiumStory } from '@/lib/story-access';

export function StoryAccessAction({ storyId, href }: { storyId: string; href: string }) {
  const access = useStoryAccess();

  if (isPremiumStory(storyId) && !access.ready) {
    return (
      <button className="primary-button begin-story-button" type="button" disabled>
        <LoaderCircle className="spin" size={17} /> Checking access…
      </button>
    );
  }

  if (!access.canAccess(storyId)) return <PremiumPurchaseButton />;
  return <BeginStoryButton href={href} />;
}
