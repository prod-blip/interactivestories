import type { StoryViewport } from './protocol';

function numberFromStyle(style: CSSStyleDeclaration, property: string): number {
  return Number.parseFloat(style.getPropertyValue(property)) || 0;
}

function readSafeArea(): StoryViewport['safeArea'] {
  const probe = document.createElement('div');
  probe.style.cssText = [
    'position:fixed',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top)',
    'padding-right:env(safe-area-inset-right)',
    'padding-bottom:env(safe-area-inset-bottom)',
    'padding-left:env(safe-area-inset-left)',
  ].join(';');
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const safeArea = {
    top: numberFromStyle(style, 'padding-top'),
    right: numberFromStyle(style, 'padding-right'),
    bottom: numberFromStyle(style, 'padding-bottom'),
    left: numberFromStyle(style, 'padding-left'),
  };
  probe.remove();
  return safeArea;
}

export function detectStoryViewport(): StoryViewport {
  const visualViewport = window.visualViewport;
  const width = Math.ceil(visualViewport?.width ?? window.innerWidth);
  const height = Math.ceil(visualViewport?.height ?? window.innerHeight);
  return {
    width,
    height,
    pixelRatio: window.devicePixelRatio || 1,
    orientation: width >= height ? 'landscape' : 'portrait',
    input: navigator.maxTouchPoints > 0 || matchMedia('(hover: none) and (pointer: coarse)').matches
      ? 'touch'
      : 'pointer',
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    safeArea: readSafeArea(),
  };
}

export function applyStoryViewport(viewport: StoryViewport): void {
  const root = document.documentElement;
  root.style.setProperty('--story-viewport-width', `${viewport.width}px`);
  root.style.setProperty('--story-viewport-height', `${viewport.height}px`);
  root.style.setProperty('--story-safe-top', `${viewport.safeArea.top}px`);
  root.style.setProperty('--story-safe-right', `${viewport.safeArea.right}px`);
  root.style.setProperty('--story-safe-bottom', `${viewport.safeArea.bottom}px`);
  root.style.setProperty('--story-safe-left', `${viewport.safeArea.left}px`);
  root.dataset.storyOrientation = viewport.orientation;
  root.dataset.storyInput = viewport.input;
  root.classList.toggle('story-reduced-motion', viewport.reducedMotion);
}
