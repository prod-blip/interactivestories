export type DialogueLine = {
  speaker: 'Narrator' | 'Crow' | 'Sound';
  text: string;
};

export const storyScenes = {
  title: 'THE CROW AND THE PITCHER',
  titleMoral: 'Where there is a will, there is a way.',
  cinematicOpening: [
    { speaker: 'Narrator', text: 'Once upon a time, on a very hot summer day, a little crow flew over the fields searching for water.' },
    { speaker: 'Narrator', text: 'The crow searched everywhere, but he could not find any water.' },
    { speaker: 'Narrator', text: 'Just when he was beginning to lose hope, he found something.' },
  ],
  pitcherArrival: [
    { speaker: 'Crow', text: 'A pitcher! Perhaps there is water inside.' },
  ],
  waterTooLow: [
    { speaker: 'Narrator', text: 'The crow looked inside the pitcher. There was water, but it was too deep for him to reach.' },
  ],
  thinking: [
    { speaker: 'Narrator', text: 'The crow sat there for a moment. Then an idea came to his head.' },
  ],
  pebbleDiscovery: [
    { speaker: 'Crow', text: 'Perhaps these pebbles can help me.' },
  ],
  success: [
    { speaker: 'Narrator', text: 'At last, the water rose all the way to the top.' },
    { speaker: 'Crow', text: 'I did it!' },
    { speaker: 'Narrator', text: 'The stones raised the water, and now the crow could drink.' },
    { speaker: 'Crow', text: 'Ahh… That feels wonderful.' },
    { speaker: 'Narrator', text: 'His thirst was gone, and his wings felt strong again.' },
  ],
  ending: [
    { speaker: 'Narrator', text: 'The crow had solved the problem with patience and clever thinking.' },
    { speaker: 'Narrator', text: 'And with a happy caw, the clever crow flew back into the wide blue sky.' },
  ],
  flightThoughts: [
    'I’m so thirsty.',
    'There must be some water somewhere.',
    'Nothing near these trees… and nothing beside those rocks.',
    'Wait… what is that beside the garden wall?',
  ],
  moral: 'WHERE THERE IS A WILL, THERE IS A WAY.',
  moralExplanation: 'When we stay calm, think carefully and keep trying, even a difficult problem can be solved.',
} as const;
