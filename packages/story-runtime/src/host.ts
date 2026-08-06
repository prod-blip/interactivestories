import {
  isRuntimeMessage,
  runtimeEnvelope,
  type HostToStoryMessage,
  type StoryToHostMessage,
} from './protocol';
import { detectStoryViewport } from './viewport';

export type StoryHostCallbacks = {
  onBooted?: (storyId: string) => void;
  onLoading?: (progress: number, stage: string) => void;
  onReady?: () => void;
  onPaused?: (paused: boolean) => void;
  onCompleted?: () => void;
  onExitRequested?: () => void;
  onError?: (message: string) => void;
};

export type StoryHost = {
  connect(): void;
  syncViewport(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  setMuted(muted: boolean): void;
  dispose(): void;
};

export function createStoryHost(
  frame: HTMLIFrameElement,
  callbacks: StoryHostCallbacks = {},
): StoryHost {
  const targetOrigin = window.location.origin;
  const post = (message: HostToStoryMessage) => frame.contentWindow?.postMessage(message, targetOrigin);

  const onMessage = (event: MessageEvent<StoryToHostMessage>) => {
    if (event.origin !== targetOrigin || !isRuntimeMessage(event.data)) return;
    switch (event.data.type) {
      case 'moonlit:booted':
        callbacks.onBooted?.(event.data.storyId);
        host.syncViewport();
        break;
      case 'moonlit:loading':
        callbacks.onLoading?.(event.data.progress, event.data.stage);
        break;
      case 'moonlit:ready':
        callbacks.onReady?.();
        break;
      case 'moonlit:paused':
        callbacks.onPaused?.(event.data.paused);
        break;
      case 'moonlit:completed':
        callbacks.onCompleted?.();
        break;
      case 'moonlit:request-exit':
        callbacks.onExitRequested?.();
        break;
      case 'moonlit:error':
        callbacks.onError?.(event.data.message);
        break;
      default:
        break;
    }
  };

  const host: StoryHost = {
    connect() {
      post({ ...runtimeEnvelope(), type: 'moonlit:connect' });
    },
    syncViewport() {
      // Reconnect while syncing so a game that attached its listener after the
      // iframe load event can replay its latest lifecycle snapshot.
      post({ ...runtimeEnvelope(), type: 'moonlit:connect' });
      post({ ...runtimeEnvelope(), type: 'moonlit:viewport', viewport: detectStoryViewport() });
    },
    pause() {
      post({ ...runtimeEnvelope(), type: 'moonlit:pause' });
    },
    resume() {
      post({ ...runtimeEnvelope(), type: 'moonlit:resume' });
    },
    restart() {
      post({ ...runtimeEnvelope(), type: 'moonlit:restart' });
    },
    setMuted(muted) {
      post({ ...runtimeEnvelope(), type: 'moonlit:set-muted', muted });
    },
    dispose() {
      window.removeEventListener('message', onMessage);
    },
  };

  window.addEventListener('message', onMessage);
  return host;
}
