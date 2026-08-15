import { createStoryRuntime, type StoryRuntime } from '@moonlit/story-runtime';
import './style.css';
import { Game } from './game/Game';

const app = document.querySelector<HTMLElement>('#app');
const loader = document.querySelector<HTMLElement>('#loader');
const loaderBar = loader?.querySelector<HTMLElement>('.loader__track span');
const storyIntro = document.querySelector<HTMLElement>('#story-intro');
const titleCard = storyIntro?.querySelector<HTMLElement>('.story-intro__title-card');
const narratorCard = document.querySelector<HTMLElement>('#narrator-card');
const narratorText = narratorCard?.querySelector<HTMLElement>('.narrator-card__text');
const popupSpeaker = narratorCard?.querySelector<HTMLElement>('[data-speaker]');
const sceneTransition = document.querySelector<HTMLElement>('#scene-transition');
const objectivePopup = document.querySelector<HTMLElement>('#objective-popup');
const gameplayBubble = document.querySelector<HTMLElement>('#gameplay-bubble');
const gameplayBubbleSpeaker = gameplayBubble?.querySelector<HTMLElement>('strong');
const gameplayBubbleText = gameplayBubble?.querySelector<HTMLElement>('span');
const raceGuide = document.querySelector<HTMLElement>('#race-guide');
const raceGuideArrow = raceGuide?.querySelector<HTMLElement>('.race-guide__arrow');
const raceGuideLabel = raceGuide?.querySelector<HTMLElement>('.race-guide__copy strong');
const raceGuideDistance = raceGuide?.querySelector<HTMLElement>('[data-guide-distance]');
const raceControls = document.querySelector<HTMLElement>('#race-controls');
const storyEnding = document.querySelector<HTMLElement>('#story-ending');
const playAgainButton = storyEnding?.querySelector<HTMLButtonElement>('[data-action="restart"]');
const mainMenuButton = storyEnding?.querySelector<HTMLButtonElement>('[data-action="menu"]');
if (!app) throw new Error('Missing game root.');

let game: Game | undefined;
let runtime: StoryRuntime | undefined;
let bubbleTimer = 0;
let narratorLineTimer = 0;
let adaptiveDialogueTimer = 0;
let lastCheckpointTime = 0;
let adaptiveThoughtIndex = 0;
let adaptiveThoughts: readonly string[] = [];

const SLOW_FIRST_RACE_THOUGHTS = [
  'One step at a time.',
  'I just have to keep going.',
  'I will not quit.',
] as const;

const SLOW_SECOND_RACE_THOUGHTS = [
  'I must not stop now.',
  'Steady steps will take me there.',
] as const;

const SLOW_FINAL_STRETCH_THOUGHTS = [
  'Just a little farther.',
] as const;

function delay(duration: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function waitForDismiss(): Promise<void> {
  return new Promise((resolve) => {
    const cleanup = () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
    const finish = () => {
      cleanup();
      resolve();
    };
    const onPointerDown = () => finish();
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.repeat && (event.code === 'Enter' || event.code === 'Space')) finish();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
  });
}

async function playOpeningScene(activeGame: Game): Promise<void> {
  const openingComplete = new Promise<void>((resolve) => activeGame.beginOpening(resolve));
  activeGame.start();

  await delay(500);
  titleCard?.classList.add('is-visible');
  await delay(2700);
  titleCard?.classList.remove('is-visible');
  await openingComplete;
  await delay(350);

  await showPopup(
    activeGame,
    'Narrator',
    'Once upon a time in a sunny forest, there lived a speedy rabbit and a slow but steady tortoise.',
  );
  storyIntro?.classList.add('is-complete');
  window.setTimeout(() => storyIntro?.remove(), 650);

  activeGame.resume();
  await delay(300);
  await new Promise<void>((resolve) => activeGame.beginRabbitIntroduction(resolve));
  await showPopup(activeGame, 'Narrator', 'The rabbit loved to brag.');
  await showPopup(
    activeGame,
    'Rabbit',
    '“I’m the fastest animal in the forest!”\n\n“No one can beat me in a race!”',
    'bottom',
  );

  activeGame.resume();
  await delay(300);
  await new Promise<void>((resolve) => activeGame.beginTortoiseIntroduction(resolve));
  await showPopup(
    activeGame,
    'Narrator',
    'The tortoise was quiet and patient. He did not like showing off, but he was never afraid of a challenge.',
  );
  await showPopup(
    activeGame,
    'Tortoise',
    '“You may be fast, Rabbit, but I’d still like to race you.”',
    'bottom',
  );

  activeGame.resume();
  await delay(300);
  const rabbitLaughComplete = new Promise<void>((resolve) => activeGame.beginRabbitLaugh(resolve));
  await delay(800);
  await showPopup(
    activeGame,
    'Rabbit',
    '“Ha ha ha... You? Race me?\n\nThis will be the easiest win of my life!”',
    'bottom',
  );
  await rabbitLaughComplete;

  await moveToRaceClearing(activeGame);
  await showPopup(
    activeGame,
    'Narrator',
    'The tortoise accepted the challenge as the animals of the forest gathered to see the interesting race between the rabbit and the tortoise.',
  );

  activeGame.resume();
  await delay(500);
  await showPopup(
    activeGame,
    'Narrator',
    'The rabbit and the tortoise took their places.\n\nReady... get set... GO!',
  );
  activeGame.endOpeningConversationAudio();
  activeGame.resume();
  showObjective('Guide the tortoise along the trail');
  raceGuide?.classList.add('is-visible');
  raceControls?.classList.add('is-visible');
  startAdaptiveDialogue(SLOW_FIRST_RACE_THOUGHTS);
  await new Promise<void>((resolve) => activeGame.startRace(showCheckpointThought, resolve));
  stopAdaptiveDialogue();
  raceGuide?.classList.remove('is-visible');
  raceControls?.classList.remove('is-visible');
  objectivePopup?.classList.remove('is-visible');
  hideGameplayBubble();

  await delay(500);
  await new Promise<void>((resolve) => activeGame.beginRabbitFarAhead(resolve));
  await showPopup(
    activeGame,
    'Narrator',
    'Meanwhile, the rabbit raced far ahead. When he looked back and could not see the tortoise anywhere, he became very confident.',
  );
  await showPopup(
    activeGame,
    'Rabbit',
    'This is too easy.\n\nThe tortoise will never catch up.',
  );
  activeGame.resume();
  await delay(350);
  await showPopup(activeGame, 'Rabbit', 'I have plenty of time.\n\nMaybe I’ll take a little nap.');
  await new Promise<void>((resolve) => {
    activeGame.beginRabbitNap(resolve);
    activeGame.resume();
  });

  await delay(450);
  hideGameplayBubble();
  showObjective('Keep moving toward the finish line');
  raceGuide?.classList.add('is-visible');
  raceControls?.classList.add('is-visible');
  startAdaptiveDialogue(SLOW_SECOND_RACE_THOUGHTS);
  await new Promise<void>((resolve) => activeGame.startRaceSectionTwo(
    showSecondRaceThought,
    showPassingNarration,
    resolve,
  ));
  stopAdaptiveDialogue();
  raceGuide?.classList.remove('is-visible');
  raceControls?.classList.remove('is-visible');
  objectivePopup?.classList.remove('is-visible');

  await delay(450);
  window.clearTimeout(narratorLineTimer);
  hideGameplayBubble();
  sceneTransition?.classList.add('is-visible');
  await delay(380);
  const rabbitWakeComplete = new Promise<void>((resolve) => activeGame.beginRabbitWake(resolve));
  await delay(180);
  sceneTransition?.classList.remove('is-visible');
  await rabbitWakeComplete;
  await showPopup(
    activeGame,
    'Narrator',
    'At last, the rabbit woke up startled. Realizing how long he had slept, he jumped up in alarm.',
  );
  await showPopup(activeGame, 'Rabbit', 'Oh! The race!\n\nI’d better get going!');

  const confidentRunComplete = new Promise<void>((resolve) => activeGame.beginRabbitConfidentRun(resolve));
  activeGame.resume();
  await confidentRunComplete;
  await showPopup(
    activeGame,
    'Rabbit',
    'What?\n\nThe tortoise is near the finish line!',
  );

  sceneTransition?.classList.add('is-visible');
  await delay(420);
  hideGameplayBubble();
  const finalRaceComplete = new Promise<void>((resolve) => activeGame.startFinalRace(
    showFinalStretchThought,
    resolve,
  ));
  sceneTransition?.classList.remove('is-visible');
  await delay(380);
  showObjective('Reach the finish line');
  raceGuide?.classList.add('is-visible');
  raceControls?.classList.add('is-visible');
  startAdaptiveDialogue(SLOW_FINAL_STRETCH_THOUGHTS);
  activeGame.resume();
  await finalRaceComplete;
  stopAdaptiveDialogue();
  raceGuide?.classList.remove('is-visible');
  raceControls?.classList.remove('is-visible');
  objectivePopup?.classList.remove('is-visible');
  hideGameplayBubble();

  const tortoiseWinComplete = new Promise<void>((resolve) => activeGame.beginTortoiseWin(resolve));
  await delay(1500);
  await showPopup(
    activeGame,
    'Tortoise',
    'Slow and steady wins the race.',
    'bottom',
  );
  await tortoiseWinComplete;

  await delay(350);
  await new Promise<void>((resolve) => activeGame.beginEndingTableau(resolve));
  await showPopup(
    activeGame,
    'Narrator',
    'And so the tortoise won the race, not by being the fastest, but by never giving up.\n\nHe was not the fastest, and he never tried to be.\n\nHe simply kept going when the rabbit stopped.\n\nAnd that is why slow and steady won the race.',
  );

  runtime?.markCompleted();
  storyEnding?.classList.add('is-visible');
  await delay(850);
  playAgainButton?.focus({ preventScroll: true });
}

async function moveToRaceClearing(activeGame: Game): Promise<void> {
  sceneTransition?.classList.add('is-visible');
  await delay(850);
  activeGame.enterRaceClearing();
  activeGame.resume();
  await delay(250);
  sceneTransition?.classList.remove('is-visible');
  await delay(2100);
}

async function showPopup(
  _activeGame: Game,
  speaker: string,
  text: string,
  placement: 'center' | 'bottom' = speaker === 'Narrator' ? 'center' : 'bottom',
): Promise<void> {
  // Awaiting this popup gates the story script. The live game loop deliberately
  // continues so characters, scenery, spectators, and ambience never freeze.
  if (popupSpeaker) popupSpeaker.textContent = speaker;
  if (narratorText) narratorText.textContent = text;
  narratorCard?.classList.toggle('is-character-dialogue', placement === 'bottom');
  narratorCard?.classList.add('is-visible');
  await nextFrame();
  await delay(1100);
  await waitForDismiss();
  narratorCard?.classList.remove('is-visible');
  await delay(650);
  narratorCard?.classList.remove('is-character-dialogue');
}

function showObjective(text: string): void {
  if (objectivePopup) objectivePopup.textContent = text;
  objectivePopup?.classList.add('is-visible');
  window.setTimeout(() => objectivePopup?.classList.remove('is-visible'), 3200);
}

function showCheckpointThought(index: number): void {
  markCheckpointReached();
  if (index === 0) showGameplayLine('Tortoise', 'Slow and steady.');
  else if (index === 4) showGameplayLine('Tortoise', 'One step at a time.');
}

function showSecondRaceThought(index: number): void {
  markCheckpointReached();
  if (index === 0) showGameplayLine('Tortoise', 'I will keep moving.');
  else if (index === 3) showGameplayLine('Tortoise', 'Steady steps will get me there.');
}

function showFinalStretchThought(index: number): void {
  markCheckpointReached();
  if (index === 0) showGameplayLine('Tortoise', 'Almost there.');
  else if (index === 2) showGameplayLine('Tortoise', 'Keep going.');
}

function startAdaptiveDialogue(thoughts: readonly string[]): void {
  stopAdaptiveDialogue();
  adaptiveThoughts = thoughts;
  adaptiveThoughtIndex = 0;
  lastCheckpointTime = performance.now();
  adaptiveDialogueTimer = window.setInterval(() => {
    if (performance.now() - lastCheckpointTime < 6500) return;
    if (gameplayBubble?.classList.contains('is-visible')) return;
    const thought = adaptiveThoughts[adaptiveThoughtIndex % adaptiveThoughts.length];
    if (!thought) return;
    showGameplayLine('Tortoise', thought);
    adaptiveThoughtIndex += 1;
    lastCheckpointTime = performance.now();
  }, 800);
}

function markCheckpointReached(): void {
  lastCheckpointTime = performance.now();
}

function stopAdaptiveDialogue(): void {
  window.clearInterval(adaptiveDialogueTimer);
  adaptiveDialogueTimer = 0;
  adaptiveThoughts = [];
}

function showPassingNarration(): void {
  window.clearTimeout(narratorLineTimer);
  narratorLineTimer = window.setTimeout(() => {
    showGameplayLine(
      'Narrator',
      'The tortoise did not stop.\n\nHe simply kept going, step by step.',
      3600,
      true,
    );
  }, 900);
}

function showGameplayLine(speaker: string, text: string, duration = 2700, replace = false): void {
  if (!replace && gameplayBubble?.classList.contains('is-visible')) return;
  if (gameplayBubbleSpeaker) gameplayBubbleSpeaker.textContent = speaker;
  if (gameplayBubbleText) gameplayBubbleText.textContent = text;
  gameplayBubble?.classList.toggle('is-narrator-line', speaker === 'Narrator');
  gameplayBubble?.classList.add('is-visible');
  window.clearTimeout(bubbleTimer);
  bubbleTimer = window.setTimeout(hideGameplayBubble, duration);
}

function hideGameplayBubble(): void {
  window.clearTimeout(bubbleTimer);
  gameplayBubble?.classList.remove('is-visible');
  gameplayBubble?.classList.remove('is-narrator-line');
}

function updateRaceGuide(angle: number, distance: number, label: string): void {
  if (raceGuideArrow) raceGuideArrow.style.transform = `rotate(${angle}rad)`;
  if (raceGuideLabel) raceGuideLabel.textContent = label;
  if (raceGuideDistance) {
    const metres = Math.max(0, distance);
    raceGuideDistance.textContent = metres <= 0.05
      ? 'Checkpoint reached'
      : `${metres.toFixed(1)} m away`;
  }
}

async function bootstrap(): Promise<void> {
  game = new Game(app!);
  game.setRaceGuideHandler(updateRaceGuide);
  runtime = createStoryRuntime('tortoise-and-rabbit', {
    pause: () => game?.pause(),
    resume: () => game?.resume(),
    // The story sequence is orchestrated here in main.ts; a document reload is
    // the only restart path that also cancels every pending dialogue promise
    // and timer before beginning again from the title card.
    restart: () => window.location.reload(),
    setMuted: (muted) => game?.setMuted(muted),
    onViewportChange: (viewport) => game?.setReducedMotion(viewport.reducedMotion),
  });

  const unlockAudio = () => game?.enableAudio();
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio);

  await game.prepare((progress) => {
    if (loaderBar) loaderBar.style.transform = `scaleX(${progress})`;
    runtime?.reportLoading(progress, 'Growing the sunny clearing');
  });
  runtime.markReady();
  loader?.classList.add('is-hidden');
  window.setTimeout(() => loader?.remove(), 700);
  game.enableAudio();
  await playOpeningScene(game);
}

playAgainButton?.addEventListener('click', () => window.location.reload());
mainMenuButton?.addEventListener('click', () => {
  if (window.parent !== window) runtime?.requestExit();
  else window.location.assign('/');
});

void bootstrap().catch((error: unknown) => {
  console.error(error);
  runtime?.reportError(error);
});

window.addEventListener('beforeunload', () => {
  window.clearTimeout(narratorLineTimer);
  stopAdaptiveDialogue();
  runtime?.dispose();
  game?.dispose();
});
