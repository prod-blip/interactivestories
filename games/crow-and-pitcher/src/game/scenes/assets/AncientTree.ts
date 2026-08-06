import * as THREE from 'three';

export class AncientTree extends THREE.Group {
  constructor() {
    super();
    this.name = 'Ancient_Olive_Tree';
    const bark = new THREE.MeshStandardMaterial({ color: 0x7b4b25, roughness: 1 });
    const barkLight = new THREE.MeshStandardMaterial({ color: 0xa56b32, roughness: 1 });
    const leafMaterials = [0x758b28, 0x91a83a, 0x586f24].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.94 }),
    );

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.65, 6.8, 11), bark);
    trunk.position.y = 3.4;
    trunk.rotation.z = -0.08;
    trunk.castShadow = true;
    this.add(trunk);

    const branchData: Array<[number, number, number, number, number, number]> = [
      [-1.55, 6.1, 0, 4.7, 0.42, 1.02],
      [1.65, 6.45, -0.2, 5.2, -0.5, -0.92],
      [-0.15, 7.3, 0.2, 3.8, 0.05, 0.2],
    ];
    branchData.forEach(([x, y, z, length, rz, ry], index) => {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.7, length, 9), index === 1 ? barkLight : bark);
      branch.position.set(x, y, z);
      branch.rotation.set(0, ry, rz);
      branch.castShadow = true;
      this.add(branch);
    });

    const crownPositions: Array<[number, number, number, number]> = [
      [-3.2, 8.3, 0, 2.5], [-1.2, 9.2, 0.4, 2.8], [1.3, 9.25, -0.2, 2.9],
      [3.45, 8.25, -0.1, 2.45], [0, 10.45, 0.2, 2.45], [-2.6, 9.8, -0.6, 2.15],
      [2.7, 9.8, 0.3, 2.1],
    ];
    crownPositions.forEach(([x, y, z, radius], index) => {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), leafMaterials[index % leafMaterials.length]);
      crown.position.set(x, y, z);
      crown.scale.y = 0.72;
      crown.rotation.set(index * 0.17, index * 0.61, 0);
      crown.castShadow = true;
      this.add(crown);
    });

    for (let index = 0; index < 7; index += 1) {
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.42, 3.8, 7), bark);
      root.position.set(Math.cos(index * 0.9) * 1.4, 0.22, Math.sin(index * 0.9) * 1.25);
      root.rotation.z = Math.PI / 2.25;
      root.rotation.y = -index * 0.9;
      root.castShadow = true;
      this.add(root);
    }
  }
}
