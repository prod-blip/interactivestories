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
  runtimeVersion: 1;
  capabilities: {
    audio: boolean;
    fullscreen: boolean;
    restart: boolean;
  };
  guidance: Array<{
    title: string;
    text: string;
  }>;
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
    runtimeVersion: 1,
    capabilities: {
      audio: true,
      fullscreen: true,
      restart: true,
    },
    guidance: [
      { title: 'Read together', text: 'The story pauses naturally so you can read each passage aloud.' },
      { title: 'Explore gently', text: 'Help the little mouse move through the forest using keys or touch.' },
      { title: 'Talk about kindness', text: 'Ask what each character might feel and what your child would do.' },
    ],
  },
  {
    slug: 'crow-and-pitcher',
    title: 'The Crow and the Pitcher',
    eyebrow: 'A patient garden fable',
    summary: 'A thirsty crow discovers that a careful idea can solve a very difficult problem.',
    description:
      'Explore an old garden, gather smooth pebbles, and help the crow raise the water inside a tall clay pitcher—one patient step at a time.',
    moral: 'Little by little does the trick.',
    ageRange: 'Ages 4–8',
    duration: '8–10 min',
    participation: 'Read aloud + solve',
    entry: '/games/crow-and-pitcher/index.html',
    playable: true,
    runtimeVersion: 1,
    capabilities: {
      audio: true,
      fullscreen: true,
      restart: true,
    },
    guidance: [
      { title: 'Read together', text: 'Pause with each passage and wonder what the crow might try next.' },
      { title: 'Gather patiently', text: 'Guide the crow to each pebble using keys or the touch joystick.' },
      { title: 'Notice the idea', text: 'Watch the water rise and talk about how small actions can add up.' },
    ],
  },
  {
    slug: 'tortoise-and-rabbit',
    title: 'The Tortoise and the Rabbit',
    eyebrow: 'A steady woodland race',
    summary: 'A patient tortoise shows that steady steps can carry us farther than proud promises.',
    description:
      'Join a bright forest race, guide the tortoise along the winding trail, and discover what happens when the speedy rabbit stops to nap.',
    moral: 'Slow and steady wins the race.',
    ageRange: 'Ages 4–8',
    duration: '6–8 min',
    participation: 'Read aloud + keep moving',
    entry: '/games/tortoise-and-rabbit/index.html',
    playable: true,
    runtimeVersion: 1,
    capabilities: {
      audio: true,
      fullscreen: true,
      restart: true,
    },
    guidance: [
      { title: 'Read together', text: 'Give each racer a voice and pause to wonder what they might do next.' },
      { title: 'Move steadily', text: 'Hold the forward control or use the keyboard to help Tortoise follow the trail.' },
      { title: 'Notice persistence', text: 'Talk about how small, patient steps help Tortoise reach the finish.' },
    ],
  },
];

export function getStory(slug: string): Story | undefined {
  return stories.find((story) => story.slug === slug);
}
