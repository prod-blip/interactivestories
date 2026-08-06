import * as THREE from 'three';
import { PITCHER_POSITION } from '../worldLayout';

const PITCHER_SCALE = 0.82;
const PITCHER_OPACITY = 0.64;
const WATER_BOTTOM = 0.18;
const WATER_START = 1.15;
const WATER_END = 2.45;
const WATER_SURFACE_MAX_RADIUS = 0.41;
const PEBBLE_DROP_RADIUS = 2;

export class Pitcher {
  readonly group = new THREE.Group();
  readonly interactionPosition = new THREE.Vector3();
  readonly pebbleDropPosition = new THREE.Vector3();
  readonly rimHeight = 2.82 * PITCHER_SCALE;
  private readonly water: THREE.Mesh;
  private readonly waterMaterial: THREE.MeshBasicMaterial;
  private readonly waterVolume: THREE.Mesh;
  private readonly clayMaterials: THREE.MeshStandardMaterial[];
  private readonly shadowMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    side: THREE.DoubleSide,
  });
  private readonly stones = new THREE.Group();
  private rippleStrength = 0;
  private revealTimer = 0;
  private targetWaterHeight = WATER_START;
  private lastVolumeHeight = -1;

  constructor(position = PITCHER_POSITION) {
    const clay = new THREE.MeshStandardMaterial({
      color: 0x99715f, roughness: 0.94, side: THREE.DoubleSide,
      transparent: true, opacity: PITCHER_OPACITY, depthWrite: false,
    });
    const clayDark = new THREE.MeshStandardMaterial({
      color: 0x6f554c, roughness: 0.97, side: THREE.DoubleSide,
      transparent: true, opacity: PITCHER_OPACITY, depthWrite: false,
    });
    const rimClay = clay.clone();
    rimClay.opacity = 0.92;
    rimClay.depthWrite = true;
    const handleClay = clayDark.clone();
    handleClay.opacity = 0.82;
    [clay, clayDark, rimClay, handleClay].forEach((material) => {
      material.shadowSide = THREE.DoubleSide;
    });
    this.clayMaterials = [clay, clayDark];
    this.waterMaterial = new THREE.MeshBasicMaterial({
      color: 0x1f6685,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
    });
    this.waterMaterial.userData.paletteSaturationScale = 0.95;
    // Both sections are open-ended so the camera can genuinely see the low
    // water surface through the mouth instead of looking at a cylinder cap.
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 1.05, 2.15, 20, 1, true), clay);
    body.position.y = 1.08;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.68, 0.72, 20, 1, true), clayDark);
    neck.position.y = 2.45;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.1, 8, 24), rimClay);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 2.82;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.1, 8, 20, Math.PI * 1.45), handleClay);
    handle.rotation.y = Math.PI / 2;
    handle.rotation.z = -Math.PI * 0.22;
    handle.position.set(0.75, 2.05, 0);
    [body, neck, rim, handle].forEach((mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.customDepthMaterial = this.shadowMaterial;
    });
    this.water = new THREE.Mesh(new THREE.CircleGeometry(1, 32), this.waterMaterial);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = WATER_START;
    const initialSurfaceRadius = Math.min(WATER_SURFACE_MAX_RADIUS, this.getInteriorRadius(WATER_START));
    this.water.scale.set(initialSurfaceRadius, initialSurfaceRadius, 1);
    // Use an unlit material for the submerged volume. Warm sunlight and the
    // clay shell otherwise neutralize a standard material until it reads grey.
    const waterVolumeMaterial = new THREE.MeshBasicMaterial({
      color: 0x1f6685,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    waterVolumeMaterial.userData.paletteSaturationScale = 0.95;
    this.waterVolume = new THREE.Mesh(this.createWaterVolumeGeometry(WATER_START), waterVolumeMaterial);
    this.updateWaterVolume();
    this.stones.position.y = 1.14;
    this.waterVolume.renderOrder = 0;
    this.water.renderOrder = 0;
    [body, neck].forEach((mesh) => { mesh.renderOrder = 1; });
    [rim, handle].forEach((mesh) => { mesh.renderOrder = 2; });
    this.stones.renderOrder = 3;
    this.group.add(body, neck, rim, handle, this.waterVolume, this.water, this.stones);
    this.group.position.copy(position);
    this.group.scale.setScalar(PITCHER_SCALE);
    this.interactionPosition.copy(position).add(new THREE.Vector3(0, 0, 2.05 * PITCHER_SCALE));
    this.pebbleDropPosition.copy(position);
  }

  canAcceptPebbleFrom(position: THREE.Vector3): boolean {
    const dx = position.x - this.pebbleDropPosition.x;
    const dz = position.z - this.pebbleDropPosition.z;
    return dx * dx + dz * dz <= PEBBLE_DROP_RADIUS * PEBBLE_DROP_RADIUS;
  }

  addPebble(pebble: THREE.Object3D, count: number, total: number): void {
    pebble.position.set((count - 2) * 0.17, count * 0.08, (count % 2 ? -1 : 1) * 0.1);
    pebble.scale.setScalar(0.65);
    this.stones.add(pebble);
    this.targetWaterHeight = THREE.MathUtils.lerp(WATER_START, WATER_END, count / total);
    this.rippleStrength = 1;
    this.revealContents();
  }

  update(delta: number): void {
    this.water.position.y = THREE.MathUtils.damp(this.water.position.y, this.targetWaterHeight, 3.8, delta);
    this.updateWaterVolume();
    let ripple = 0;
    if (this.rippleStrength > 0) {
      this.rippleStrength = Math.max(0, this.rippleStrength - delta * 0.85);
      ripple = Math.sin((1 - this.rippleStrength) * Math.PI * 8) * this.rippleStrength;
    }
    const surfaceRadius = Math.min(WATER_SURFACE_MAX_RADIUS, this.getInteriorRadius(this.water.position.y));
    const rippleScale = 1 + ripple * 0.035;
    this.water.scale.set(surfaceRadius * rippleScale, surfaceRadius * rippleScale, 1);
    this.waterMaterial.opacity = 0.94 + Math.abs(ripple) * 0.05;
  }

  startRipple(): void {
    this.rippleStrength = 1;
  }

  getWaterSurfaceWorldPosition(target: THREE.Vector3): THREE.Vector3 {
    this.water.updateWorldMatrix(true, false);
    return this.water.getWorldPosition(target);
  }

  dispose(): void {
    clearTimeout(this.revealTimer);
    this.shadowMaterial.dispose();
    this.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    });
  }

  private revealContents(): void {
    clearTimeout(this.revealTimer);
    this.clayMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.48;
    });
    this.revealTimer = window.setTimeout(() => {
      this.clayMaterials.forEach((material) => {
        material.opacity = PITCHER_OPACITY;
      });
    }, 1100);
  }

  private updateWaterVolume(): void {
    const height = this.water.position.y;
    if (Math.abs(height - this.lastVolumeHeight) < 0.002) return;
    this.waterVolume.geometry.dispose();
    this.waterVolume.geometry = this.createWaterVolumeGeometry(height);
    this.lastVolumeHeight = height;
  }

  private createWaterVolumeGeometry(surfaceHeight: number): THREE.LatheGeometry {
    const height = THREE.MathUtils.clamp(surfaceHeight, WATER_BOTTOM + 0.01, WATER_END);
    const profile = [
      new THREE.Vector2(0, WATER_BOTTOM),
      new THREE.Vector2(this.getInteriorRadius(WATER_BOTTOM), WATER_BOTTOM),
    ];

    // Follow the inside of the broad body and then its shoulder into the neck.
    if (height > 2.08) profile.push(new THREE.Vector2(this.getInteriorRadius(2.08), 2.08));
    if (height > 2.12) profile.push(new THREE.Vector2(this.getInteriorRadius(2.12), 2.12));
    // Leave the shaped volume open at the top. The separate, mouth-sized
    // surface mesh provides the only horizontal water plane, preventing the
    // broad body fill from painting over the rim in top-down views.
    profile.push(new THREE.Vector2(this.getInteriorRadius(height), height));
    return new THREE.LatheGeometry(profile, 32);
  }

  private getInteriorRadius(height: number): number {
    if (height <= 2.08) {
      const progress = THREE.MathUtils.clamp((height - WATER_BOTTOM) / (2.08 - WATER_BOTTOM), 0, 1);
      return THREE.MathUtils.lerp(0.92, 0.62, progress);
    }
    if (height <= 2.12) return THREE.MathUtils.lerp(0.62, 0.58, (height - 2.08) / 0.04);
    const progress = THREE.MathUtils.clamp((height - 2.12) / (2.72 - 2.12), 0, 1);
    return THREE.MathUtils.lerp(0.58, 0.44, progress);
  }
}
