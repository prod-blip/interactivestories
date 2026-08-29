import { createStoryRuntime, type StoryRuntime } from '@moonlit/story-runtime';
import './style.css';
import { Game, type StorySceneId } from './game/Game';

const app = document.querySelector<HTMLElement>('#app');
const loader = document.querySelector<HTMLElement>('#game-loader');
const loaderStage = loader?.querySelector<HTMLElement>('.loader__stage');
const loaderBar = loader?.querySelector<HTMLElement>('.loader__bar');
const loaderPercent = loader?.querySelector<HTMLElement>('.loader__percent');
const retryButton = loader?.querySelector<HTMLButtonElement>('.loader__retry');
const storyIntro = document.querySelector<HTMLElement>('#story-intro');
const titleCard = storyIntro?.querySelector<HTMLElement>('.story-intro__title-card');

if (!app) throw new Error('Missing game root.');

let game: Game | undefined;
let runtime: StoryRuntime | undefined;
let introTimers: number[] = [];

function playStoryIntro(): void {
  introTimers.forEach((timer) => window.clearTimeout(timer));
  introTimers = [];
  if (!storyIntro || !titleCard) return;

  storyIntro.classList.remove('is-complete');
  storyIntro.setAttribute('aria-hidden', 'false');
  titleCard.classList.remove('is-visible');
  void titleCard.offsetWidth;
  introTimers.push(
    window.setTimeout(() => titleCard.classList.add('is-visible'), 650),
    window.setTimeout(() => titleCard.classList.remove('is-visible'), 3_350),
    window.setTimeout(() => {
      storyIntro.classList.add('is-complete');
      storyIntro.setAttribute('aria-hidden', 'true');
    }, 4_250),
  );
}

const query = new URLSearchParams(window.location.search);
const requestedScene = query.get('scene');
const initialScene: StorySceneId = requestedScene === '14'
  || requestedScene === 'scene-14'
  || requestedScene === 'ending'
  || requestedScene === 'moral'
  ? 'scene-14'
  : requestedScene === '13'
  || requestedScene === 'scene-13'
  || requestedScene === 'escape-ending'
  ? 'scene-13'
  : requestedScene === '11'
  || requestedScene === 'scene-11'
  || requestedScene === 'escape'
  || requestedScene === 'river-escape'
  ? 'scene-11'
  : requestedScene === '10' || requestedScene === 'scene-10'
  ? 'scene-10'
  : requestedScene === '9' || requestedScene === 'scene-9'
  ? 'scene-9'
  : requestedScene === '8' || requestedScene === 'scene-8'
  ? 'scene-8'
  : requestedScene === '7' || requestedScene === 'scene-7'
  ? 'scene-7'
  : requestedScene === '6' || requestedScene === 'scene-6'
  ? 'scene-6'
  : requestedScene === '5b' || requestedScene === 'scene-5b'
  ? 'scene-5b'
  : requestedScene === '5' || requestedScene === 'scene-5'
  ? 'scene-5'
  : requestedScene === '4' || requestedScene === 'scene-4'
    ? 'scene-4'
  : requestedScene === '3' || requestedScene === 'scene-3'
    ? 'scene-3'
  : requestedScene === '2' || requestedScene === 'scene-2'
    ? 'scene-2'
    : 'scene-1';
const initialCheckpoint = query.get('state') ?? undefined;

function setProgress(progress: number, stage: string): void {
  const percentage = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  if (loaderStage) loaderStage.textContent = stage;
  if (loaderBar) loaderBar.style.width = `${percentage}%`;
  if (loaderPercent) loaderPercent.textContent = `${percentage}%`;
  runtime?.reportLoading(progress, stage);
}

async function bootstrap(): Promise<void> {
  runtime = createStoryRuntime('tortoise-and-tiger', {
    pause: () => game?.pause(),
    resume: () => game?.resume(),
    restart: () => {
      game?.restart();
      if (requestedScene === null) playStoryIntro();
    },
    setMuted: (muted) => game?.setMuted(muted),
    onViewportChange: (viewport) => game?.onViewportChange(viewport),
  });

  game = new Game(app!, {
    initialScene,
    initialCheckpoint,
    storyMode: requestedScene === null,
    onComplete: () => runtime?.markCompleted(),
  });
  await game.prepare(setProgress);
  game.start();
  if (requestedScene === null) playStoryIntro();
  else storyIntro?.classList.add('is-complete');
  runtime.markReady();
  loader?.classList.add('is-complete');
  window.setTimeout(() => loader?.remove(), 500);
}

retryButton?.addEventListener('click', () => window.location.reload());

void bootstrap().catch((error: unknown) => {
  console.error(error);
  runtime?.reportError(error);
  setProgress(1, 'The story world could not be prepared');
  loader?.classList.add('has-error');
});

window.addEventListener('beforeunload', () => {
  introTimers.forEach((timer) => window.clearTimeout(timer));
  runtime?.dispose();
  game?.dispose();
});
