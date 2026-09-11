'use client';

import Link from 'next/link';
import { ArrowLeft, LoaderCircle, LockKeyhole } from 'lucide-react';
import { isPremiumStory } from '@/lib/story-access';
import { GameFrame, type GameFrameProps } from './GameFrame';
import { PremiumPurchaseButton } from './PremiumPurchaseButton';
import { useStoryAccess } from './StoryAccessProvider';

export function ProtectedGameFrame(props: GameFrameProps) {
  const access = useStoryAccess();

  if (isPremiumStory(props.storyId) && !access.ready) {
    return (
      <main className="access-screen" role="status">
        <LoaderCircle className="spin" size={28} />
        <p>Checking story access…</p>
      </main>
    );
  }

  if (!access.canAccess(props.storyId)) {
    return (
      <main className="access-screen">
        <LockKeyhole size={30} />
        <h1>Unlock the whole shelf</h1>
        <p>Unlock the whole shelf and enjoy all stories.</p>
        <PremiumPurchaseButton />
        <Link className="text-link" href={props.storyHref}><ArrowLeft size={15} /> Back to the story</Link>
      </main>
    );
  }

  return <GameFrame {...props} />;
}
