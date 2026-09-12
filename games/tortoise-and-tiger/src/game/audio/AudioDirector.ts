import {
  clampStoryVolume,
  createStoryAudioContext,
  decodeStoryAudioData,
  fetchStoryAudioData,
  STORY_MASTER_GAIN,
  StoryAudioSession,
} from '@moonlit/story-runtime';

const RIVER_VOLUME = 0.08;
const CHIRP_MIN_VOLUME = 0.35;
const CHIRP_VOLUME_RANGE = 0.3;

type LoadState = 'not-requested' | 'fetching' | 'fetched' | 'decoding' | 'decoded' | 'failed';

export type AudioDiagnostics = {
  contextState: string;
  unlockAttempts: number;
  requested: boolean;
  muted: boolean;
  paused: boolean;
  chirps: LoadState;
  chirpBuffers: number;
  chirpStarted: boolean;
  river: LoadState;
  riverStarted: boolean;
  sniffs: LoadState;
  sniffStarted: boolean;
  friendlyCueStarted: boolean;
  lastEvent: string;
  lastError: string;
};

export class AudioDirector {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private ambience: GainNode | undefined;
  private readonly audioSession = new StoryAudioSession();
  private chirpDataLoad: Promise<ArrayBuffer[]> | undefined;
  private chirpLoad: Promise<void> | undefined;
  private chirpBuffers: AudioBuffer[] = [];
  private chirpTimer: number | undefined;
  private lastChirpIndex = -1;
  private hasPlayedChirp = false;
  private riverDataLoad: Promise<ArrayBuffer | undefined> | undefined;
  private riverLoad: Promise<void> | undefined;
  private riverBuffer: AudioBuffer | undefined;
  private riverSource: AudioBufferSourceNode | undefined;
  private sniffDataLoad: Promise<ArrayBuffer | undefined> | undefined;
  private sniffLoad: Promise<void> | undefined;
  private sniffBuffer: AudioBuffer | undefined;
  private sniffSource: AudioBufferSourceNode | undefined;
  private requested = false;
  private muted = false;
  private volume = 1;
  private paused = false;
  private chirpState: LoadState = 'not-requested';
  private riverState: LoadState = 'not-requested';
  private sniffState: LoadState = 'not-requested';
  private sniffStarted = false;
  private friendlyCueStarted = false;

  start(): void {
    this.requested = true;
    // Network requests are safe before interaction, but constructing an audio
    // context here is not reliable in Safari and some mobile browsers. Keep the
    // recordings warm and create the context only inside a genuine gesture.
    this.preloadAmbience();
  }

  async unlock(): Promise<void> {
    const context = await this.audioSession.unlock({
      getContext: () => this.context,
      createContext: () => {
        this.createGraph();
        return this.context!;
      },
      abandonContext: () => this.abandonInterruptedContext(),
    });
    if (!context) return;
    if (this.requested && !this.muted && !this.paused) {
      await Promise.all([
        this.startBirdAmbience(),
        this.startRiverAmbience(),
        this.ensureSniffLoaded(),
      ]);
    }
  }

  pause(): void {
    this.paused = true;
    this.clearChirpTimer();
    if (this.context?.state === 'running') void this.context.suspend();
  }

  resume(): void {
    this.paused = false;
    if (this.muted) return;
    // Visibility changes are routed through the same bounded session. If this
    // is not a trusted gesture it may time out harmlessly; the next player tap
    // performs the standard recovery path.
    void this.unlock();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMasterGain();
    if (muted) this.clearChirpTimer();
    else if (!this.paused && this.context?.state === 'running' && this.requested) {
      void this.startBirdAmbience();
      void this.startRiverAmbience();
    }
  }

  setVolume(volume: number): void {
    this.volume = clampStoryVolume(volume);
    this.applyMasterGain();
  }

  getDiagnostics(): AudioDiagnostics {
    const session = this.audioSession.getStatus();
    return {
      contextState: this.context?.state ?? 'not-created',
      unlockAttempts: session.attempts,
      requested: this.requested,
      muted: this.muted,
      paused: this.paused,
      chirps: this.chirpState,
      chirpBuffers: this.chirpBuffers.length,
      chirpStarted: this.hasPlayedChirp,
      river: this.riverState,
      riverStarted: Boolean(this.riverSource),
      sniffs: this.sniffState,
      sniffStarted: this.sniffStarted,
      friendlyCueStarted: this.friendlyCueStarted,
      lastEvent: session.event,
      lastError: session.error,
    };
  }

  async playDiagnosticTone(): Promise<void> {
    await this.unlock();
    if (!this.canPlay() || !this.context || !this.master) {
      this.audioSession.reportEvent('Test tone could not start');
      return;
    }
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.52);
    this.audioSession.reportEvent('Test tone source started');
  }

  playCuriousChime(): void {
    if (!this.canPlay()) return;
    const context = this.context!;
    const master = this.master!;
    const now = context.currentTime;
    const notes = [392, 523.25, 659.25] as const;
    notes.forEach((frequency, index) => {
      const start = now + index * 0.14;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 2 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);
      oscillator.connect(gain).connect(master);
      oscillator.start(start);
      oscillator.stop(start + 0.4);
    });
    this.friendlyCueStarted = true;
    this.audioSession.reportEvent('Curious chime started');
  }

  playHideTap(progress: number): void {
    if (!this.canPlay()) return;
    const now = this.context!.currentTime;
    const oscillator = this.context!.createOscillator();
    const gain = this.context!.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(310 + 34 * progress, now);
    oscillator.frequency.exponentialRampToValueAtTime(235 + 34 * progress, now + 0.075);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
    oscillator.connect(gain).connect(this.master!);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
  }

  playShellKnock(): void {
    if (!this.canPlay()) return;
    const now = this.context!.currentTime;
    this.playKnockAt(now);
    this.playKnockAt(now + 0.23);
  }

  playSingleShellKnock(): void {
    if (!this.canPlay()) return;
    this.playKnockAt(this.context!.currentTime);
  }

  playSniffs(): void {
    if (!this.canPlay()) return;
    void this.playSniffsWhenReady();
  }

  playSplash(): void {
    if (!this.canPlay()) return;
    const context = this.context!;
    const now = context.currentTime;
    const duration = 0.78;
    const sampleCount = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      const envelope = Math.pow(1 - index / sampleCount, 1.65);
      const deterministicNoise = Math.sin(index * 12.9898) * 43758.5453;
      channel[index] = ((deterministicNoise - Math.floor(deterministicNoise)) * 2 - 1) * envelope;
    }

    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + duration);
    gain.gain.setValueAtTime(0.34, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    noise.connect(filter).connect(gain).connect(this.master!);
    noise.start(now);
    noise.stop(now + duration);

    const body = context.createOscillator();
    const bodyGain = context.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(118, now);
    body.frequency.exponentialRampToValueAtTime(54, now + 0.34);
    bodyGain.gain.setValueAtTime(0.18, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    body.connect(bodyGain).connect(this.master!);
    body.start(now);
    body.stop(now + 0.42);
  }

  dispose(): void {
    this.clearChirpTimer();
    this.chirpDataLoad = undefined;
    this.chirpBuffers = [];
    this.hasPlayedChirp = false;
    this.riverSource?.stop();
    this.riverSource = undefined;
    this.riverDataLoad = undefined;
    this.riverBuffer = undefined;
    this.sniffSource?.stop();
    this.sniffSource = undefined;
    this.sniffDataLoad = undefined;
    this.sniffBuffer = undefined;
    void this.context?.close();
    this.context = undefined;
    this.master = undefined;
    this.ambience = undefined;
  }

  private createGraph(): void {
    this.context = createStoryAudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : STORY_MASTER_GAIN * this.volume;
    this.master.connect(this.context.destination);
    this.ambience = this.context.createGain();
    this.ambience.gain.value = 1;
    this.ambience.connect(this.master);
  }

  private applyMasterGain(): void {
    if (!this.master || !this.context) return;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(
      this.muted ? 0 : STORY_MASTER_GAIN * this.volume,
      this.context.currentTime,
      0.08,
    );
  }

  private abandonInterruptedContext(): void {
    this.clearChirpTimer();
    for (const source of [
      this.riverSource,
      this.sniffSource,
    ]) {
      try {
        source?.stop();
      } catch {
        // A source may already have ended while the audio session changed.
      }
    }

    this.context = undefined;
    this.master = undefined;
    this.ambience = undefined;
    this.chirpLoad = undefined;
    this.chirpBuffers = [];
    this.hasPlayedChirp = false;
    this.riverLoad = undefined;
    this.riverBuffer = undefined;
    this.riverSource = undefined;
    this.sniffLoad = undefined;
    this.sniffBuffer = undefined;
    this.sniffSource = undefined;

    // The fetched ArrayBuffers are deliberately retained, so rebuilding the
    // graph requires decoding only and does not download the recordings again.
    this.chirpState = this.resetDecodeState(this.chirpState);
    this.riverState = this.resetDecodeState(this.riverState);
    this.sniffState = this.resetDecodeState(this.sniffState);
  }

  private resetDecodeState(state: LoadState): LoadState {
    return state === 'decoding' || state === 'decoded' ? 'fetched' : state;
  }

  private canPlay(): boolean {
    return Boolean(this.context && this.master && this.context.state === 'running' && !this.muted && !this.paused);
  }

  private playKnockAt(time: number): void {
    const oscillator = this.context!.createOscillator();
    const gain = this.context!.createGain();
    const filter = this.context!.createBiquadFilter();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(185, time);
    oscillator.frequency.exponentialRampToValueAtTime(92, time + 0.1);
    filter.type = 'bandpass';
    filter.frequency.value = 520;
    filter.Q.value = 1.8;
    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    oscillator.connect(filter).connect(gain).connect(this.master!);
    oscillator.start(time);
    oscillator.stop(time + 0.13);
  }

  private async startBirdAmbience(): Promise<void> {
    if (!this.context || !this.master || this.muted || this.paused) return;
    this.chirpLoad ??= this.loadChirps();
    await this.chirpLoad;
    // Confirm that ambience is active as soon as the player's gesture unlocks
    // Web Audio. Waiting through the asset load and another five-second timer
    // made the birds easy to miss, especially during the opening narration.
    if (!this.hasPlayedChirp && this.canPlay() && this.chirpBuffers.length > 0) {
      this.playRandomChirp();
    }
    this.scheduleNextChirp();
  }

  private async loadChirps(): Promise<void> {
    this.preloadAmbience();
    const context = this.context;
    if (!context) return;
    try {
      this.chirpState = 'decoding';
      const recordings = await this.chirpDataLoad!;
      if (recordings.length === 0) {
        this.chirpState = 'failed';
        return;
      }
      this.chirpBuffers = await Promise.all(
        recordings.map((recording) => decodeStoryAudioData(context, recording)),
      );
      this.chirpState = 'decoded';
    } catch (error: unknown) {
      console.warn('Unable to load bird ambience.', error);
      this.chirpBuffers = [];
      this.chirpState = 'failed';
      this.audioSession.reportError(error);
    }
  }

  private async loadRiver(): Promise<void> {
    this.preloadAmbience();
    const context = this.context;
    if (!context) return;
    try {
      this.riverState = 'decoding';
      const recording = await this.riverDataLoad!;
      this.riverBuffer = recording
        ? await decodeStoryAudioData(context, recording)
        : undefined;
      this.riverState = this.riverBuffer ? 'decoded' : 'failed';
    } catch (error: unknown) {
      console.warn('Unable to load river ambience.', error);
      this.riverBuffer = undefined;
      this.riverState = 'failed';
      this.audioSession.reportError(error);
    }
  }

  private async startRiverAmbience(): Promise<void> {
    if (!this.context || !this.ambience || this.riverSource || this.muted || this.paused) return;
    this.riverLoad ??= this.loadRiver();
    await this.riverLoad;
    if (!this.canPlay() || !this.context || !this.ambience || !this.riverBuffer || this.riverSource) return;

    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.riverBuffer;
    source.loop = true;
    source.loopEnd = this.riverBuffer.duration;
    filter.type = 'lowpass';
    filter.frequency.value = 5_200;
    filter.Q.value = 0.35;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(RIVER_VOLUME, now + 1.8);
    source.connect(filter).connect(gain).connect(this.ambience);
    source.start(now);
    this.riverSource = source;
    this.audioSession.reportEvent('River source started');
  }

  private async ensureSniffLoaded(): Promise<void> {
    this.preloadAmbience();
    const context = this.context;
    if (!context) return;
    this.sniffLoad ??= (async () => {
      try {
        this.sniffState = 'decoding';
        const recording = await this.sniffDataLoad!;
        this.sniffBuffer = recording
          ? await decodeStoryAudioData(context, recording)
          : undefined;
        this.sniffState = this.sniffBuffer ? 'decoded' : 'failed';
      } catch (error: unknown) {
        console.warn('Unable to load tiger sniff.', error);
        this.sniffBuffer = undefined;
        this.sniffState = 'failed';
        this.audioSession.reportError(error);
      }
    })();
    await this.sniffLoad;
  }

  private async playSniffsWhenReady(): Promise<void> {
    await this.ensureSniffLoaded();
    const context = this.context;
    const master = this.master;
    if (!context || !master || !this.sniffBuffer || !this.canPlay()) return;

    this.sniffSource?.stop();
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = this.sniffBuffer;
    gain.gain.value = 0.9;
    source.connect(gain).connect(master);
    source.start();
    this.sniffStarted = true;
    this.audioSession.reportEvent('Sniff source started');
    source.onended = () => {
      if (this.sniffSource === source) this.sniffSource = undefined;
    };
    this.sniffSource = source;
  }

  private preloadAmbience(): void {
    const base = import.meta.env.BASE_URL;
    if (!this.chirpDataLoad) {
      this.chirpState = 'fetching';
      this.chirpDataLoad = Promise.all([
        fetchStoryAudioData(`${base}shared/audio/birds/chirp-1.wav`),
        fetchStoryAudioData(`${base}shared/audio/birds/chirp-2.wav`),
        fetchStoryAudioData(`${base}shared/audio/birds/chirp-3.wav`),
      ]).then((data) => {
        this.chirpState = 'fetched';
        return data;
      }).catch((error: unknown) => {
        console.warn('Unable to preload bird ambience.', error);
        this.chirpState = 'failed';
        this.audioSession.reportError(error);
        return [];
      });
    }
    if (!this.riverDataLoad) {
      this.riverState = 'fetching';
      this.riverDataLoad = fetchStoryAudioData(`${base}audio/river-loop.wav`).then((data) => {
        this.riverState = 'fetched';
        return data;
      }).catch((error: unknown) => {
        console.warn('Unable to preload river ambience.', error);
        this.riverState = 'failed';
        this.audioSession.reportError(error);
        return undefined;
      });
    }
    if (!this.sniffDataLoad) {
      this.sniffState = 'fetching';
      this.sniffDataLoad = fetchStoryAudioData(`${base}audio/tiger-two-short-sniffs.wav`).then((data) => {
        this.sniffState = 'fetched';
        return data;
      }).catch((error: unknown) => {
        console.warn('Unable to preload tiger sniff.', error);
        this.sniffState = 'failed';
        this.audioSession.reportError(error);
        return undefined;
      });
    }
  }

  private scheduleNextChirp(): void {
    if (this.chirpTimer !== undefined || !this.canPlay() || this.chirpBuffers.length === 0) return;
    this.chirpTimer = window.setTimeout(() => {
      this.chirpTimer = undefined;
      this.playRandomChirp();
      this.scheduleNextChirp();
    }, 5_000);
  }

  private playRandomChirp(): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || !this.canPlay() || this.chirpBuffers.length === 0) return;
    let index = Math.floor(Math.random() * this.chirpBuffers.length);
    if (this.chirpBuffers.length > 1 && index === this.lastChirpIndex) {
      index = (index + 1) % this.chirpBuffers.length;
    }
    this.lastChirpIndex = index;
    this.hasPlayedChirp = true;
    this.audioSession.reportEvent('Bird source started');

    const buffer = this.chirpBuffers[index]!;
    const now = context.currentTime;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const pan = context.createStereoPanner();
    source.buffer = buffer;
    pan.pan.value = (Math.random() - 0.5) * 0.7;
    // Keep the call gentle, but above the noise floor of small phone speakers.
    const volume = CHIRP_MIN_VOLUME + Math.random() * CHIRP_VOLUME_RANGE;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.08);
    gain.gain.setValueAtTime(volume, now + Math.max(0.09, buffer.duration - 0.28));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + buffer.duration);
    source.connect(gain).connect(pan).connect(this.ambience ?? master);
    source.start(now);
  }

  private clearChirpTimer(): void {
    if (this.chirpTimer === undefined) return;
    window.clearTimeout(this.chirpTimer);
    this.chirpTimer = undefined;
  }
}
