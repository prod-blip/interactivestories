import * as THREE from 'three';

export class StoneWall extends THREE.Group {
  constructor(length = 16) {
    super();
    this.name = 'Old_Garden_Wall';
    const stoneMaterials = [0xd4aa64, 0xc49550, 0xe0bc78].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    for (let row = 0; row < 3; row += 1) {
      const blockCount = 9 + (row % 2);
      for (let index = 0; index < blockCount; index += 1) {
        const width = length / blockCount * (0.82 + ((index * 7 + row) % 4) * 0.06);
        const stone = new THREE.Mesh(
          new THREE.BoxGeometry(width, 0.72, 0.72 + ((index + row) % 3) * 0.08),
          stoneMaterials[(index + row) % stoneMaterials.length],
        );
        stone.position.set(-length / 2 + (index + 0.5) * (length / blockCount), 0.38 + row * 0.69, 0);
        stone.rotation.y = ((index % 3) - 1) * 0.025;
        stone.castShadow = true;
        stone.receiveShadow = true;
        this.add(stone);
      }
    }

    const vineMaterial = new THREE.MeshStandardMaterial({ color: 0x667f2d, roughness: 0.9 });
    for (let index = 0; index < 18; index += 1) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18 + (index % 2) * 0.06, 7, 5), vineMaterial);
      leaf.scale.set(1, 0.45, 0.72);
      leaf.position.set(-1.8 + Math.sin(index * 1.9) * 0.8, 2.2 - index * 0.11, -0.42);
      this.add(leaf);
    }
  }
}
