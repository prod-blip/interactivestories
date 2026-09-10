import * as THREE from 'three';
import {
  resizeRendererToDisplaySize,
  StoryRenderQuality,
} from '@moonlit/story-rendering';

export const renderQuality = new StoryRenderQuality();

export function preferredPixelRatio(): number { return renderQuality.pixelRatio; }

export function resizeRenderer(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
): boolean {
  const root = renderer.domElement.parentElement ?? renderer.domElement;
  return resizeRendererToDisplaySize(renderer, camera, root, renderQuality);
}
