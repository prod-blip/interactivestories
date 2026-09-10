'use client';

import { Minus, Plus, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DEFAULT_MASTER_VOLUME, readMasterVolume, writeMasterVolume } from '@/lib/audio-preferences';

const STEP = 0.1;

export function ShelfSoundControl() {
  const [volume, setVolume] = useState(DEFAULT_MASTER_VOLUME);
  const [open, setOpen] = useState(false);

  useEffect(() => setVolume(readMasterVolume()), []);

  const updateVolume = (next: number) => setVolume(writeMasterVolume(next));
  const Icon = volume <= 0 ? VolumeX : volume < 0.55 ? Volume1 : Volume2;

  return (
    <div className={`shelf-sound${open ? ' is-open' : ''}`}>
      <button className="shelf-sound__toggle" type="button" aria-label={open ? 'Close sound controls' : 'Adjust story sound'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Icon size={17} />
      </button>
      <div className="shelf-sound__panel" aria-hidden={!open}>
        <button type="button" aria-label="Decrease story volume" onClick={() => updateVolume(volume - STEP)} disabled={volume <= 0}><Minus size={15} /></button>
        <input aria-label="Story volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => updateVolume(Number(event.currentTarget.value))} />
        <span aria-live="polite">{Math.round(volume * 100)}%</span>
        <button type="button" aria-label="Increase story volume" onClick={() => updateVolume(volume + STEP)} disabled={volume >= 1}><Plus size={15} /></button>
      </div>
    </div>
  );
}
