export class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private chirpLoad: Promise<void> | null = null;
  private chirpBuffers: AudioBuffer[] = [];
  private braggingLoad: Promise<void> | null = null;
  private braggingBuffer: AudioBuffer | null = null;
  private braggingSource: AudioBufferSourceNode | null = null;
  private braggingGain: GainNode | null = null;
  private startledLoad: Promise<void> | null = null;
  private startledBuffer: AudioBuffer | null = null;
  private finalChaseLoad: Promise<void> | null = null;
  private finalChaseBuffer: AudioBuffer | null = null;
  private finalChaseSource: AudioBufferSourceNode | null = null;
  private finalChaseGain: GainNode | null = null;
  private snoreLoad: Promise<void> | null = null;
  private snoreBuffer: AudioBuffer | null = null;
  private snoreSource: AudioBufferSourceNode | null = null;
  private snoreGain: GainNode | null = null;
  private victoryLoad: Promise<void> | null = null;
  private victoryBuffer: AudioBuffer | null = null;
  private victorySource: AudioBufferSourceNode | null = null;
  private victoryGain: GainNode | null = null;
  private lastChirpIndex = -1;
  private wildlifeTimer = 0;
  private braggingTimer = 0;
  private braggingActive = false;
  private startPromise: Promise<void> | null = null;
  private started = false;
  private disposed = false;
  private muted = false;

  start(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.startPromise ??= this.startInternal().catch((error: unknown) => {
      // Safari may reject an automatic resume before the first direct gesture.
      // Clear the in-flight attempt so the next pointer/key gesture can retry.
      this.startPromise = null;
      throw error;
    });
    return this.startPromise;
  }

  private async startInternal(): Promise<void> {
    if (!this.context) this.createGraph();
    if (!this.context) return;
    if (this.context.state !== 'running') await this.context.resume();
    if (this.started) return;
    this.started = true;
    this.chirpLoad ??= this.loadBirdChirps();
    this.braggingLoad ??= this.loadBraggingClip();
    this.startledLoad ??= this.loadStartledClip();
    this.finalChaseLoad ??= this.loadFinalChaseClip();
    this.snoreLoad ??= this.loadSnoreClip();
    this.victoryLoad ??= this.loadVictoryClip();
    await Promise.all([
      this.chirpLoad,
      this.braggingLoad,
      this.startledLoad,
      this.finalChaseLoad,
      this.snoreLoad,
      this.victoryLoad,
    ]);
    if (this.disposed) return;
    this.scheduleBirdCall();
    this.wildlifeTimer = window.setInterval(() => this.scheduleBirdCall(), 6800);
  }

  async pause(): Promise<void> {
    if (this.context?.state === 'running') await this.context.suspend();
  }

  async resume(): Promise<void> {
    if (this.context && this.context.state !== 'running') await this.context.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.context || !this.master) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.62, this.context.currentTime, 0.04);
  }

  dispose(): void {
    this.disposed = true;
    window.clearInterval(this.wildlifeTimer);
    this.stopSnoring();
    this.stopBraggingFlourishes();
    this.stopFinalChaseCue();
    this.stopVictoryCue();
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.chirpBuffers = [];
    this.braggingBuffer = null;
    this.startledBuffer = null;
    this.finalChaseBuffer = null;
    this.snoreBuffer = null;
    this.victoryBuffer = null;
  }

  startSnoring(): void {
    if (
      this.disposed
      || this.snoreSource
      || !this.context
      || !this.master
      || !this.snoreBuffer
      || this.context.state !== 'running'
    ) return;
    const source = this.context.createBufferSource();
    const highpass = this.context.createBiquadFilter();
    const lowpass = this.context.createBiquadFilter();
    const compressor = this.context.createDynamicsCompressor();
    const gain = this.context.createGain();
    const start = this.context.currentTime + 0.04;
    source.buffer = this.snoreBuffer;
    source.loop = true;
    highpass.type = 'highpass';
    highpass.frequency.value = 55;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2200;
    lowpass.Q.value = 0.35;
    compressor.threshold.value = -30;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.012;
    compressor.release.value = 0.28;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(2.5, start + 0.55);
    source.connect(highpass).connect(lowpass).connect(compressor).connect(gain).connect(this.master);
    source.onended = () => {
      if (this.snoreSource === source) {
        this.snoreSource = null;
        this.snoreGain = null;
      }
    };
    this.snoreSource = source;
    this.snoreGain = gain;
    source.start(start);
  }

  stopSnoring(): void {
    if (!this.context || !this.snoreSource || !this.snoreGain) return;
    const now = this.context.currentTime;
    this.snoreGain.gain.cancelScheduledValues(now);
    this.snoreGain.gain.setTargetAtTime(0.0001, now, 0.16);
    try {
      this.snoreSource.stop(now + 0.65);
    } catch {
      // The recording may already have ended naturally.
    }
    this.snoreSource = null;
    this.snoreGain = null;
  }

  startBraggingFlourishes(): void {
    if (this.disposed || this.braggingActive) return;
    this.braggingActive = true;
    this.scheduleBraggingFlourish(320);
  }

  stopBraggingFlourishes(): void {
    this.braggingActive = false;
    window.clearTimeout(this.braggingTimer);
    this.braggingTimer = 0;
    if (this.context && this.braggingGain && this.braggingSource) {
      const now = this.context.currentTime;
      this.braggingGain.gain.cancelScheduledValues(now);
      this.braggingGain.gain.setTargetAtTime(0.0001, now, 0.08);
      try {
        this.braggingSource.stop(now + 0.35);
      } catch {
        // The clip may already have ended naturally.
      }
    }
    this.braggingSource = null;
    this.braggingGain = null;
  }

  playFinalChaseCue(): void {
    if (
      !this.context
      || !this.master
      || !this.finalChaseBuffer
      || this.context.state !== 'running'
    ) return;
    this.stopFinalChaseCue(0.08);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const start = this.context.currentTime + 0.05;
    source.buffer = this.finalChaseBuffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 2300;
    filter.Q.value = 0.4;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.11, start + 0.58);
    source.connect(filter).connect(gain).connect(this.master);
    source.onended = () => {
      if (this.finalChaseSource === source) {
        this.finalChaseSource = null;
        this.finalChaseGain = null;
      }
    };
    this.finalChaseSource = source;
    this.finalChaseGain = gain;
    source.start(start);
  }

  stopFinalChaseCue(fadeSeconds = 0.45): void {
    if (!this.context || !this.finalChaseSource || !this.finalChaseGain) return;
    const now = this.context.currentTime;
    this.finalChaseGain.gain.cancelScheduledValues(now);
    this.finalChaseGain.gain.setTargetAtTime(0.0001, now, Math.max(0.01, fadeSeconds / 3));
    try {
      this.finalChaseSource.stop(now + fadeSeconds);
    } catch {
      // The cue may already have ended naturally.
    }
    this.finalChaseSource = null;
    this.finalChaseGain = null;
  }

  playRabbitStartled(): void {
    if (
      !this.context
      || !this.master
      || !this.startledBuffer
      || this.context.state !== 'running'
    ) return;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const start = this.context.currentTime + 0.04;
    const duration = this.startledBuffer.duration;
    source.buffer = this.startledBuffer;
    filter.type = 'lowpass';
    filter.frequency.value = 2700;
    filter.Q.value = 0.35;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.075, start + 0.08);
    gain.gain.setValueAtTime(0.075, start + Math.max(0.09, duration - 0.28));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(start);
  }

  playTortoiseVictoryCue(): void {
    if (
      !this.context
      || !this.master
      || !this.victoryBuffer
      || this.context.state !== 'running'
    ) return;
    this.stopVictoryCue(0.08);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const start = this.context.currentTime + 0.04;
    const duration = this.victoryBuffer.duration;
    source.buffer = this.victoryBuffer;
    filter.type = 'lowpass';
    filter.frequency.value = 3200;
    filter.Q.value = 0.35;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.42);
    gain.gain.setValueAtTime(0.4, start + Math.max(0.43, duration - 0.85));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.onended = () => {
      if (this.victorySource === source) {
        this.victorySource = null;
        this.victoryGain = null;
      }
    };
    this.victorySource = source;
    this.victoryGain = gain;
    source.start(start);
  }

  stopVictoryCue(fadeSeconds = 0.45): void {
    if (!this.context || !this.victorySource || !this.victoryGain) return;
    const now = this.context.currentTime;
    this.victoryGain.gain.cancelScheduledValues(now);
    this.victoryGain.gain.setTargetAtTime(0.0001, now, Math.max(0.01, fadeSeconds / 3));
    try {
      this.victorySource.stop(now + fadeSeconds);
    } catch {
      // The cue may already have ended naturally.
    }
    this.victorySource = null;
    this.victoryGain = null;
  }

  playDistantCheering(): void {
    if (!this.context || !this.master || this.context.state !== 'running') return;
    const start = this.context.currentTime + 0.08;
    const calls = [
      [392, 523.25, 0], [440, 587.33, 0.34], [523.25, 698.46, 0.72],
      [349.23, 493.88, 1.2], [440, 659.25, 1.55], [523.25, 783.99, 2.0],
    ] as const;
    calls.forEach(([frequency, endFrequency, offset], index) => {
      this.playTone(
        frequency,
        start + offset,
        0.42 + (index % 2) * 0.12,
        0.0042 + (index % 3) * 0.0011,
        index % 2 ? 'sine' : 'triangle',
        endFrequency,
      );
    });
    this.playTone(261.63, start + 0.15, 2.7, 0.0028, 'sine', 329.63);
  }

  playVictoryCelebration(): void {
    if (!this.context || !this.master || this.context.state !== 'running') return;
    this.playDistantCheering();
    const start = this.context.currentTime + 0.08;
    [0.12, 0.3, 0.66, 0.84, 1.18, 1.36, 1.72, 1.9, 2.3, 2.48, 2.82, 3.0]
      .forEach((offset, index) => this.scheduleClap(start + offset, 0.008 + index % 2 * 0.002));
  }

  private createGraph(): void {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.62;
    this.master.connect(this.context.destination);
  }

  private scheduleBirdCall(): void {
    if (
      !this.context
      || !this.master
      || this.context.state !== 'running'
      || this.chirpBuffers.length === 0
    ) return;
    let index = Math.floor(Math.random() * this.chirpBuffers.length);
    if (this.chirpBuffers.length > 1 && index === this.lastChirpIndex) {
      index = (index + 1) % this.chirpBuffers.length;
    }
    const buffer = this.chirpBuffers[index];
    if (!buffer) return;
    this.lastChirpIndex = index;

    const start = this.context.currentTime + 0.2 + Math.random() * 1.4;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const pan = this.context.createStereoPanner();
    source.buffer = buffer;
    source.playbackRate.value = 0.95 + Math.random() * 0.1;
    pan.pan.value = (Math.random() - 0.5) * 0.85;
    const volume = 0.065 + Math.random() * 0.025;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.07);
    gain.gain.setValueAtTime(volume, start + Math.max(0.08, buffer.duration - 0.24));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + buffer.duration);
    source.connect(gain).connect(pan).connect(this.master);
    source.start(start);
  }

  private async loadBirdChirps(): Promise<void> {
    if (!this.context) return;
    const base = import.meta.env.BASE_URL;
    try {
      this.chirpBuffers = await Promise.all([
        this.loadBuffer(`${base}shared/audio/birds/chirp-1.wav`),
        this.loadBuffer(`${base}shared/audio/birds/chirp-2.wav`),
        this.loadBuffer(`${base}shared/audio/birds/chirp-3.wav`),
      ]);
    } catch (error: unknown) {
      this.chirpBuffers = [];
      console.warn('Unable to load shared forest bird chirps.', error);
    }
  }

  private async loadBraggingClip(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    try {
      this.braggingBuffer = await this.loadBuffer(`${base}audio/rabbit-pizzicato-intrigue.wav`);
    } catch (error: unknown) {
      this.braggingBuffer = null;
      console.warn('Unable to load the rabbit pizzicato clip.', error);
    }
  }

  private async loadStartledClip(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    try {
      this.startledBuffer = await this.loadBuffer(`${base}audio/rabbit-startled.wav`);
    } catch (error: unknown) {
      this.startledBuffer = null;
      console.warn('Unable to load the shared rabbit startled cue.', error);
    }
  }

  private async loadFinalChaseClip(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    try {
      this.finalChaseBuffer = await this.loadBuffer(`${base}audio/final-chase.wav`);
    } catch (error: unknown) {
      this.finalChaseBuffer = null;
      console.warn('Unable to load the shared final chase cue.', error);
    }
  }

  private async loadSnoreClip(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    try {
      this.snoreBuffer = await this.loadBuffer(`${base}audio/rabbit-snoring.mp3`);
    } catch (error: unknown) {
      this.snoreBuffer = null;
      console.warn('Unable to load the shared rabbit snoring recording.', error);
    }
  }

  private async loadVictoryClip(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    try {
      this.victoryBuffer = await this.loadBuffer(`${base}audio/tortoise-victory.wav`);
    } catch (error: unknown) {
      this.victoryBuffer = null;
      console.warn('Unable to load the shared tortoise victory cue.', error);
    }
  }

  private async loadBuffer(url: string): Promise<AudioBuffer> {
    if (!this.context) throw new Error('Audio context is not ready.');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
    return this.context.decodeAudioData(await response.arrayBuffer());
  }

  private scheduleBraggingFlourish(delay: number): void {
    if (!this.braggingActive || this.disposed || this.braggingTimer) return;
    this.braggingTimer = window.setTimeout(() => {
      this.braggingTimer = 0;
      if (!this.braggingActive || this.disposed) return;
      const clipDuration = this.playBraggingFlourish();
      const quietGap = 1700 + Math.random() * 1600;
      this.scheduleBraggingFlourish(clipDuration * 1000 + quietGap);
    }, delay);
  }

  private playBraggingFlourish(): number {
    if (
      !this.context
      || !this.master
      || !this.braggingBuffer
      || this.context.state !== 'running'
    ) return 1.5;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const start = this.context.currentTime + 0.04;
    source.buffer = this.braggingBuffer;
    filter.type = 'lowpass';
    filter.frequency.value = 2250;
    filter.Q.value = 0.4;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.11, start + 0.42);
    gain.gain.setValueAtTime(0.11, start + Math.max(0.43, this.braggingBuffer.duration - 0.72));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + this.braggingBuffer.duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.onended = () => {
      if (this.braggingSource === source) {
        this.braggingSource = null;
        this.braggingGain = null;
      }
    };
    this.braggingSource = source;
    this.braggingGain = gain;
    source.start(start);
    return this.braggingBuffer.duration;
  }

  private scheduleClap(start: number, volume: number): void {
    if (!this.context || !this.master) return;
    const duration = 0.085;
    const frameCount = Math.ceil(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      const decay = Math.pow(1 - index / samples.length, 3.4);
      samples[index] = (Math.random() * 2 - 1) * decay;
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 1450;
    filter.Q.value = 0.72;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  private playTone(
    frequency: number,
    start: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    endFrequency = frequency,
  ): void {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }
}
