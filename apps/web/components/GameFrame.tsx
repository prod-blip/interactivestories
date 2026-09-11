'use client';

import { createStoryHost, type StoryHost } from '@moonlit/story-runtime';
import { ArrowLeft, Maximize2, MoreHorizontal, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_MASTER_VOLUME, readMasterVolume, writeMasterVolume } from '@/lib/audio-preferences';

export type GameFrameProps = {
  storyId: string;
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

const COMPLETED_STORIES_KEY = 'moonlit:completed-stories';

export function GameFrame({ storyId, title, storyHref, src, capabilities }: GameFrameProps) {
  const router = useRouter();
  const frameWrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const host = useRef<StoryHost>(null);
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Opening the story');
  const [errorMessage, setErrorMessage] = useState('');
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_MASTER_VOLUME);
  const [controlsOpen, setControlsOpen] = useState(false);

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
        try {
          const stored = JSON.parse(window.localStorage.getItem(COMPLETED_STORIES_KEY) ?? '[]');
          const completedStories = Array.isArray(stored) ? stored.filter((value): value is string => typeof value === 'string') : [];
          window.localStorage.setItem(COMPLETED_STORIES_KEY, JSON.stringify([...new Set([...completedStories, storyId])]));
        } catch {
          // Completion tracking is a convenience; it must never interrupt play.
        }
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
    const initialVolume = readMasterVolume();
    setVolume(initialVolume);
    storyHost.connect();
    storyHost.setVolume(initialVolume);

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

    const pauseFromNative = () => storyHost.pause();
    const resumeFromNative = () => {
      storyHost.resume();
      settleViewport();
    };

    root.classList.add('is-playing');
    window.scrollTo(0, 0);
    settleViewport();

    window.addEventListener('resize', settleViewport);
    window.addEventListener('orientationchange', settleViewport);
    document.addEventListener('fullscreenchange', settleViewport);
    document.addEventListener('visibilitychange', syncVisibility);
    document.addEventListener('moonlit:native-pause', pauseFromNative);
    document.addEventListener('moonlit:native-resume', resumeFromNative);
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
      document.removeEventListener('moonlit:native-pause', pauseFromNative);
      document.removeEventListener('moonlit:native-resume', resumeFromNative);
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
    };
  }, [storyHref, storyId]);

  useEffect(() => {
    const onVolumeChange = (event: Event) => {
      const next = (event as CustomEvent<number>).detail;
      setVolume(next);
      host.current?.setVolume(next);
    };
    window.addEventListener('moonlit:volume-change', onVolumeChange);
    return () => window.removeEventListener('moonlit:volume-change', onVolumeChange);
  }, []);

  useEffect(() => {
    if (!controlsOpen) return;
    const timer = window.setTimeout(() => setControlsOpen(false), 4000);
    return () => window.clearTimeout(timer);
  }, [controlsOpen, muted]);

  async function enterFullscreen() {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  }

  async function leaveStory() {
    if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    router.push(storyHref);
  }

  function restartStory() {
    setPlayerState('loading');
    setLoadingProgress(0);
    setLoadingStage('Restarting the story');
    host.current?.restart();
  }

  function toggleMuted() {
    if (volume <= 0) {
      changeVolume(DEFAULT_MASTER_VOLUME);
      return;
    }
    const nextMuted = !muted;
    setMuted(nextMuted);
    host.current?.setMuted(nextMuted);
  }

  function changeVolume(next: number) {
    const stored = writeMasterVolume(next);
    setVolume(stored);
    if (stored > 0 && muted) {
      setMuted(false);
      host.current?.setMuted(false);
    }
    host.current?.setVolume(stored);
  }

  return (
    <main className="play-shell">
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
            host.current?.setVolume(volume);
            host.current?.setMuted(muted);
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
      <div className={`play-control-dock${controlsOpen ? ' is-open' : ''}`}>
        <button
          className="play-control-launcher"
          type="button"
          aria-label={controlsOpen ? 'Close story controls' : 'Open story controls'}
          aria-expanded={controlsOpen}
          onClick={() => setControlsOpen((open) => !open)}
        >
          {controlsOpen ? <X size={18} /> : <MoreHorizontal size={20} />}
        </button>
        <div className="play-control-actions" aria-hidden={!controlsOpen}>
          {capabilities.audio && (
            <div className="play-volume-control">
              <button className="icon-button" type="button" onClick={toggleMuted} aria-label={muted ? 'Turn sound on' : 'Mute sound'}>
                {muted || volume <= 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input aria-label="Story volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => changeVolume(Number(event.currentTarget.value))} />
            </div>
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
          <button className="icon-button" type="button" onClick={leaveStory} aria-label="Leave story">
            <ArrowLeft size={17} />
          </button>
        </div>
      </div>
    </main>
  );
}
