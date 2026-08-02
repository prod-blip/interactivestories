'use client';

import Link from 'next/link';
import { ArrowLeft, Maximize2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Brand } from './Brand';

type GameFrameProps = {
  title: string;
  storyHref: string;
  src: string;
};

export function GameFrame({ title, storyHref, src }: GameFrameProps) {
  const frameWrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const settleTimers: number[] = [];

    const syncViewport = () => {
      const height = viewport?.height ?? window.innerHeight;
      root.style.setProperty('--play-viewport-height', `${Math.ceil(height)}px`);
      frame.current?.contentWindow?.postMessage({ type: 'moonlit:viewport-resize' }, window.location.origin);
    };

    const settleViewport = () => {
      syncViewport();
      settleTimers.push(window.setTimeout(syncViewport, 120));
      settleTimers.push(window.setTimeout(syncViewport, 420));
    };

    root.classList.add('is-playing');
    window.scrollTo(0, 0);
    settleViewport();

    window.addEventListener('resize', settleViewport);
    window.addEventListener('orientationchange', settleViewport);
    document.addEventListener('fullscreenchange', settleViewport);
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);

    return () => {
      root.classList.remove('is-playing');
      root.style.removeProperty('--play-viewport-height');
      settleTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('resize', settleViewport);
      window.removeEventListener('orientationchange', settleViewport);
      document.removeEventListener('fullscreenchange', settleViewport);
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
    };
  }, []);

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
          ref={frame}
          className="game-frame"
          src={src}
          title={title}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>
    </main>
  );
}
