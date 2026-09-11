import { notFound } from 'next/navigation';
import { ProtectedGameFrame } from '@/components/ProtectedGameFrame';
import { getStory, stories } from '@/lib/stories';

export function generateStaticParams() {
  return stories.map(({ slug }) => ({ slug }));
}

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const story = getStory((await params).slug);
  if (!story || !story.playable) notFound();

  return (
    <ProtectedGameFrame
      storyId={story.slug}
      title={story.title}
      storyHref="/#stories"
      src={story.entry}
      capabilities={story.capabilities}
    />
  );
}
