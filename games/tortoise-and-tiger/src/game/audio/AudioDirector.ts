const MASTER_VOLUME = 0.3;
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
  growl: LoadState;
  growlStarted: boolean;
  lastEvent: string;
  lastError: string;
};

export class AudioDirector {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private ambience: GainNode | undefined;
  private unlocking: Promise<void> | undefined;
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
  private angryGrowlDataLoad: Promise<ArrayBuffer | undefined> | undefined;
  private angryGrowlLoad: Promise<void> | undefined;
  private angryGrowlBuffer: AudioBuffer | undefined;
  private angryGrowlSource: AudioBufferSourceNode | undefined;
  private angryGrowlRequested = false;
  private requested = false;
  private muted = false;
  private paused = false;
  private unlockAttempts = 0;
  private chirpState: LoadState = 'not-requested';
  private riverState: LoadState = 'not-requested';
  private sniffState: LoadState = 'not-requested';
  private growlState: LoadState = 'not-requested';
  private sniffStarted = false;
  private growlStarted = false;
  private lastEvent = 'Audio has not been requested';
  private lastError = '';

  start(): void {
    this.requested = true;
    // Network requests are safe before interaction, but constructing an audio
    // context here is not reliable in Safari and some mobile browsers. Keep the
    // recordings warm and create the context only inside a genuine gesture.
    this.preloadAmbience();
  }

  async unlock(): Promise<void> {
    this.unlockAttempts += 1;
    this.lastEvent = 'Trusted interaction received';
    if (this.unlocking) return this.unlocking;
    this.lastError = '';
    this.unlocking = this.performUnlock();
    try {
      await this.unlocking;
    } catch (error: unknown) {
      // A browser can reject one resume attempt during an iframe or
      // visibility transition. Every later gesture retries this path.
      console.warn('Unable to unlock story audio on this interaction.', error);
      this.lastError = error instanceof Error ? error.message : String(error);
    } finally {
      this.unlocking = undefined;
    }
  }

  private async performUnlock(): Promise<void> {
    if (!this.context) this.createGraph();
    // iOS Safari may report a resumed context but keep it silent until a
    // source has also been started by the same trusted touch. Queueing one
    // inaudible sample here primes the output without changing the mix.
    this.primeOutput();
    if (this.context && this.context.state !== 'running' && this.context.state !== 'closed') {
      await this.context.resume();
    }
    this.lastEvent = this.context?.state === 'running'
      ? 'Audio context is running'
      : `Audio context remained ${this.context?.state ?? 'unavailable'}`;
    if (this.requested && !this.muted && !this.paused) {
      await Promise.all([
        this.startBirdAmbience(),
        this.startRiverAmbience(),
        this.ensureSniffLoaded(),
        this.ensureAngryGrowlLoaded(),
      ]);
      if (this.angryGrowlRequested) void this.playAngryGrowlWhenReady();
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
    const context = this.context;
    if (!context) return;
    void context.resume().then(() => {
      if (!this.requested) return;
      void this.startBirdAmbience();
      void this.startRiverAmbience();
    }).catch(() => {
      // A visibility-driven resume may not count as a browser gesture. The
      // next click/tap/keypress will retry through unlock().
    });
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, this.context.currentTime, 0.08);
    }
    if (muted) this.clearChirpTimer();
    else if (!this.paused && this.context?.state === 'running' && this.requested) {
      void this.startBirdAmbience();
      void this.startRiverAmbience();
    }
  }

  getDiagnostics(): AudioDiagnostics {
    return {
      contextState: this.context?.state ?? 'not-created',
      unlockAttempts: this.unlockAttempts,
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
      growl: this.growlState,
      growlStarted: this.growlStarted,
      lastEvent: this.lastEvent,
      lastError: this.lastError,
    };
  }

  async playDiagnosticTone(): Promise<void> {
    await this.unlock();
    if (!this.canPlay() || !this.context || !this.master) {
      this.lastEvent = 'Test tone could not start';
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
    this.lastEvent = 'Test tone source started';
  }

  playStomachGrowl(): void {
    if (!this.context || !this.master || this.context.state !== 'running' || this.muted || this.paused) return;
    const now = this.context.currentTime;
    const duration = 1.65;
    const growlGain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(190, now);
    filter.frequency.exponentialRampToValueAtTime(86, now + duration);
    growlGain.gain.setValueAtTime(0.0001, now);
    growlGain.gain.exponentialRampToValueAtTime(0.44, now + 0.16);
    growlGain.gain.exponentialRampToValueAtTime(0.18, now + 0.82);
    growlGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    growlGain.connect(this.master);

    for (const [frequency, detune] of [[58, -8], [71, 7], [43, 0]] as const) {
      const oscillator = this.context.createOscillator();
      const tremolo = this.context.createGain();
      oscillator.type = frequency === 43 ? 'sine' : 'sawtooth';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + duration);
      oscillator.detune.value = detune;
      tremolo.gain.setValueAtTime(0.32, now);
      tremolo.gain.linearRampToValueAtTime(0.12, now + 0.5);
      tremolo.gain.linearRampToValueAtTime(0.3, now + 1.02);
      tremolo.gain.linearRampToValueAtTime(0.08, now + duration);
      oscillator.connect(tremolo).connect(filter).connect(growlGain);
      oscillator.start(now);
      oscillator.stop(now + duration);
    }
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

  playAngryGrowl(): void {
    if (this.muted || this.paused) return;
    this.angryGrowlRequested = true;
    void this.playAngryGrowlWhenReady();
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
    this.angryGrowlSource?.stop();
    this.angryGrowlSource = undefined;
    this.angryGrowlDataLoad = undefined;
    this.angryGrowlBuffer = undefined;
    this.angryGrowlRequested = false;
    void this.context?.close();
    this.context = undefined;
    this.master = undefined;
    this.ambience = undefined;
  }

  private createGraph(): void {
    const AudioContextConstructor = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) throw new Error('Web Audio is not supported by this browser.');
    this.context = new AudioContextConstructor();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.master.connect(this.context.destination);
    this.ambience = this.context.createGain();
    this.ambience.gain.value = 1;
    this.ambience.connect(this.master);
  }

  private primeOutput(): void {
    if (!this.context || this.context.state === 'closed') return;
    const source = this.context.createBufferSource();
    source.buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
    // Connect the gesture primer straight to the hardware destination. iOS
    // Safari can leave the output route closed when an inaudible primer only
    // travels through the game's gain graph.
    source.connect(this.context.destination);
    source.start(0);
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
        recordings.map((recording) => context.decodeAudioData(recording.slice(0))),
      );
      this.chirpState = 'decoded';
    } catch (error: unknown) {
      console.warn('Unable to load bird ambience.', error);
      this.chirpBuffers = [];
      this.chirpState = 'failed';
      this.lastError = error instanceof Error ? error.message : String(error);
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
        ? await context.decodeAudioData(recording.slice(0))
        : undefined;
      this.riverState = this.riverBuffer ? 'decoded' : 'failed';
    } catch (error: unknown) {
      console.warn('Unable to load river ambience.', error);
      this.riverBuffer = undefined;
      this.riverState = 'failed';
      this.lastError = error instanceof Error ? error.message : String(error);
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
    this.lastEvent = 'River source started';
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
          ? await context.decodeAudioData(recording.slice(0))
          : undefined;
        this.sniffState = this.sniffBuffer ? 'decoded' : 'failed';
      } catch (error: unknown) {
        console.warn('Unable to load tiger sniff.', error);
        this.sniffBuffer = undefined;
        this.sniffState = 'failed';
        this.lastError = error instanceof Error ? error.message : String(error);
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
    this.lastEvent = 'Sniff source started';
    source.onended = () => {
      if (this.sniffSource === source) this.sniffSource = undefined;
    };
    this.sniffSource = source;
  }

  private async ensureAngryGrowlLoaded(): Promise<void> {
    this.preloadAmbience();
    const context = this.context;
    if (!context) return;
    this.angryGrowlLoad ??= (async () => {
      try {
        this.growlState = 'decoding';
        const recording = await this.angryGrowlDataLoad!;
        this.angryGrowlBuffer = recording
          ? await context.decodeAudioData(recording.slice(0))
          : undefined;
        this.growlState = this.angryGrowlBuffer ? 'decoded' : 'failed';
      } catch (error: unknown) {
        console.warn('Unable to load angry tiger growl.', error);
        this.angryGrowlBuffer = undefined;
        this.growlState = 'failed';
        this.lastError = error instanceof Error ? error.message : String(error);
      }
    })();
    await this.angryGrowlLoad;
  }

  private async playAngryGrowlWhenReady(): Promise<void> {
    await this.ensureAngryGrowlLoaded();
    const context = this.context;
    const master = this.master;
    const ambience = this.ambience;
    if (!this.angryGrowlRequested || !context || !master || !ambience
      || !this.angryGrowlBuffer || !this.canPlay()) return;

    this.angryGrowlRequested = false;
    this.angryGrowlSource?.stop();
    const source = context.createBufferSource();
    const gain = context.createGain();
    const now = context.currentTime;
    const growlEnd = now + this.angryGrowlBuffer.duration;
    source.buffer = this.angryGrowlBuffer;
    gain.gain.value = 1.05;

    // Give the one dramatic growl room without altering the player's chosen
    // master volume. Only the river and birds dip, then return gently.
    ambience.gain.cancelScheduledValues(now);
    ambience.gain.setValueAtTime(ambience.gain.value, now);
    ambience.gain.linearRampToValueAtTime(0.22, now + 0.14);
    ambience.gain.setValueAtTime(0.22, Math.max(now + 0.14, growlEnd - 0.55));
    ambience.gain.linearRampToValueAtTime(1, growlEnd + 0.4);

    source.connect(gain).connect(master);
    source.start(now);
    this.growlStarted = true;
    this.lastEvent = 'Growl source started';
    source.onended = () => {
      if (this.angryGrowlSource === source) this.angryGrowlSource = undefined;
    };
    this.angryGrowlSource = source;
  }

  private preloadAmbience(): void {
    const base = import.meta.env.BASE_URL;
    if (!this.chirpDataLoad) {
      this.chirpState = 'fetching';
      this.chirpDataLoad = Promise.all([
        this.fetchAudioData(`${base}shared/audio/birds/chirp-1.wav`),
        this.fetchAudioData(`${base}shared/audio/birds/chirp-2.wav`),
        this.fetchAudioData(`${base}shared/audio/birds/chirp-3.wav`),
      ]).then((data) => {
        this.chirpState = 'fetched';
        return data;
      }).catch((error: unknown) => {
        console.warn('Unable to preload bird ambience.', error);
        this.chirpState = 'failed';
        this.lastError = error instanceof Error ? error.message : String(error);
        return [];
      });
    }
    if (!this.riverDataLoad) {
      this.riverState = 'fetching';
      this.riverDataLoad = this.fetchAudioData(`${base}audio/river-loop.wav`).then((data) => {
        this.riverState = 'fetched';
        return data;
      }).catch((error: unknown) => {
        console.warn('Unable to preload river ambience.', error);
        this.riverState = 'failed';
        this.lastError = error instanceof Error ? error.message : String(error);
        return undefined;
      });
    }
    if (!this.sniffDataLoad) {
      this.sniffState = 'fetching';
      this.sniffDataLoad = this.fetchAudioData(`${base}audio/tiger-two-short-sniffs.wav`).then((data) => {
        this.sniffState = 'fetched';
        return data;
      }).catch((error: unknown) => {
        console.warn('Unable to preload tiger sniff.', error);
        this.sniffState = 'failed';
        this.lastError = error instanceof Error ? error.message : String(error);
        return undefined;
      });
    }
    if (!this.angryGrowlDataLoad) {
      this.growlState = 'fetching';
      this.angryGrowlDataLoad = this.fetchAudioData(`${base}audio/tiger-angry-growl.wav`).then((data) => {
        this.growlState = 'fetched';
        return data;
      }).catch((error: unknown) => {
        console.warn('Unable to preload angry tiger growl.', error);
        this.growlState = 'failed';
        this.lastError = error instanceof Error ? error.message : String(error);
        return undefined;
      });
    }
  }

  private async fetchAudioData(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
    return response.arrayBuffer();
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
    this.lastEvent = 'Bird source started';

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
