import * as THREE from 'three';

type Spark = {
  mesh: THREE.Mesh;
  phase: number;
  baseScale: number;
};

function createFourPointStar(radius: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  for (let index = 0; index < 8; index += 1) {
    const angle = Math.PI * 0.5 + index * Math.PI * 0.25;
    const pointRadius = index % 2 === 0 ? radius : radius * 0.24;
    const x = Math.cos(angle) * pointRadius;
    const y = Math.sin(angle) * pointRadius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export class IdeaSparkle {
  readonly group = new THREE.Group();
  private readonly sparks: Spark[] = [];
  private elapsed = 0;

  constructor() {
    this.group.name = 'TortoiseIdeaSparkle';
    this.group.visible = false;
    this.group.scale.setScalar(0.62);

    const layouts = [
      { x: 0, y: 0.2, radius: 0.22, phase: 0 },
      { x: -0.34, y: -0.08, radius: 0.12, phase: 1.7 },
      { x: 0.32, y: -0.16, radius: 0.1, phase: 3.4 },
    ];
    layouts.forEach((layout, index) => {
      const material = new THREE.MeshBasicMaterial({
        color: index === 0 ? 0xfff1a6 : 0xffffff,
        transparent: true,
        opacity: index === 0 ? 0.92 : 0.78,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        fog: false,
      });
      const mesh = new THREE.Mesh(createFourPointStar(layout.radius), material);
      mesh.position.set(layout.x, layout.y, 0);
      this.group.add(mesh);
      this.sparks.push({ mesh, phase: layout.phase, baseScale: index === 0 ? 1 : 0.9 });
    });
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (visible) this.elapsed = 0;
  }

  setOrigin(position: THREE.Vector3): void {
    this.group.position.copy(position);
  }

  update(delta: number, camera: THREE.Camera): void {
    if (!this.group.visible) return;
    this.elapsed += delta;
    this.group.quaternion.copy(camera.quaternion);
    this.sparks.forEach(({ mesh, phase, baseScale }, index) => {
      const pulse = baseScale * (0.82 + Math.sin(this.elapsed * 3.4 + phase) * 0.18);
      mesh.scale.setScalar(pulse);
      mesh.rotation.z = this.elapsed * (index === 0 ? 0.35 : -0.5) + phase;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = (index === 0 ? 0.82 : 0.66)
        + Math.sin(this.elapsed * 2.8 + phase) * 0.12;
    });
  }
}
