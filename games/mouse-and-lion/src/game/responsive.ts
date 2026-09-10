import * as THREE from 'three';
import {
  resizeRendererToDisplaySize as resizeSharedRenderer,
  StoryRenderQuality,
} from '@moonlit/story-rendering';

export const renderQuality = new StoryRenderQuality();

export function getPreferredPixelRatio(): number { return renderQuality.pixelRatio; }

export function resizeRendererToDisplaySize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
): void {
  const root = renderer.domElement.parentElement ?? renderer.domElement;
  resizeSharedRenderer(renderer, camera, root, renderQuality);
}
