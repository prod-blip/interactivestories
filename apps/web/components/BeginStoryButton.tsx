'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BeginStoryButton({ href }: { href: string }) {
  const router = useRouter();

  async function beginStory() {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      } catch {
        // Some mobile browsers do not allow document-level fullscreen. The
        // play page remains a full-viewport experience in that case.
      }
    }

    router.push(href);
  }

  return (
    <button className="primary-button begin-story-button" type="button" onClick={beginStory}>
      Begin the story <ArrowRight size={17} />
    </button>
  );
}
