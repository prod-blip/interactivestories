import * as THREE from 'three';

const flowerColors = [0xf8f0cf, 0x8468b9, 0xe5b943];

export function createFlowerPatch(seed: number, count = 9): THREE.Group {
  const group = new THREE.Group();
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x6f7d27, roughness: 1 });
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399 + seed;
    const radius = 0.16 + (index % 4) * 0.12;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.22 + (index % 3) * 0.06, 5), stemMaterial);
    stem.position.set(Math.cos(angle) * radius, 0.13, Math.sin(angle) * radius);
    const blossom = new THREE.Mesh(
      new THREE.SphereGeometry(0.055 + (index % 2) * 0.018, 7, 5),
      new THREE.MeshStandardMaterial({ color: flowerColors[(index + seed) % flowerColors.length], roughness: 0.88 }),
    );
    blossom.position.copy(stem.position).setY(stem.geometry.parameters.height + 0.03);
    group.add(stem, blossom);
  }
  return group;
}

export function createRockCluster(seed: number, count = 5): THREE.Group {
  const group = new THREE.Group();
  const materials = [0xa99476, 0xc5ae87, 0x8f806c].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }),
  );
  for (let index = 0; index < count; index += 1) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 + (index % 3) * 0.2, 1), materials[(index + seed) % materials.length]);
    rock.scale.set(1.15, 0.68 + (index % 2) * 0.2, 0.92);
    rock.position.set(Math.cos(index * 2.1 + seed) * (0.55 + index * 0.12), rock.geometry.parameters.radius * 0.55, Math.sin(index * 2.1 + seed) * (0.5 + index * 0.1));
    rock.rotation.set(index * 0.4, index * 0.8, 0);
    rock.castShadow = true;
    group.add(rock);
  }
  return group;
}

export function createFence(length = 12): THREE.Group {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5729, roughness: 1 });
  for (let x = -length / 2; x <= length / 2; x += 2.4) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 1.8, 7), wood);
    post.position.set(x, 0.9, 0);
    post.castShadow = true;
    group.add(post);
  }
  for (const y of [0.62, 1.28]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, length, 7), wood);
    rail.rotation.z = Math.PI / 2;
    rail.position.y = y;
    rail.castShadow = true;
    group.add(rail);
  }
  return group;
}

export function createGrassTuft(seed: number): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: seed % 2 ? 0xc99d37 : 0xe2b94f, roughness: 1, side: THREE.DoubleSide });
  for (let index = 0; index < 7; index += 1) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.65 + (index % 3) * 0.12), material);
    blade.position.set((index - 3) * 0.07, 0.35, Math.sin(index * 2) * 0.08);
    blade.rotation.y = index * 1.1;
    blade.rotation.z = ((index % 3) - 1) * 0.18;
    group.add(blade);
  }
  return group;
}
