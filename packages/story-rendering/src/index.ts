import * as THREE from 'three';

export type StoryRenderQualityOptions = {
  mobilePixelRatioCap?: number;
  desktopPixelRatioCap?: number;
  minimumPixelRatioCap?: number;
  onQualityChange?: () => void;
};

export type StoryRenderMetrics = {
  averageFrameMs: number;
  pixelRatioCap: number;
  qualityReductions: number;
};

function usesCompactTouchDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const compact = Math.min(window.innerWidth, window.innerHeight) <= 820;
  const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  return compact || touch;
}

/**
 * Shared quality controller for every Moonlit Three.js story. It reacts slowly
 * to sustained frame pressure so a single cinematic hitch cannot change the
 * render resolution.
 */
export class StoryRenderQuality {
  private readonly minimumCap: number;
  private readonly maximumCap: number;
  private readonly onQualityChange?: () => void;
  private currentCap: number;
  private averageFrameSeconds = 1 / 60;
  private slowDuration = 0;
  private fastDuration = 0;
  private cooldown = 0;
  private reductions = 0;

  constructor(options: StoryRenderQualityOptions = {}) {
    const mobileCap = options.mobilePixelRatioCap ?? 1.25;
    const desktopCap = options.desktopPixelRatioCap ?? 1.5;
    this.minimumCap = options.minimumPixelRatioCap ?? 1;
    this.maximumCap = usesCompactTouchDisplay() ? mobileCap : desktopCap;
    this.currentCap = this.maximumCap;
    this.onQualityChange = options.onQualityChange;
  }

  get pixelRatio(): number {
    const deviceRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    return Math.min(deviceRatio, this.currentCap);
  }

  get shadowMapSize(): number {
    return usesCompactTouchDisplay() ? 512 : 1024;
  }

  get metrics(): StoryRenderMetrics {
    return {
      averageFrameMs: this.averageFrameSeconds * 1000,
      pixelRatioCap: this.currentCap,
      qualityReductions: this.reductions,
    };
  }

  sampleFrame(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || deltaSeconds > 0.25) return;
    this.averageFrameSeconds += (deltaSeconds - this.averageFrameSeconds) * 0.075;
    this.cooldown = Math.max(0, this.cooldown - deltaSeconds);

    if (this.averageFrameSeconds > 1 / 45) {
      this.slowDuration += deltaSeconds;
      this.fastDuration = 0;
    } else if (this.averageFrameSeconds < 1 / 55) {
      this.fastDuration += deltaSeconds;
      this.slowDuration = Math.max(0, this.slowDuration - deltaSeconds * 0.5);
    } else {
      this.slowDuration = Math.max(0, this.slowDuration - deltaSeconds * 0.25);
      this.fastDuration = 0;
    }

    if (this.cooldown > 0) return;
    if (this.slowDuration >= 2 && this.currentCap > this.minimumCap) {
      this.currentCap = Math.max(this.minimumCap, this.currentCap - 0.25);
      this.reductions += 1;
      this.slowDuration = 0;
      this.fastDuration = 0;
      this.cooldown = 5;
      this.onQualityChange?.();
    } else if (this.fastDuration >= 8 && this.currentCap < this.maximumCap) {
      this.currentCap = Math.min(this.maximumCap, this.currentCap + 0.25);
      this.slowDuration = 0;
      this.fastDuration = 0;
      this.cooldown = 8;
      this.onQualityChange?.();
    }
  }
}

export function resizeRendererToDisplaySize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  root: HTMLElement,
  quality: StoryRenderQuality,
): boolean {
  const width = Math.max(1, root.clientWidth);
  const height = Math.max(1, root.clientHeight);
  const pixelRatio = quality.pixelRatio;
  const bufferWidth = Math.floor(width * pixelRatio);
  const bufferHeight = Math.floor(height * pixelRatio);
  if (renderer.domElement.width === bufferWidth && renderer.domElement.height === bufferHeight) return false;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  return true;
}

/** Refresh after creating instances or changing their matrices. */
export function refreshInstancedMeshBounds(mesh: THREE.InstancedMesh): void {
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  mesh.frustumCulled = true;
}

export type StaticBatchOptions = {
  minimumCount?: number;
  shouldBatch?: (mesh: THREE.Mesh) => boolean;
};

/** Combine repeated, motionless meshes beneath one spatial root. */
export function batchStaticMeshes(root: THREE.Group, options: StaticBatchOptions = {}): number {
  const minimumCount = options.minimumCount ?? 2;
  root.updateWorldMatrix(true, true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const groups = new Map<string, THREE.Mesh[]>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || object instanceof THREE.SkinnedMesh) return;
    if (Array.isArray(object.material) || object.morphTargetInfluences || options.shouldBatch?.(object) === false) return;
    const key = [object.geometry.uuid, object.material.uuid, object.castShadow, object.receiveShadow, object.renderOrder].join(':');
    const group = groups.get(key) ?? [];
    group.push(object);
    groups.set(key, group);
  });

  let batches = 0;
  const matrix = new THREE.Matrix4();
  groups.forEach((meshes) => {
    if (meshes.length < minimumCount) return;
    const first = meshes[0]!;
    const batch = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
    batch.name = `StaticBatch-${first.name || first.geometry.type}`;
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    batch.renderOrder = first.renderOrder;
    meshes.forEach((mesh, index) => {
      matrix.multiplyMatrices(inverseRoot, mesh.matrixWorld);
      batch.setMatrixAt(index, matrix);
      mesh.removeFromParent();
    });
    batch.instanceMatrix.needsUpdate = true;
    refreshInstancedMeshBounds(batch);
    root.add(batch);
    batches += 1;
  });
  return batches;
}

export function exposeRenderDiagnostics(
  name: string,
  renderer: THREE.WebGLRenderer,
  quality: StoryRenderQuality,
): void {
  const meta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  if (!meta.env?.DEV || typeof window === 'undefined') return;
  const diagnostics = (window as typeof window & {
    __MOONLIT_RENDERING__?: Record<string, () => object>;
  }).__MOONLIT_RENDERING__ ??= {};
  diagnostics[name] = () => ({
    quality: quality.metrics,
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  });
}
