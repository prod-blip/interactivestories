export type Story = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  description: string;
  moral: string;
  ageRange: string;
  duration: string;
  participation: string;
  entry: string;
  playable: boolean;
};

export const stories: Story[] = [
  {
    slug: 'mouse-and-lion',
    title: 'The Mouse and the Lion',
    eyebrow: 'A gentle forest fable',
    summary: 'A tiny traveller discovers that kindness is never too small to matter.',
    description:
      'Walk together beneath the stars, meet a sleeping lion, and help an unlikely friendship unfold. Take turns guiding the mouse and reading each moment aloud.',
    moral: 'Kindness returns in unexpected ways.',
    ageRange: 'Ages 4–8',
    duration: '10–12 min',
    participation: 'Read aloud + explore',
    entry: '/games/mouse-and-lion/index.html',
    playable: true,
  },
];

export function getStory(slug: string): Story | undefined {
  return stories.find((story) => story.slug === slug);
}
