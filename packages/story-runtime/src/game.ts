import {
  isRuntimeMessage,
  runtimeEnvelope,
  type HostToStoryMessage,
  type StoryToHostMessage,
  type StoryViewport,
} from './protocol';
import { applyStoryViewport, detectStoryViewport } from './viewport';

export interface MoonlitStoryAdapter {
  pause(): void;
  resume(): void;
  restart(): void;
  setMuted(muted: boolean): void;
  onViewportChange?(viewport: StoryViewport): void;
}

export type StoryRuntime = {
  reportLoading(progress: number, stage: string): void;
  markReady(): void;
  markCompleted(): void;
  reportError(error: unknown): void;
  requestExit(): void;
  dispose(): void;
};

export function createStoryRuntime(storyId: string, story: MoonlitStoryAdapter): StoryRuntime {
  const hostOrigin = window.location.origin;
  let lastProgress = 0;
  let lastStage = 'Opening the story';
  let currentState: 'loading' | 'ready' | 'completed' | 'error' = 'loading';
  let lastError = '';

  const post = (message: StoryToHostMessage) => {
    if (window.parent === window) return;
    window.parent.postMessage(message, hostOrigin);
  };

  const applyViewport = (viewport: StoryViewport) => {
    applyStoryViewport(viewport);
    story.onViewportChange?.(viewport);
    window.dispatchEvent(new Event('resize'));
  };

  const postSnapshot = () => {
    post({ ...runtimeEnvelope(), type: 'moonlit:booted', storyId });
    if (currentState === 'error') {
      post({ ...runtimeEnvelope(), type: 'moonlit:error', message: lastError });
    } else if (currentState === 'completed') {
      post({ ...runtimeEnvelope(), type: 'moonlit:completed' });
    } else if (currentState === 'ready') {
      post({ ...runtimeEnvelope(), type: 'moonlit:ready' });
    } else {
      post({
        ...runtimeEnvelope(),
        type: 'moonlit:loading',
        progress: lastProgress,
        stage: lastStage,
      });
    }
  };

  const onMessage = (event: MessageEvent<HostToStoryMessage>) => {
    if (event.origin !== hostOrigin || !isRuntimeMessage(event.data)) return;
    switch (event.data.type) {
      case 'moonlit:connect':
        postSnapshot();
        break;
      case 'moonlit:pause':
        story.pause();
        post({ ...runtimeEnvelope(), type: 'moonlit:paused', paused: true });
        break;
      case 'moonlit:resume':
        story.resume();
        post({ ...runtimeEnvelope(), type: 'moonlit:paused', paused: false });
        break;
      case 'moonlit:restart':
        story.restart();
        break;
      case 'moonlit:set-muted':
        story.setMuted(event.data.muted);
        break;
      case 'moonlit:viewport':
        applyViewport(event.data.viewport);
        postSnapshot();
        break;
      default:
        break;
    }
  };

  const onVisibilityChange = () => {
    if (document.hidden) story.pause();
    else story.resume();
  };

  const onStandaloneResize = () => {
    if (window.parent === window) applyViewport(detectStoryViewport());
  };

  window.addEventListener('message', onMessage);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('resize', onStandaloneResize);
  if (window.parent === window) applyViewport(detectStoryViewport());
  post({ ...runtimeEnvelope(), type: 'moonlit:booted', storyId });

  return {
    reportLoading(progress, stage) {
      currentState = 'loading';
      lastProgress = Math.min(1, Math.max(0, progress));
      lastStage = stage;
      post({
        ...runtimeEnvelope(),
        type: 'moonlit:loading',
        progress: lastProgress,
        stage,
      });
    },
    markReady() {
      currentState = 'ready';
      post({ ...runtimeEnvelope(), type: 'moonlit:ready' });
    },
    markCompleted() {
      currentState = 'completed';
      post({ ...runtimeEnvelope(), type: 'moonlit:completed' });
    },
    reportError(error) {
      currentState = 'error';
      lastError = error instanceof Error ? error.message : 'The story could not continue.';
      post({ ...runtimeEnvelope(), type: 'moonlit:error', message: lastError });
    },
    requestExit() {
      post({ ...runtimeEnvelope(), type: 'moonlit:request-exit' });
    },
    dispose() {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onStandaloneResize);
    },
  };
}
