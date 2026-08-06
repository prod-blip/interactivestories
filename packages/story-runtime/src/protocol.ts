export const STORY_RUNTIME_VERSION = 1 as const;

export type StoryOrientation = 'portrait' | 'landscape';
export type StoryInputMode = 'touch' | 'pointer';

export type StoryViewport = {
  width: number;
  height: number;
  pixelRatio: number;
  orientation: StoryOrientation;
  input: StoryInputMode;
  reducedMotion: boolean;
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

type RuntimeEnvelope = {
  source: 'moonlit-runtime';
  version: typeof STORY_RUNTIME_VERSION;
};

export type HostToStoryMessage = RuntimeEnvelope & (
  | { type: 'moonlit:connect' }
  | { type: 'moonlit:pause' }
  | { type: 'moonlit:resume' }
  | { type: 'moonlit:restart' }
  | { type: 'moonlit:set-muted'; muted: boolean }
  | { type: 'moonlit:viewport'; viewport: StoryViewport }
);

export type StoryToHostMessage = RuntimeEnvelope & (
  | { type: 'moonlit:booted'; storyId: string }
  | { type: 'moonlit:loading'; progress: number; stage: string }
  | { type: 'moonlit:ready' }
  | { type: 'moonlit:paused'; paused: boolean }
  | { type: 'moonlit:completed' }
  | { type: 'moonlit:request-exit' }
  | { type: 'moonlit:error'; message: string }
);

export function runtimeEnvelope(): RuntimeEnvelope {
  return { source: 'moonlit-runtime', version: STORY_RUNTIME_VERSION };
}

export function isRuntimeMessage(value: unknown): value is HostToStoryMessage | StoryToHostMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RuntimeEnvelope>;
  return candidate.source === 'moonlit-runtime' && candidate.version === STORY_RUNTIME_VERSION;
}
