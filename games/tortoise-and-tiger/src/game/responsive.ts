import * as THREE from 'three';

const MAX_PIXEL_RATIO = 2;

export function applyResponsiveViewport(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  root: HTMLElement,
): void {
  const width = Math.max(1, root.clientWidth);
  const height = Math.max(1, root.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
