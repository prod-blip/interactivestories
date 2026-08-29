import * as THREE from 'three';

export class StoryButterfly {
  readonly group = new THREE.Group();
  private readonly leftWingPivot = new THREE.Group();
  private readonly rightWingPivot = new THREE.Group();
  private readonly origin = new THREE.Vector3();
  private elapsed = 0;

  constructor() {
    this.group.name = 'SceneTwoButterfly';

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3327, roughness: 0.86 });
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd449,
      emissive: 0x8f4d08,
      emissiveIntensity: 0.22,
      roughness: 0.62,
      side: THREE.DoubleSide,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.18, 4, 8), bodyMaterial);
    body.rotation.x = Math.PI / 2;

    const wingGeometry = new THREE.CircleGeometry(0.23, 18);
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.x = -0.22;
    leftWing.scale.set(1, 1.3, 1);
    const rightWing = leftWing.clone();
    rightWing.position.x = 0.22;
    this.leftWingPivot.add(leftWing);
    this.rightWingPivot.add(rightWing);

    const antennaMaterial = new THREE.MeshBasicMaterial({ color: 0x3f2a21 });
    for (const direction of [-1, 1]) {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0.05, -0.1),
        new THREE.Vector3(direction * 0.08, 0.13, -0.2),
        new THREE.Vector3(direction * 0.13, 0.15, -0.25),
      );
      const antenna = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.008, 5, false), antennaMaterial);
      this.group.add(antenna);
    }

    this.group.add(body, this.leftWingPivot, this.rightWingPivot);
    this.group.scale.setScalar(0.68);
    this.group.visible = false;
  }

  setOrigin(position: THREE.Vector3): void {
    this.origin.copy(position);
    this.group.position.copy(position);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  update(delta: number): void {
    if (!this.group.visible) return;
    this.elapsed += delta;
    const flap = 0.2 + Math.abs(Math.sin(this.elapsed * 10.5)) * 1.05;
    this.leftWingPivot.rotation.y = flap;
    this.rightWingPivot.rotation.y = -flap;
    this.group.position.set(
      this.origin.x + Math.sin(this.elapsed * 1.35) * 0.18,
      this.origin.y + Math.sin(this.elapsed * 2.2) * 0.13,
      this.origin.z + Math.cos(this.elapsed * 1.15) * 0.15,
    );
    this.group.rotation.y = Math.sin(this.elapsed * 0.8) * 0.24;
    this.group.rotation.z = Math.sin(this.elapsed * 1.7) * 0.08;
  }

  reset(): void {
    this.elapsed = 0;
    this.group.position.copy(this.origin);
  }
}
