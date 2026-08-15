export class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambienceLoad: Promise<void> | null = null;
  private chirpBuffers: AudioBuffer[] = [];
  private splashBuffer: AudioBuffer | null = null;
  private drinkingBuffer: AudioBuffer | null = null;
  private drinkingSource: AudioBufferSourceNode | null = null;
  private drinkingGain: GainNode | null = null;
  private drinkingStopTimer: number | null = null;
  private wingBuffer: AudioBuffer | null = null;
  private wingSource: AudioBufferSourceNode | null = null;
  private wingGain: GainNode | null = null;
  private wingStopTimer: number | null = null;
  private chirpTimer: number | null = null;
  private lastChirpIndex = -1;
  private flying = false;
  private drinking = false;
  private reducedMotion = false;
  private muted = false;

  async start(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.34;
      this.master.connect(this.context.destination);
    }
    if (this.context.state !== 'running') await this.context.resume();
    this.ambienceLoad ??= this.loadAmbience();
    await this.ambienceLoad;
    this.scheduleNextChirp();
  }

  playPickup(): void {
    this.chime([523.25, 659.25], 0.07);
  }

  playDrop(_index: number): void {
    if (!this.context || !this.master) return;
    this.playSplash();
  }

  playEnding(): void {
    this.chime([392, 523.25, 659.25, 783.99], 0.065);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.context && this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.34, this.context.currentTime, 0.04);
  }

  setFlying(flying: boolean): void {
    if (this.flying === flying) return;
    this.flying = flying;
    if (flying) this.startWingLoop();
    else this.stopWingLoop();
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (!this.context || !this.wingSource) return;
    this.wingSource.playbackRate.setTargetAtTime(reduced ? 0.65 : 1, this.context.currentTime, 0.08);
  }

  setDrinking(drinking: boolean): void {
    if (this.drinking === drinking) return;
    this.drinking = drinking;
    if (drinking) this.startDrinkingLoop();
    else this.stopDrinkingLoop();
  }

  async pause(): Promise<void> {
    this.clearChirpTimer();
    if (this.context?.state === 'running') await this.context.suspend();
  }

  async resume(): Promise<void> {
    if (this.context && this.context.state !== 'running') await this.context.resume();
    this.scheduleNextChirp();
  }

  dispose(): void {
    this.clearChirpTimer();
    this.clearWingStopTimer();
    this.clearDrinkingStopTimer();
    this.drinkingSource?.stop();
    this.drinkingBuffer = null;
    this.drinkingSource = null;
    this.drinkingGain = null;
    this.wingSource?.stop();
    this.splashBuffer = null;
    this.wingBuffer = null;
    this.wingSource = null;
    this.wingGain = null;
    this.chirpBuffers = [];
    if (this.context) void this.context.close();
    this.context = null;
    this.master = null;
  }

  private async loadAmbience(): Promise<void> {
    if (!this.context || !this.master) return;
    try {
      const base = import.meta.env.BASE_URL;
      const [wingLoop, splash, drinking, ...chirps] = await Promise.all([
        this.loadBuffer(`${base}audio/bird-flap-loop.wav`),
        this.loadBuffer(`${base}audio/splash-recording-2.wav`),
        this.loadBuffer(`${base}audio/crow-drinking-water.wav`),
        this.loadBuffer(`${base}shared/audio/birds/chirp-1.wav`),
        this.loadBuffer(`${base}shared/audio/birds/chirp-2.wav`),
        this.loadBuffer(`${base}shared/audio/birds/chirp-3.wav`),
      ]);
      if (!this.context || !this.master) return;
      this.wingBuffer = wingLoop;
      this.splashBuffer = splash;
      this.drinkingBuffer = drinking;
      this.chirpBuffers = chirps;
      if (this.flying) this.startWingLoop();
      if (this.drinking) this.startDrinkingLoop();
    } catch (error: unknown) {
      console.warn('Unable to load summer ambience.', error);
    }
  }

  private async loadBuffer(url: string): Promise<AudioBuffer> {
    if (!this.context) throw new Error('Audio context is not ready.');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
    return this.context.decodeAudioData(await response.arrayBuffer());
  }

  private scheduleNextChirp(): void {
    if (this.chirpTimer !== null || this.chirpBuffers.length === 0 || !this.context || this.context.state !== 'running') return;
    // Keep the timing regular while varying the bird, position, and volume.
    const delay = 5_000;
    this.chirpTimer = window.setTimeout(() => {
      this.chirpTimer = null;
      this.playRandomChirp();
      this.scheduleNextChirp();
    }, delay);
  }

  private playRandomChirp(): void {
    if (!this.context || !this.master || this.chirpBuffers.length === 0) return;
    let index = Math.floor(Math.random() * this.chirpBuffers.length);
    if (this.chirpBuffers.length > 1 && index === this.lastChirpIndex) index = (index + 1) % this.chirpBuffers.length;
    this.lastChirpIndex = index;

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const pan = this.context.createStereoPanner();
    const now = this.context.currentTime;
    const duration = this.chirpBuffers[index].duration;
    source.buffer = this.chirpBuffers[index];
    pan.pan.value = (Math.random() - 0.5) * 0.7;
    const volume = 0.09 + Math.random() * 0.035;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.08);
    gain.gain.setValueAtTime(volume, now + Math.max(0.09, duration - 0.28));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(gain).connect(pan).connect(this.master);
    source.start(now);
  }

  private clearChirpTimer(): void {
    if (this.chirpTimer === null) return;
    window.clearTimeout(this.chirpTimer);
    this.chirpTimer = null;
  }

  private startWingLoop(): void {
    if (!this.context || !this.master || !this.wingBuffer) return;
    // Restart from the beginning on every takeoff so the audible stroke stays
    // phase-aligned with the one-second Fly_Loop animation.
    this.clearWingStopTimer();
    this.wingSource?.stop();
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    source.buffer = this.wingBuffer;
    source.loop = true;
    source.playbackRate.value = this.reducedMotion ? 0.65 : 1;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setTargetAtTime(0.14, now, 0.1);
    source.connect(gain).connect(this.master);
    source.start(now);
    this.wingSource = source;
    this.wingGain = gain;
  }

  private stopWingLoop(): void {
    if (!this.context || !this.wingSource || !this.wingGain) return;
    const source = this.wingSource;
    const now = this.context.currentTime;
    this.wingGain.gain.cancelScheduledValues(now);
    this.wingGain.gain.setTargetAtTime(0.0001, now, 0.09);
    this.clearWingStopTimer();
    this.wingStopTimer = window.setTimeout(() => {
      if (this.wingSource !== source) return;
      source.stop();
      this.wingSource = null;
      this.wingGain = null;
      this.wingStopTimer = null;
    }, 420);
  }

  private clearWingStopTimer(): void {
    if (this.wingStopTimer === null) return;
    window.clearTimeout(this.wingStopTimer);
    this.wingStopTimer = null;
  }

  private startDrinkingLoop(): void {
    if (!this.context || !this.master || !this.drinkingBuffer) return;
    this.clearDrinkingStopTimer();
    this.drinkingSource?.stop();
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    source.buffer = this.drinkingBuffer;
    source.loop = true;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setTargetAtTime(0.45, now, 0.12);
    source.connect(gain).connect(this.master);
    source.start(now);
    this.drinkingSource = source;
    this.drinkingGain = gain;
  }

  private stopDrinkingLoop(): void {
    if (!this.context || !this.drinkingSource || !this.drinkingGain) return;
    const source = this.drinkingSource;
    const now = this.context.currentTime;
    this.drinkingGain.gain.cancelScheduledValues(now);
    this.drinkingGain.gain.setTargetAtTime(0.0001, now, 0.1);
    this.clearDrinkingStopTimer();
    this.drinkingStopTimer = window.setTimeout(() => {
      if (this.drinkingSource !== source) return;
      source.stop();
      this.drinkingSource = null;
      this.drinkingGain = null;
      this.drinkingStopTimer = null;
    }, 460);
  }

  private clearDrinkingStopTimer(): void {
    if (this.drinkingStopTimer === null) return;
    window.clearTimeout(this.drinkingStopTimer);
    this.drinkingStopTimer = null;
  }

  private playSplash(): void {
    if (!this.context || !this.master || !this.splashBuffer) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.splashBuffer;
    // The splash is a story beat: audible above ambience without becoming harsh.
    gain.gain.value = 0.48;
    source.connect(gain).connect(this.master);
    source.start();
  }

  private chime(notes: number[], volume: number): void {
    if (!this.context) return;
    notes.forEach((note, index) => this.tone(note, this.context!.currentTime + index * 0.12, 0.7, volume, 'sine'));
  }

  private tone(frequency: number, start: number, duration: number, volume: number, shape: OscillatorType): void {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = shape;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }
}
