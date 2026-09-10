import * as THREE from 'three';
import {
  resizeRendererToDisplaySize,
  StoryRenderQuality,
} from '@moonlit/story-rendering';

export const renderQuality = new StoryRenderQuality();

export function applyResponsiveViewport(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  root: HTMLElement,
): void {
  resizeRendererToDisplaySize(renderer, camera, root, renderQuality);
}
