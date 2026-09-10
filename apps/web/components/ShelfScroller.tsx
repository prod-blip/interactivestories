'use client';

import { Children, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type WheelEvent, useCallback, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const COPY_COUNT = 5;
const CENTER_COPY = Math.floor(COPY_COUNT / 2);

export function ShelfScroller({ children }: { children: ReactNode }) {
  const router = useRouter();
  const shelf = useRef<HTMLDivElement>(null);
  const isNormalizing = useRef(false);
  const hasCentered = useRef(false);
  const scrollEndTimer = useRef<number | null>(null);
  const relativeCyclePosition = useRef(0);
  const pointerStart = useRef({ x: 0, left: 0 });
  const pointerDragging = useRef(false);
  const suppressClick = useRef(false);
  const stories = Children.toArray(children);

  const getLoopMetrics = useCallback(() => {
    const element = shelf.current;
    const middle = element?.querySelector<HTMLElement>(`[data-cycle="${CENTER_COPY}"][data-story="0"]`);
    const next = element?.querySelector<HTMLElement>(`[data-cycle="${CENTER_COPY + 1}"][data-story="0"]`);
    if (!element || !middle || !next) return null;
    return { element, middleStart: middle.offsetLeft, cycleWidth: next.offsetLeft - middle.offsetLeft };
  }, []);

  const setScrollPosition = useCallback((left: number) => {
    const element = shelf.current;
    if (!element) return;
    isNormalizing.current = true;
    element.classList.add('is-normalizing');
    element.style.scrollBehavior = 'auto';
    element.style.scrollSnapType = 'none';
    element.scrollLeft = left;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      element.style.removeProperty('scroll-behavior');
      element.style.removeProperty('scroll-snap-type');
      element.classList.remove('is-normalizing');
      isNormalizing.current = false;
    }));
  }, []);

  const normalizeLoop = useCallback(() => {
    if (isNormalizing.current || pointerDragging.current) return;
    const metrics = getLoopMetrics();
    if (!metrics || metrics.cycleWidth <= 0) return;
    const { element, middleStart, cycleWidth } = metrics;
    let nextLeft = element.scrollLeft;
    while (nextLeft < middleStart - cycleWidth * 0.5) nextLeft += cycleWidth;
    while (nextLeft >= middleStart + cycleWidth * 0.5) nextLeft -= cycleWidth;
    relativeCyclePosition.current = (nextLeft - middleStart) / cycleWidth;
    if (Math.abs(nextLeft - element.scrollLeft) > 0.5) setScrollPosition(nextLeft);
  }, [getLoopMetrics, setScrollPosition]);

  const scheduleNormalization = useCallback(() => {
    if (isNormalizing.current || !hasCentered.current) return;
    const metrics = getLoopMetrics();
    if (metrics?.cycleWidth) {
      relativeCyclePosition.current = (metrics.element.scrollLeft - metrics.middleStart) / metrics.cycleWidth;
    }
    if (scrollEndTimer.current !== null) window.clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = window.setTimeout(normalizeLoop, 120);
  }, [getLoopMetrics, normalizeLoop]);

  useLayoutEffect(() => {
    const element = shelf.current;
    if (!element) return;
    let active = true;
    const center = () => {
      const metrics = getLoopMetrics();
      if (!metrics) return;
      const relative = hasCentered.current ? relativeCyclePosition.current : 0;
      setScrollPosition(metrics.middleStart + relative * metrics.cycleWidth);
      hasCentered.current = true;
    };
    center();
    const firstFrame = requestAnimationFrame(center);
    const settleTimer = window.setTimeout(center, 250);
    void document.fonts.ready.then(() => { if (active) center(); });
    const observer = new ResizeObserver(center);
    observer.observe(element);
    element.addEventListener('scrollend', normalizeLoop);
    return () => {
      active = false;
      cancelAnimationFrame(firstFrame);
      window.clearTimeout(settleTimer);
      observer.disconnect();
      element.removeEventListener('scrollend', normalizeLoop);
      if (scrollEndTimer.current !== null) window.clearTimeout(scrollEndTimer.current);
    };
  }, [getLoopMetrics, normalizeLoop, setScrollPosition]);

  const navigateFromShelf = async (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!anchor || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (suppressClick.current) {
      event.preventDefault();
      suppressClick.current = false;
      return;
    }
    const href = anchor.getAttribute('href');
    if (!href) return;
    event.preventDefault();
    const native = document.documentElement.classList.contains('native-app');
    if (!native && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      } catch {
        // The play route still fills the viewport when browser fullscreen is unavailable.
      }
    }
    router.push(href);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    const element = shelf.current;
    if (!element) return;
    pointerDragging.current = true;
    suppressClick.current = false;
    pointerStart.current = { x: event.clientX, left: element.scrollLeft };
    element.setPointerCapture(event.pointerId);
    element.classList.add('is-dragging');
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = shelf.current;
    if (!element || !pointerDragging.current) return;
    const distance = event.clientX - pointerStart.current.x;
    if (Math.abs(distance) > 5) suppressClick.current = true;
    element.scrollLeft = pointerStart.current.left - distance;
  };

  const finishPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const element = shelf.current;
    if (!element || !pointerDragging.current) return;
    pointerDragging.current = false;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    element.classList.remove('is-dragging');
    scheduleNormalization();
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    const element = shelf.current;
    if (!element) return;
    event.preventDefault();
    const distance = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    element.scrollLeft += distance;
    scheduleNormalization();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    shelf.current?.scrollBy({ left: (event.key === 'ArrowRight' ? 1 : -1) * (shelf.current.clientWidth / 2), behavior: 'smooth' });
  };

  return (
    <div className="shelf-scroller">
      <div
        className="story-shelf-grid"
        ref={shelf}
        role="region"
        aria-label="Infinite story shelf. Swipe or use the left and right arrow keys."
        tabIndex={0}
        onClickCapture={navigateFromShelf}
        onScroll={scheduleNormalization}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      >
        {Array.from({ length: COPY_COUNT }, (_, cycle) => stories.map((story, index) => (
          <div
            className="shelf-loop-item"
            data-cycle={cycle}
            data-story={index}
            inert={cycle === CENTER_COPY ? undefined : true}
            aria-hidden={cycle === CENTER_COPY ? undefined : true}
            key={`${cycle}-${index}`}
          >
            {story}
          </div>
        )))}
      </div>
      <div className="shelf-plank" aria-hidden="true"><span /></div>
    </div>
  );
}
