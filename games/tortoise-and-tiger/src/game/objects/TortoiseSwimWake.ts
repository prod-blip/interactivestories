import * as THREE from 'three';

type WakeRipple = {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  phase: number;
  baseZ: number;
};

const WATER_SURFACE_Y = 0.01;

export class TortoiseSwimWake {
  readonly group = new THREE.Group();
  private readonly waterline: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly ripples: WakeRipple[] = [];
  private elapsed = 0;

  constructor() {
    this.group.name = 'TortoiseSwimWake';
    this.group.visible = false;

    this.waterline = this.makeRipple(0.65, 0.75, 0.62);
    this.waterline.name = 'TortoiseWaterline';
    this.waterline.scale.set(1.12, 0.72, 1);
    this.group.add(this.waterline);

    [
      { z: -0.72, phase: 0 },
      { z: -1.24, phase: 0.46 },
      { z: -1.72, phase: 0.82 },
    ].forEach(({ z, phase }, index) => {
      const mesh = this.makeRipple(0.3 + index * 0.04, 0.36 + index * 0.045, 0.44);
      mesh.name = `TortoiseWakeRipple${index + 1}`;
      mesh.position.z = z;
      mesh.scale.set(1.35 + index * 0.16, 0.48, 1);
      this.group.add(mesh);
      this.ripples.push({ mesh, phase, baseZ: z });
    });
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  isVisible(): boolean {
    return this.group.visible;
  }

  reset(): void {
    this.elapsed = 0;
    this.group.visible = false;
  }

  update(
    delta: number,
    position: THREE.Vector3,
    yaw: number,
    movementIntensity: number,
  ): void {
    if (!this.group.visible) return;
    this.elapsed += delta;
    const intensity = THREE.MathUtils.clamp(movementIntensity, 0, 1);
    this.group.position.set(position.x, WATER_SURFACE_Y + 0.075, position.z);
    this.group.rotation.y = yaw;

    const waterlinePulse = 1 + Math.sin(this.elapsed * 4.4) * 0.035;
    this.waterline.scale.set(1.12 * waterlinePulse, 0.72 * waterlinePulse, 1);
    this.waterline.material.opacity = 0.28 + intensity * 0.28;

    this.ripples.forEach(({ mesh, phase, baseZ }, index) => {
      const cycle = (this.elapsed * (0.52 + intensity * 0.72) + phase) % 1;
      const spread = 0.78 + cycle * (0.5 + intensity * 0.35);
      mesh.position.z = baseZ - cycle * (0.38 + intensity * 0.42);
      mesh.scale.set(
        (1.35 + index * 0.16) * spread,
        0.48 * spread,
        1,
      );
      mesh.material.opacity = (1 - cycle) * (0.08 + intensity * 0.32);
    });
  }

  private makeRipple(
    innerRadius: number,
    outerRadius: number,
    opacity: number,
  ): THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(innerRadius, outerRadius, 32),
      new THREE.MeshBasicMaterial({
        color: 0xd7ffff,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 3;
    return mesh;
  }
}
