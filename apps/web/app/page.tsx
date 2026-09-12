import Link from 'next/link';
import { Moon, Sparkles } from 'lucide-react';
import { Header } from '@/components/Header';
import { PremiumPurchaseButton } from '@/components/PremiumPurchaseButton';
import { ShelfAccessBadge } from '@/components/ShelfAccessBadge';
import { ShelfPurchaseGate } from '@/components/ShelfPurchaseGate';
import { ShelfScroller } from '@/components/ShelfScroller';
import { Starfield } from '@/components/Starfield';
import { StoryArtwork } from '@/components/StoryArtwork';
import { stories } from '@/lib/stories';

function artworkVariant(slug: string) {
  if (slug === 'crow-and-pitcher') return 'crow-and-pitcher' as const;
  if (slug === 'tortoise-and-rabbit') return 'tortoise-and-rabbit' as const;
  if (slug === 'tortoise-and-tiger') return 'tortoise-and-tiger' as const;
  return 'mouse-and-lion' as const;
}

export default function Home() {
  return (
    <main className="library-page">
      <section className="library-night">
        <Starfield />
        <Header />

        <div className="shell library-heading">
          <div>
            <p className="eyebrow"><Moon size={14} /> The moonlit library</p>
            <h1>Choose a story<br /> <em>from the shelf.</em></h1>
          </div>
          <div className="library-heading-aside">
            <p><Sparkles size={15} /> Gentle adventures, made for reading and exploring together.</p>
            <PremiumPurchaseButton className="shelf-unlock-button" />
          </div>
        </div>

        <section className="shell story-shelf" id="stories" aria-label="Story shelf">
          <ShelfPurchaseGate>
            <ShelfScroller>
              {stories.map((story, index) => (
                <Link
                  className={`shelf-book shelf-book--${index + 1}`}
                  href={`/stories/${story.slug}/play`}
                  data-story-id={story.slug}
                  aria-label={`Open ${story.title}`}
                  key={story.slug}
                >
                  <div className="book-cover">
                    <StoryArtwork compact variant={artworkVariant(story.slug)} />
                    <div className="book-cover-shade" aria-hidden="true" />
                    <ShelfAccessBadge storyId={story.slug} />
                    <div className="book-title">
                      <small>{story.eyebrow}</small>
                      <h2>{story.title}</h2>
                    </div>
                  </div>
                  <div className="book-details">
                    <p>{story.summary}</p>
                  </div>
                </Link>
              ))}
            </ShelfScroller>
          </ShelfPurchaseGate>
        </section>

        <p className="library-footer">
          <span>No ads · No scores · Just a story, shared slowly</span>
          <Link href="/privacy">Privacy</Link>
        </p>
      </section>
    </main>
  );
}
