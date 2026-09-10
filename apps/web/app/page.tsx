import Link from 'next/link';
import { Moon, Sparkles } from 'lucide-react';
import { Header } from '@/components/Header';
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
          <p><Sparkles size={15} /> Four gentle adventures, made for reading and exploring together.</p>
        </div>

        <section className="shell story-shelf" id="stories" aria-label="Story shelf">
          <ShelfScroller>
            {stories.map((story, index) => (
              <Link
                className={`shelf-book shelf-book--${index + 1}`}
                href={`/stories/${story.slug}/play`}
                aria-label={`Open ${story.title}`}
                key={story.slug}
              >
                <div className="book-cover">
                  <StoryArtwork compact variant={artworkVariant(story.slug)} />
                  <div className="book-cover-shade" aria-hidden="true" />
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
        </section>

        <p className="library-footer">No ads · No scores · Just a story, shared slowly</p>
      </section>
    </main>
  );
}
