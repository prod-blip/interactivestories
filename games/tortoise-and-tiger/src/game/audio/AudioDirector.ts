export class AudioDirector {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private musicTimer: number | undefined;
  private requested = false;
  private muted = false;
  private paused = false;
  private step = 0;

  start(): void {
    this.requested = true;
    if (this.context?.state === 'running') this.startScore();
  }

  async unlock(): Promise<void> {
    if (!this.context) this.createGraph();
    if (this.context?.state === 'suspended') await this.context.resume();
    if (this.requested && !this.muted && !this.paused) this.startScore();
  }

  pause(): void {
    this.paused = true;
    this.stopScore();
    if (this.context?.state === 'running') void this.context.suspend();
  }

  resume(): void {
    this.paused = false;
    if (this.muted) return;
    void this.context?.resume().then(() => {
      if (this.requested) this.startScore();
    });
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.16, this.context.currentTime, 0.08);
    }
    if (muted) this.stopScore();
    else if (!this.paused && this.context?.state === 'running' && this.requested) this.startScore();
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
    this.stopScore();
    void this.context?.close();
    this.context = undefined;
    this.master = undefined;
  }

  private createGraph(): void {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.16;
    this.master.connect(this.context.destination);

    const riverNoise = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
    const channel = riverNoise.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * 0.22;
    }
    const river = this.context.createBufferSource();
    const riverFilter = this.context.createBiquadFilter();
    const riverGain = this.context.createGain();
    river.buffer = riverNoise;
    river.loop = true;
    riverFilter.type = 'lowpass';
    riverFilter.frequency.value = 620;
    riverGain.gain.value = 0.038;
    river.connect(riverFilter).connect(riverGain).connect(this.master);
    river.start();
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

  private startScore(): void {
    if (this.musicTimer !== undefined || !this.context || !this.master) return;
    this.playMusicStep();
    this.musicTimer = window.setInterval(() => this.playMusicStep(), 620);
  }

  private stopScore(): void {
    if (this.musicTimer === undefined) return;
    window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
  }

  private playMusicStep(): void {
    if (!this.context || !this.master || this.context.state !== 'running') return;
    const scale = [261.63, 329.63, 392, 493.88, 392, 329.63, 293.66, 349.23];
    const frequency = scale[this.step % scale.length]!;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    oscillator.type = this.step % 4 === 3 ? 'triangle' : 'sine';
    oscillator.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = 1350;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.08);
    oscillator.connect(filter).connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 1.12);

    if (this.step % 2 === 0) {
      const bell = this.context.createOscillator();
      const bellGain = this.context.createGain();
      bell.type = 'sine';
      bell.frequency.value = frequency * 2;
      bellGain.gain.setValueAtTime(0.0001, now);
      bellGain.gain.exponentialRampToValueAtTime(0.035, now + 0.02);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      bell.connect(bellGain).connect(this.master);
      bell.start(now);
      bell.stop(now + 0.65);
    }
    this.step += 1;
  }
}
