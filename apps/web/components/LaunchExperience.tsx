'use client';

import { useEffect, useState } from 'react';

const LAUNCH_SEEN_KEY = 'moonlit:launch-seen';

function playWindChimes() {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return undefined;

  const context = new AudioContextClass();
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.35);
  master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 4.1);
  master.connect(context.destination);

  const notes = [1046.5, 1318.51, 1567.98, 2093, 1760, 1318.51];
  notes.forEach((frequency, index) => {
    const start = context.currentTime + 0.28 + index * 0.43;
    const noteGain = context.createGain();
    const panner = context.createStereoPanner();
    panner.pan.value = index % 2 === 0 ? -0.28 : 0.28;
    noteGain.gain.setValueAtTime(0.0001, start);
    noteGain.gain.exponentialRampToValueAtTime(index < 3 ? 0.5 : 0.34, start + 0.025);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, start + 1.85);
    noteGain.connect(panner);
    panner.connect(master);

    [1, 2.01, 3.98].forEach((harmonic, harmonicIndex) => {
      const oscillator = context.createOscillator();
      const harmonicGain = context.createGain();
      oscillator.type = harmonicIndex === 0 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency * harmonic, start);
      oscillator.detune.setValueAtTime(harmonicIndex * 2.5, start);
      harmonicGain.gain.value = [0.72, 0.16, 0.05][harmonicIndex];
      oscillator.connect(harmonicGain);
      harmonicGain.connect(noteGain);
      oscillator.start(start);
      oscillator.stop(start + 1.9);
    });
  });

  void context.resume();
  window.setTimeout(() => void context.close(), 4400);
  return context;
}

export function LaunchExperience() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (window.sessionStorage.getItem(LAUNCH_SEEN_KEY)) {
      setVisible(false);
      return;
    }

    const audioContext = playWindChimes();
    const resumeAudio = () => void audioContext?.resume();
    const launchDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1200 : 4100;
    window.addEventListener('pointerdown', resumeAudio, { once: true });
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(LAUNCH_SEEN_KEY, 'true');
      setVisible(false);
    }, launchDuration);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', resumeAudio);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    window.sessionStorage.setItem(LAUNCH_SEEN_KEY, 'true');
    setVisible(false);
  };

  return (
    <div className="launch-experience" role="status" aria-label="Moonlit Stories is opening">
      <div className="launch-stars" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
      </div>
      <div className="launch-horizon" aria-hidden="true" />
      <div className="launch-mark" aria-hidden="true">
        <span className="launch-moon" />
        <span className="launch-orbit" />
        <span className="launch-spark launch-spark--one">✦</span>
        <span className="launch-spark launch-spark--two">✧</span>
      </div>
      <div className="launch-title">
        <p>Once upon a quiet night</p>
        <h1><span>Moonlit</span> <span>Stories</span></h1>
        <small>Gentle worlds are waiting</small>
      </div>
      <button type="button" onClick={dismiss}>Skip intro</button>
    </div>
  );
}
