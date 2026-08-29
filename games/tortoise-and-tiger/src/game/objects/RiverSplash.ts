import * as THREE from 'three';

const DROPLET_COUNT = 12;
const SPLASH_DURATION = 1.45;

export class RiverSplash {
  readonly group = new THREE.Group();
  private readonly rings: THREE.Mesh[] = [];
  private readonly droplets: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();
  private elapsed = 0;
  private active = false;

  constructor() {
    this.group.name = 'RiverSplashEffect';
    this.group.visible = false;

    const ringGeometry = new THREE.RingGeometry(0.42, 0.52, 32);
    for (let index = 0; index < 2; index += 1) {
      const ring = new THREE.Mesh(
        ringGeometry,
        new THREE.MeshBasicMaterial({
          color: index === 0 ? 0xe8ffff : 0x9eeaf1,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.035 + index * 0.012;
      ring.renderOrder = 4;
      this.group.add(ring);
      this.rings.push(ring);
    }

    this.droplets = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.09, 0),
      new THREE.MeshBasicMaterial({
        color: 0xd9ffff,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      }),
      DROPLET_COUNT,
    );
    this.droplets.name = 'SplashDroplets';
    this.droplets.frustumCulled = false;
    this.group.add(this.droplets);
  }

  trigger(position: THREE.Vector3): void {
    this.elapsed = 0;
    this.active = true;
    this.group.position.copy(position);
    this.group.visible = true;
    this.update(0);
  }

  update(delta: number): void {
    if (!this.active) return;
    this.elapsed += delta;
    const progress = THREE.MathUtils.clamp(this.elapsed / SPLASH_DURATION, 0, 1);

    this.rings.forEach((ring, index) => {
      const delayed = THREE.MathUtils.clamp((progress - index * 0.13) / (1 - index * 0.13), 0, 1);
      const scale = 0.65 + delayed * (index === 0 ? 4.8 : 3.65);
      ring.scale.setScalar(scale);
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = Math.sin(delayed * Math.PI) * (index === 0 ? 0.72 : 0.5);
    });

    for (let index = 0; index < DROPLET_COUNT; index += 1) {
      const angle = (index / DROPLET_COUNT) * Math.PI * 2 + (index % 3) * 0.18;
      const speed = 1.45 + (index % 4) * 0.22;
      const lift = 2.4 + (index % 5) * 0.22;
      const time = progress * 1.15;
      this.dummy.position.set(
        Math.cos(angle) * speed * time,
        0.08 + lift * time - 2.55 * time * time,
        Math.sin(angle) * speed * time,
      );
      const scale = Math.max(0.001, (1 - progress) * (0.72 + (index % 3) * 0.16));
      this.dummy.scale.setScalar(scale);
      this.dummy.rotation.set(time * (index + 1), angle, time * 2.2);
      this.dummy.updateMatrix();
      this.droplets.setMatrixAt(index, this.dummy.matrix);
    }
    this.droplets.instanceMatrix.needsUpdate = true;

    if (progress >= 1) {
      this.active = false;
      this.group.visible = false;
    }
  }

  reset(): void {
    this.elapsed = 0;
    this.active = false;
    this.group.visible = false;
  }

  isVisible(): boolean {
    return this.group.visible;
  }
}
