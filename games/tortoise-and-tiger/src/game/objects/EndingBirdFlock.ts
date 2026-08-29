import * as THREE from 'three';

type EndingBird = {
  group: THREE.Group;
  offset: THREE.Vector3;
  phase: number;
  speed: number;
};

export class EndingBirdFlock {
  readonly group = new THREE.Group();
  private readonly birds: EndingBird[] = [];
  private readonly center = new THREE.Vector3();
  private elapsed = 0;

  constructor() {
    this.group.name = 'EndingBirdFlock';
    this.group.visible = false;

    const material = new THREE.MeshBasicMaterial({
      color: 0x4f7074,
      fog: false,
      side: THREE.DoubleSide,
    });

    for (let index = 0; index < 6; index += 1) {
      const bird = new THREE.Group();
      bird.name = `EndingBird${index + 1}`;
      bird.scale.setScalar(0.72);
      for (const side of [-1, 1]) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([
          0, 0, 0,
          side * 0.78, 0, 0.16,
          side * 0.34, 0, -0.14,
        ], 3));
        geometry.computeVertexNormals();
        const wing = new THREE.Mesh(geometry, material);
        bird.add(wing);
      }
      const offset = new THREE.Vector3(
        (index - 2.5) * 1.5,
        (index % 3) * 0.52,
        Math.sin(index * 1.8) * 1.4,
      );
      this.birds.push({
        group: bird,
        offset,
        phase: index * 0.78,
        speed: 1.5 + (index % 3) * 0.22,
      });
      this.group.add(bird);
    }
  }

  setCenter(center: THREE.Vector3): void {
    this.center.copy(center);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (visible) this.elapsed = 0;
  }

  isVisible(): boolean {
    return this.group.visible;
  }

  update(delta: number): void {
    if (!this.group.visible) return;
    this.elapsed += delta;
    this.birds.forEach((bird, index) => {
      const travel = ((this.elapsed * bird.speed + index * 2.1) % 19) - 9.5;
      bird.group.position.set(
        this.center.x + travel + bird.offset.x,
        this.center.y + bird.offset.y + Math.sin(this.elapsed * 0.9 + bird.phase) * 0.18,
        this.center.z + bird.offset.z,
      );
      bird.group.rotation.y = Math.PI * 0.5;
      bird.group.children.forEach((wing, wingIndex) => {
        wing.rotation.z = (wingIndex === 0 ? 1 : -1)
          * Math.sin(this.elapsed * 5.2 + bird.phase) * 0.24;
      });
    });
  }
}
