import * as THREE from 'three';

function material(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.94 });
}

function setBetween(mesh: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3): void {
  const direction = end.clone().sub(start);
  mesh.position.copy(start).addScaledVector(direction, 0.5);
  mesh.scale.y = direction.length();
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
}

/** Stationary, authored cover for the tiger hideout. */
export class SceneThreeFoliage {
  readonly group = new THREE.Group();

  constructor() {
    this.group.name = 'SceneThreeWorldFoliage';
    this.group.visible = false;

    const greens = [material(0x2f7d48), material(0x469654), material(0x5eaa5c)];
    const bushGeometry = new THREE.IcosahedronGeometry(1, 1);
    const lobes = [
      [-2.35, 0.78, -1.35, 1.34, 0],
      [-2.62, 0.86, 0.18, 1.46, 1],
      [-2.18, 0.72, 1.62, 1.2, 2],
      [-1.18, 0.62, 2.42, 0.98, 0],
      // A lower, smaller centre lobe leaves a readable tiger-POV sightline to
      // the tortoise while the surrounding bushes still conceal the tiger.
      [0.05, 0.5, 3.15, 0.72, 1],
      [3.2, 0.56, 2.6, 0.65, 2],
      [2.55, 0.74, 1.58, 1.14, 0],
      [2.92, 0.8, 0.18, 1.2, 1],
      [2.58, 0.72, -1.32, 1.12, 2],
      [1.42, 0.7, -2.18, 1.16, 0],
      [0.18, 0.78, -2.42, 1.26, 1],
      [-1.05, 0.72, -2.22, 1.18, 2],
      [-1.72, 0.55, 0.72, 0.76, 0],
      [1.76, 0.56, 0.55, 0.74, 1],
    ] as const;
    const transform = new THREE.Object3D();
    greens.forEach((green, materialIndex) => {
      const matchingLobes = lobes.filter((lobe) => lobe[4] === materialIndex);
      const bushes = new THREE.InstancedMesh(bushGeometry, green, matchingLobes.length);
      bushes.name = `TigerHideoutBushLayer-${materialIndex}`;
      matchingLobes.forEach(([x, y, z, scale], index) => {
        const bushScale = scale * 1.28;
        transform.position.set(x, y, z);
        transform.scale.set(bushScale, bushScale * 0.88, bushScale * 0.94);
        transform.rotation.set(0, (index + materialIndex * 0.37) * 0.71, 0);
        transform.updateMatrix();
        bushes.setMatrixAt(index, transform.matrix);
      });
      bushes.instanceMatrix.needsUpdate = true;
      bushes.receiveShadow = true;
      bushes.computeBoundingBox();
      bushes.computeBoundingSphere();
      this.group.add(bushes);
    });

    const grassGeometry = new THREE.ConeGeometry(0.085, 0.95, 4);
    const grassMaterials = [material(0x347f44), material(0x67a94f)];
    const grassClumps = [
      [-2.15, -1.86, 1.18], [-2.48, -0.66, 1.05], [-2.35, 0.78, 1.15],
      [-1.6, 1.88, 1.08], [-0.55, 2.35, 0.94], [0.72, 2.34, 1.02],
      [1.82, 1.86, 1.14], [2.42, 0.72, 1.06], [2.38, -0.62, 1.16],
      [1.7, -1.72, 1.04], [0.62, -2.02, 1.2], [-0.55, -2.0, 1.1],
      [-1.15, -1.52, 0.92], [1.22, 0.72, 0.88], [-0.72, 1.12, 0.9],
      [3.18, 2.34, 1.72], [3.36, 1.48, 1.62], [3.34, 0.5, 1.55],
      [3.08, -0.72, 1.5],
    ] as const;
    grassMaterials.forEach((grassMaterial, layer) => {
      const bladesPerClump = 5;
      const grass = new THREE.InstancedMesh(
        grassGeometry,
        grassMaterial,
        grassClumps.length * bladesPerClump,
      );
      grass.name = `TigerHideoutGrassLayer-${layer}`;
      let instance = 0;
      grassClumps.forEach(([x, z, scale], clumpIndex) => {
        for (let blade = 0; blade < bladesPerClump; blade += 1) {
          const angle = blade * 2.399 + clumpIndex * 0.63 + layer * 0.42;
          const radius = 0.09 + (blade % 3) * 0.055;
          const height = scale * (0.72 + ((blade + clumpIndex + layer) % 4) * 0.1);
          transform.position.set(
            x + Math.cos(angle) * radius,
            height * 0.475 - 0.06,
            z + Math.sin(angle) * radius,
          );
          transform.scale.set(0.82 + (blade % 2) * 0.2, height, 0.82);
          transform.rotation.set(Math.sin(angle) * 0.09, angle, Math.cos(angle) * 0.13);
          transform.updateMatrix();
          grass.setMatrixAt(instance, transform.matrix);
          instance += 1;
        }
      });
      grass.instanceMatrix.needsUpdate = true;
      grass.receiveShadow = true;
      grass.computeBoundingBox();
      grass.computeBoundingSphere();
      this.group.add(grass);
    });

    const branchMaterial = material(0x765035);
    const branchGeometry = new THREE.CylinderGeometry(0.09, 0.14, 1, 8);
    const branches = [
      [new THREE.Vector3(-2.2, 1.2, 0.75), new THREE.Vector3(-0.65, 1.72, 0.25)],
      [new THREE.Vector3(2.25, 1.12, -0.45), new THREE.Vector3(0.85, 1.66, 0.08)],
      [new THREE.Vector3(-1.55, 0.24, 1.72), new THREE.Vector3(-0.2, 0.42, 1.42)],
    ] as const;
    branches.forEach(([start, end], index) => {
      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      branch.name = `TigerHideoutBranch-${index}`;
      setBetween(branch, start, end);
      branch.castShadow = true;
      branch.receiveShadow = true;
      this.group.add(branch);
    });
  }

  setOrigin(origin: THREE.Vector3): void {
    this.group.position.copy(origin);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }
}
