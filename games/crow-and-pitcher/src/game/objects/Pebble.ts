import * as THREE from 'three';

export class Pebble {
  readonly group = new THREE.Group();
  collected = false;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly glow: THREE.Mesh;
  private highlighted = false;
  private elapsed = Math.random() * 4;

  constructor(position: THREE.Vector3, color: number) {
    this.material = new THREE.MeshStandardMaterial({ color, roughness: 0.96, emissive: 0x587985, emissiveIntensity: 0 });
    const mesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24, 0),
      this.material,
    );
    mesh.scale.set(1.25, 0.7, 1);
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.glow = new THREE.Mesh(
      new THREE.RingGeometry(0.34, 0.45, 28),
      new THREE.MeshBasicMaterial({ color: 0x91aeb5, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = -0.04;
    this.glow.visible = false;
    this.group.add(mesh, this.glow);
    this.group.position.copy(position);
  }

  setHighlighted(highlighted: boolean, final = false): void {
    this.highlighted = highlighted;
    this.glow.visible = highlighted;
    this.material.emissiveIntensity = highlighted ? (final ? 0.34 : 0.24) : 0;
    (this.glow.material as THREE.MeshBasicMaterial).opacity = final ? 0.9 : 0.72;
  }

  update(delta: number, reducedMotion: boolean): void {
    if (this.collected || reducedMotion) return;
    this.elapsed += delta;
    this.group.position.y = 0.12 + Math.sin(this.elapsed * 2) * 0.025;
    if (this.highlighted) {
      const pulse = 1 + Math.sin(this.elapsed * 2.3) * 0.1;
      this.glow.scale.setScalar(pulse);
    }
  }
}
