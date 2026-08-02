'use client';

import Link from 'next/link';
import { ArrowLeft, Maximize2 } from 'lucide-react';
import { useRef } from 'react';
import { Brand } from './Brand';

type GameFrameProps = {
  title: string;
  storyHref: string;
  src: string;
};

export function GameFrame({ title, storyHref, src }: GameFrameProps) {
  const frameWrap = useRef<HTMLDivElement>(null);

  async function enterFullscreen() {
    if (frameWrap.current?.requestFullscreen) {
      await frameWrap.current.requestFullscreen();
    }
  }

  return (
    <main className="play-shell">
      <header className="play-header">
        <Brand />
        <span className="play-title">{title}</span>
        <div className="play-actions">
          <button className="icon-button" type="button" onClick={enterFullscreen} aria-label="Enter full screen">
            <Maximize2 size={18} />
          </button>
          <Link className="quiet-button" href={storyHref}>
            <ArrowLeft size={17} />
            Leave story
          </Link>
        </div>
      </header>
      <div className="game-frame-wrap" ref={frameWrap}>
        <iframe
          className="game-frame"
          src={src}
          title={title}
          allow="autoplay; fullscreen"
        />
      </div>
    </main>
  );
}
