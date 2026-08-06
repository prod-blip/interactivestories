'use client';

import { createStoryHost, type StoryHost } from '@moonlit/story-runtime';
import Link from 'next/link';
import { ArrowLeft, Maximize2, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Brand } from './Brand';

type GameFrameProps = {
  title: string;
  storyHref: string;
  src: string;
  capabilities: {
    audio: boolean;
    fullscreen: boolean;
    restart: boolean;
  };
};

type PlayerState = 'loading' | 'ready' | 'completed' | 'error';

export function GameFrame({ title, storyHref, src, capabilities }: GameFrameProps) {
  const frameWrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const host = useRef<StoryHost>(null);
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Opening the story');
  const [errorMessage, setErrorMessage] = useState('');
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const settleTimers: number[] = [];
    const activeFrame = frame.current;
    if (!activeFrame) return;

    const storyHost = createStoryHost(activeFrame, {
      onLoading(progress, stage) {
        setLoadingProgress(progress);
        setLoadingStage(stage);
      },
      onReady() {
        setLoadingProgress(1);
        setPlayerState('ready');
      },
      onCompleted() {
        setPlayerState('completed');
      },
      onExitRequested() {
        window.location.assign(storyHref);
      },
      onError(message) {
        setErrorMessage(message);
        setPlayerState('error');
      },
    });
    host.current = storyHost;
    storyHost.connect();

    const syncViewport = () => {
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      root.style.setProperty('--play-viewport-width', `${Math.ceil(width)}px`);
      root.style.setProperty('--play-viewport-height', `${Math.ceil(height)}px`);
      storyHost.syncViewport();
    };

    const settleViewport = () => {
      syncViewport();
      settleTimers.push(window.setTimeout(syncViewport, 120));
      settleTimers.push(window.setTimeout(syncViewport, 420));
    };

    const syncVisibility = () => {
      if (document.hidden) storyHost.pause();
      else storyHost.resume();
    };

    root.classList.add('is-playing');
    window.scrollTo(0, 0);
    settleViewport();

    window.addEventListener('resize', settleViewport);
    window.addEventListener('orientationchange', settleViewport);
    document.addEventListener('fullscreenchange', settleViewport);
    document.addEventListener('visibilitychange', syncVisibility);
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);

    return () => {
      storyHost.dispose();
      host.current = null;
      root.classList.remove('is-playing');
      root.style.removeProperty('--play-viewport-width');
      root.style.removeProperty('--play-viewport-height');
      settleTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('resize', settleViewport);
      window.removeEventListener('orientationchange', settleViewport);
      document.removeEventListener('fullscreenchange', settleViewport);
      document.removeEventListener('visibilitychange', syncVisibility);
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
    };
  }, [storyHref]);

  async function enterFullscreen() {
    if (frameWrap.current?.requestFullscreen) await frameWrap.current.requestFullscreen();
  }

  function restartStory() {
    setPlayerState('loading');
    setLoadingProgress(0);
    setLoadingStage('Restarting the story');
    host.current?.restart();
  }

  function toggleMuted() {
    const nextMuted = !muted;
    setMuted(nextMuted);
    host.current?.setMuted(nextMuted);
  }

  return (
    <main className="play-shell">
      <header className="play-header">
        <Brand />
        <span className="play-title">{title}</span>
        <div className="play-actions">
          {capabilities.audio && (
            <button className="icon-button" type="button" onClick={toggleMuted} aria-label={muted ? 'Turn sound on' : 'Mute sound'}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
          {capabilities.restart && (
            <button className="icon-button" type="button" onClick={restartStory} aria-label="Restart story">
              <RotateCcw size={17} />
            </button>
          )}
          {capabilities.fullscreen && (
            <button className="icon-button" type="button" onClick={enterFullscreen} aria-label="Enter full screen">
              <Maximize2 size={18} />
            </button>
          )}
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
          onLoad={() => {
            host.current?.connect();
            host.current?.syncViewport();
          }}
        />
        {playerState === 'loading' && (
          <div className="runtime-overlay" role="status" aria-live="polite">
            <p>{loadingStage}</p>
            <div className="runtime-progress" aria-hidden="true">
              <span style={{ width: `${Math.round(loadingProgress * 100)}%` }} />
            </div>
            <small>{Math.round(loadingProgress * 100)}%</small>
          </div>
        )}
        {playerState === 'error' && (
          <div className="runtime-overlay runtime-overlay--error" role="alert">
            <strong>The story could not open.</strong>
            <p>{errorMessage}</p>
            <button className="quiet-button" type="button" onClick={restartStory}>Try again</button>
          </div>
        )}
      </div>
    </main>
  );
}
