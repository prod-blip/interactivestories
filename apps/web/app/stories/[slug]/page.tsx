import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpenText, Clock3, Heart, MousePointer2, Volume2 } from 'lucide-react';
import { BeginStoryButton } from '@/components/BeginStoryButton';
import { Header } from '@/components/Header';
import { Starfield } from '@/components/Starfield';
import { StoryArtwork } from '@/components/StoryArtwork';
import { getStory, stories } from '@/lib/stories';

export function generateStaticParams() {
  return stories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const story = getStory((await params).slug);
  return story ? { title: story.title, description: story.summary } : {};
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const story = getStory((await params).slug);
  if (!story) notFound();

  return (
    <main className="detail-page">
      <Starfield />
      <Header />
      <div className="shell detail-back">
        <Link href="/#stories"><ArrowLeft size={16} /> Back to the story shelf</Link>
      </div>
      <section className="shell detail-hero">
        <div className="detail-art"><StoryArtwork compact /></div>
        <div className="detail-copy">
          <p className="eyebrow">{story.eyebrow}</p>
          <h1>{story.title}</h1>
          <p className="detail-lede">{story.description}</p>
          <div className="story-meta story-meta--detail">
            <span><Clock3 size={16} /> {story.duration}</span>
            <span><BookOpenText size={16} /> {story.ageRange}</span>
            <span><MousePointer2 size={16} /> {story.participation}</span>
          </div>
          <BeginStoryButton href={`/stories/${story.slug}/play`} />
          <p className="start-note"><Volume2 size={15} /> Sound begins only after you interact with the story.</p>
        </div>
      </section>
      <section className="shell before-you-begin">
        <div>
          <p className="eyebrow">Before you begin</p>
          <h2>A story to share, not rush.</h2>
        </div>
        <div className="parent-cards">
          <article><span>01</span><h3>Read together</h3><p>The story pauses naturally so you can read each passage aloud.</p></article>
          <article><span>02</span><h3>Explore gently</h3><p>Help the little mouse move through the forest using keys or touch.</p></article>
          <article><span>03</span><h3>Talk about kindness</h3><p>Ask what each character might feel and what your child would do.</p></article>
        </div>
      </section>
      <section className="shell moral-card">
        <Heart size={22} />
        <div><p>The thought to carry to bed</p><blockquote>“{story.moral}”</blockquote></div>
      </section>
    </main>
  );
}
