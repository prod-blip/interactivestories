import { createStoryRuntime, type StoryRuntime } from '@moonlit/story-runtime';
import './style.css';
import '../../../packages/story-assets/assets/ui/story-ending.css';
import { Game } from './game/Game';

const app = document.querySelector<HTMLElement>('#app');
const loader = document.querySelector<HTMLElement>('#game-loader');
const loaderStage = loader?.querySelector<HTMLElement>('.loader__stage');
const loaderBar = loader?.querySelector<HTMLElement>('.loader__bar');
const loaderPercent = loader?.querySelector<HTMLElement>('.loader__percent');
const intro = document.querySelector<HTMLElement>('#story-intro');
const beginButton = intro?.querySelector<HTMLButtonElement>('button');
const cinematicMode = new URLSearchParams(window.location.search).get('mode') === 'cinematic';
if (!app) throw new Error('Missing game root.');

let game: Game | undefined;
let runtime: StoryRuntime | undefined;

// Retry from every trusted interaction. The shared audio session safely
// rebuilds iPhone/iPad contexts after app handoff or interruption.
const unlockGameAudio = () => game?.enableAudio();
window.addEventListener('pointerdown', unlockGameAudio, { passive: true });
window.addEventListener('touchend', unlockGameAudio, { passive: true });
window.addEventListener('keydown', unlockGameAudio);

function setProgress(progress: number, stage: string): void {
  const percentage = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  if (loaderStage) loaderStage.textContent = stage;
  if (loaderBar) loaderBar.style.width = `${percentage}%`;
  if (loaderPercent) loaderPercent.textContent = `${percentage}%`;
  runtime?.reportLoading(progress, stage);
}

async function bootstrap(): Promise<void> {
  runtime = createStoryRuntime('crow-and-pitcher', {
    pause: () => game?.pause(),
    resume: () => game?.resume(),
    restart: () => {
      if (game) game.restart();
      else location.reload();
    },
    setMuted: (muted) => game?.setMuted(muted),
    setVolume: (volume) => game?.setVolume(volume),
    onViewportChange: (viewport) => game?.onViewportChange(viewport),
  });

  setProgress(0.05, 'Finding the garden');
  game = new Game(app!);
  game.setCompletionHandler(() => runtime?.markCompleted());
  await game.prepare((progress, stage) => setProgress(0.12 + progress * 0.83, stage));
  await document.fonts.ready;
  setProgress(1, 'Ready');
  game.start();
  runtime.markReady();
  loader?.classList.add('is-complete');
  window.setTimeout(() => loader?.remove(), 650);
  if (cinematicMode) {
    intro?.remove();
    game.beginStory();
  } else {
    intro?.classList.add('is-visible');
    beginButton?.focus({ preventScroll: true });
  }
}

beginButton?.addEventListener('click', () => {
  intro?.classList.remove('is-visible');
  game?.beginStory();
  window.setTimeout(() => intro?.remove(), 550);
});

void bootstrap().catch((error: unknown) => {
  console.error(error);
  runtime?.reportError(error);
  setProgress(1, 'Unable to enter the garden');
  loader?.classList.add('has-error');
});

// A browser back/forward-cache restore must represent a fresh visit, never a
// suspended pebble run from the previous visit.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) window.location.reload();
});

window.addEventListener('beforeunload', () => {
  window.removeEventListener('pointerdown', unlockGameAudio);
  window.removeEventListener('touchend', unlockGameAudio);
  window.removeEventListener('keydown', unlockGameAudio);
  runtime?.dispose();
  game?.dispose();
});
