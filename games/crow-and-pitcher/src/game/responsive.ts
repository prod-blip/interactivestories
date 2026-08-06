import * as THREE from 'three';

export function preferredPixelRatio(): number {
  const compact = Math.min(window.innerWidth, window.innerHeight) <= 820;
  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  return Math.min(window.devicePixelRatio || 1, compact || touch ? 1.25 : 1.5);
}

export function resizeRenderer(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
): boolean {
  const canvas = renderer.domElement;
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  const ratio = preferredPixelRatio();
  if (canvas.width === Math.floor(width * ratio) && canvas.height === Math.floor(height * ratio)) return false;
  renderer.setPixelRatio(ratio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  return true;
}
