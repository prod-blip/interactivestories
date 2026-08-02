import { notFound } from 'next/navigation';
import { GameFrame } from '@/components/GameFrame';
import { getStory, stories } from '@/lib/stories';

export function generateStaticParams() {
  return stories.map(({ slug }) => ({ slug }));
}

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const story = getStory((await params).slug);
  if (!story || !story.playable) notFound();

  return <GameFrame title={story.title} storyHref={`/stories/${story.slug}`} src={story.entry} />;
}
