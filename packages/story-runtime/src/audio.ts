const DEFAULT_RESUME_TIMEOUT_MS = 1_000;

/** A shared headroom-safe starting level for every Moonlit story. */
export const STORY_MASTER_GAIN = 0.45;

export function clampStoryVolume(volume: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 1));
}

const encodedAudioCache = new Map<string, Promise<ArrayBuffer>>();

export type StoryAudioContextHandlers = {
  getContext(): AudioContext | null | undefined;
  createContext(): AudioContext;
  abandonContext(context: AudioContext): void;
};

export type StoryAudioSessionStatus = {
  attempts: number;
  event: string;
  error: string;
};

/**
 * Coordinates the user-gesture lifecycle required by mobile Web Audio.
 *
 * WebKit can expose a non-standard `interrupted` context whose resume promise
 * never settles. This helper bounds every resume attempt and lets a later
 * trusted gesture rebuild the graph instead of reusing a permanently pending
 * promise.
 */
export class StoryAudioSession {
  private unlocking: Promise<AudioContext | null> | undefined;
  private attempts = 0;
  private event = 'Audio has not been requested';
  private error = '';
  private readonly resumeTimeoutMs: number;

  constructor(resumeTimeoutMs = DEFAULT_RESUME_TIMEOUT_MS) {
    this.resumeTimeoutMs = resumeTimeoutMs;
  }

  getStatus(): StoryAudioSessionStatus {
    return { attempts: this.attempts, event: this.event, error: this.error };
  }

  reportEvent(event: string): void {
    this.event = event;
  }

  reportError(error: unknown): void {
    this.error = error instanceof Error ? error.message : String(error);
  }

  async unlock(handlers: StoryAudioContextHandlers): Promise<AudioContext | null> {
    this.attempts += 1;
    this.event = 'Trusted interaction received';

    const existing = handlers.getContext();
    const existingState = existing ? audioContextState(existing) : '';
    if (existing && (existingState === 'interrupted' || existingState === 'closed')) {
      handlers.abandonContext(existing);
      this.unlocking = undefined;
      this.event = `${existingState} context discarded — retrying from this tap`;
      void existing.close().catch(() => {
        // An interrupted WebKit context may reject close after app handoff.
      });
    }

    if (this.unlocking) return this.unlocking;
    this.error = '';
    const attempt = this.performUnlock(handlers);
    this.unlocking = attempt;
    try {
      return await attempt;
    } catch (error: unknown) {
      if (this.unlocking === attempt) {
        this.reportError(error);
        this.event = 'Audio unlock failed — tap again';
      }
      return null;
    } finally {
      if (this.unlocking === attempt) this.unlocking = undefined;
    }
  }

  private async performUnlock(handlers: StoryAudioContextHandlers): Promise<AudioContext | null> {
    const context = handlers.getContext() ?? handlers.createContext();
    primeStoryAudioOutput(context);

    if (context.state !== 'running' && context.state !== 'closed') {
      const resumed = await this.resumeWithTimeout(context);
      if (handlers.getContext() !== context) return null;
      if (!resumed) {
        this.event = `Audio resume timed out (${audioContextState(context)}) — tap again`;
        return null;
      }
    }

    if (handlers.getContext() !== context) return null;
    if (context.state !== 'running') {
      this.event = `Audio context remained ${audioContextState(context)} — tap again`;
      return null;
    }
    this.event = 'Audio context is running';
    return context;
  }

  private async resumeWithTimeout(context: AudioContext): Promise<boolean> {
    let timeout: number | undefined;
    const timedOut = new Promise<false>((resolve) => {
      timeout = window.setTimeout(() => resolve(false), this.resumeTimeoutMs);
    });
    try {
      return await Promise.race([context.resume().then(() => true), timedOut]);
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
    }
  }
}

export function createStoryAudioContext(): AudioContext {
  const AudioContextConstructor = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('Web Audio is not supported by this browser.');
  return new AudioContextConstructor();
}

export function audioContextState(context: AudioContext): string {
  // WebKit's `interrupted` state is absent from TypeScript's standard union.
  return String(context.state);
}

export function primeStoryAudioOutput(context: AudioContext): void {
  if (context.state === 'closed') return;
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, 1, context.sampleRate);
  source.connect(context.destination);
  source.start(0);
}

/** Fetches once per story document and retains encoded data across context rebuilds. */
export function fetchStoryAudioData(url: string): Promise<ArrayBuffer> {
  const cached = encodedAudioCache.get(url);
  if (cached) return cached;
  const request = fetch(url).then((response) => {
    if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
    return response.arrayBuffer();
  }).catch((error: unknown) => {
    encodedAudioCache.delete(url);
    throw error;
  });
  encodedAudioCache.set(url, request);
  return request;
}

export async function loadStoryAudioBuffer(context: AudioContext, url: string): Promise<AudioBuffer> {
  const encoded = await fetchStoryAudioData(url);
  return decodeStoryAudioData(context, encoded);
}

export function decodeStoryAudioData(context: AudioContext, encoded: ArrayBuffer): Promise<AudioBuffer> {
  return context.decodeAudioData(encoded.slice(0));
}
