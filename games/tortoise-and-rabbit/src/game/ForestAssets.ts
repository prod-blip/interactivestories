import * as THREE from 'three';

type Palette = {
  bark: THREE.MeshStandardMaterial[];
  leaves: THREE.MeshStandardMaterial[];
  pine: THREE.MeshStandardMaterial[];
  stone: THREE.MeshStandardMaterial[];
};

export class ForestAssets {
  readonly palette: Palette;
  readonly unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 9);
  readonly softBlob = new THREE.IcosahedronGeometry(1, 2);
  readonly stone = new THREE.DodecahedronGeometry(1, 1);
  readonly cone = new THREE.ConeGeometry(1, 1, 9);
  readonly sphere = new THREE.SphereGeometry(1, 14, 10);
  readonly petal = new THREE.SphereGeometry(1, 7, 5);
  readonly cap = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  readonly materials = new Set<THREE.Material>();
  private readonly materialCache = new Map<string, THREE.MeshStandardMaterial>();

  constructor() {
    this.palette = {
      bark: [0x714120, 0x8b5428, 0x9b6531].map((color) => this.material(color, 0.93)),
      leaves: [0x2f8b27, 0x49a82d, 0x69bd35, 0x88ca3a, 0x1e6e24].map((color) => this.material(color, 0.82)),
      pine: [0x176b3b, 0x22804b, 0x2d9250].map((color) => this.material(color, 0.9)),
      stone: [0x778779, 0x929c87, 0x68786c].map((color) => this.material(color, 1)),
    };
  }

  material(color: THREE.ColorRepresentation, roughness = 0.9): THREE.MeshStandardMaterial {
    const resolved = new THREE.Color(color).getHexString();
    const key = `${resolved}:${roughness}`;
    const cached = this.materialCache.get(key);
    if (cached) return cached;
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    this.materials.add(material);
    this.materialCache.set(key, material);
    return material;
  }

  tree(random: () => number, scale = 1): THREE.Group {
    const tree = new THREE.Group();
    const height = (5.8 + random() * 3.4) * scale;
    const trunkRadius = (0.42 + random() * 0.18) * scale;
    const trunk = new THREE.Mesh(this.unitCylinder, pick(this.palette.bark, random));
    trunk.scale.set(trunkRadius, height, trunkRadius * 0.92);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    for (let i = 0; i < 3; i += 1) {
      const branch = new THREE.Mesh(this.unitCylinder, trunk.material);
      const angle = i * 2.1 + random() * 0.6;
      const length = height * (0.23 + random() * 0.08);
      branch.scale.set(trunkRadius * 0.46, length, trunkRadius * 0.46);
      branch.position.set(Math.cos(angle) * length * 0.3, height * (0.55 + i * 0.08), Math.sin(angle) * length * 0.3);
      branch.rotation.order = 'ZXY';
      branch.rotation.z = Math.cos(angle) * 0.72;
      branch.rotation.x = Math.sin(angle) * 0.72;
      branch.castShadow = true;
      tree.add(branch);
    }

    const crownY = height * 0.82;
    const crownRadius = height * 0.31;
    const crownMaterial = pick(this.palette.leaves, random);
    const blobs = [
      [0, 0, 0, 1.15], [-0.72, -0.05, 0.04, 0.78], [0.7, -0.03, 0.08, 0.8],
      [-0.3, 0.48, 0.03, 0.72], [0.34, 0.5, -0.06, 0.72], [0.05, -0.24, 0.55, 0.75],
    ] as const;
    blobs.forEach(([x, y, z, size], index) => {
      const blob = new THREE.Mesh(this.softBlob, index === 4 ? pick(this.palette.leaves, random) : crownMaterial);
      blob.position.set(x * crownRadius, crownY + y * crownRadius, z * crownRadius);
      blob.scale.set(crownRadius * size, crownRadius * size * 0.82, crownRadius * size);
      blob.rotation.set(random(), random(), random());
      blob.castShadow = true;
      blob.receiveShadow = true;
      tree.add(blob);
    });
    for (let i = 0; i < 3; i += 1) {
      const skirt = new THREE.Mesh(this.softBlob, crownMaterial);
      const angle = i * Math.PI * 2 / 3 + 0.4;
      skirt.position.set(Math.cos(angle) * crownRadius * 0.72, crownY - crownRadius * 0.42, Math.sin(angle) * crownRadius * 0.72);
      skirt.scale.set(crownRadius * 0.58, crownRadius * 0.5, crownRadius * 0.58);
      skirt.castShadow = true;
      tree.add(skirt);
    }
    return tree;
  }

  pineTree(random: () => number, scale = 1): THREE.Group {
    const pine = new THREE.Group();
    const height = (7.2 + random() * 3.8) * scale;
    const trunkRadius = (0.25 + random() * 0.09) * scale;
    const trunkMaterial = pick(this.palette.bark, random);
    const trunk = new THREE.Mesh(this.unitCylinder, trunkMaterial);
    trunk.scale.set(trunkRadius, height * 0.94, trunkRadius);
    trunk.position.y = height * 0.47;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    pine.add(trunk);

    const up = new THREE.Vector3(0, 1, 0);
    const branchDirection = new THREE.Vector3();
    const branchStart = new THREE.Vector3();
    const tierCount = 5;

    for (let tier = 0; tier < tierCount; tier += 1) {
      const tierProgress = tier / (tierCount - 1);
      const tierY = height * (0.3 + tierProgress * 0.54);
      const crownWidth = height * (0.27 - tierProgress * 0.145);
      const tierHeight = height * (0.25 - tierProgress * 0.055);
      const tierAngle = random() * Math.PI * 2 + tier * 1.31;
      const foliageMaterial = this.palette.pine[(tier + Math.floor(random() * 2)) % this.palette.pine.length];

      const foliage = new THREE.Mesh(this.cone, foliageMaterial);
      foliage.scale.set(crownWidth, tierHeight, crownWidth * (0.9 + random() * 0.16));
      foliage.position.set(
        (random() - 0.5) * crownWidth * 0.14,
        tierY,
        (random() - 0.5) * crownWidth * 0.14,
      );
      foliage.rotation.y = tierAngle;
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      pine.add(foliage);

      const branchCount = tier < 2 ? 3 : tier === 2 ? 2 : 0;
      for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
        const angle = tierAngle + branchIndex * Math.PI * 2 / branchCount + (random() - 0.5) * 0.28;
        const branchLength = crownWidth * (0.78 + random() * 0.22);
        const rise = branchLength * (-0.09 + tierProgress * 0.16 + random() * 0.08);
        branchDirection.set(Math.cos(angle) * branchLength, rise, Math.sin(angle) * branchLength);
        branchStart.set(0, tierY - tierHeight * 0.23, 0);

        const branch = new THREE.Mesh(this.unitCylinder, trunkMaterial);
        branch.scale.set(trunkRadius * 0.28, branchDirection.length(), trunkRadius * 0.28);
        branch.position.copy(branchStart).addScaledVector(branchDirection, 0.5);
        branch.quaternion.setFromUnitVectors(up, branchDirection.clone().normalize());
        branch.castShadow = true;
        pine.add(branch);

        const needleCluster = new THREE.Mesh(
          this.cone,
          this.palette.pine[(tier + branchIndex + 1) % this.palette.pine.length],
        );
        const clusterWidth = crownWidth * (0.31 + random() * 0.08);
        needleCluster.scale.set(clusterWidth, tierHeight * 0.63, clusterWidth * 0.82);
        needleCluster.position.copy(branchStart).addScaledVector(branchDirection, 0.78);
        needleCluster.position.y += tierHeight * 0.04;
        needleCluster.rotation.set(
          Math.sin(angle) * 0.14,
          angle,
          -Math.cos(angle) * 0.14,
        );
        needleCluster.castShadow = true;
        pine.add(needleCluster);
      }
    }

    const leader = new THREE.Mesh(this.cone, this.palette.pine[1]);
    leader.scale.set(height * 0.075, height * 0.25, height * 0.075);
    leader.position.y = height * 0.91;
    leader.rotation.y = random() * Math.PI * 2;
    leader.castShadow = true;
    pine.add(leader);

    pine.rotation.z = (random() - 0.5) * 0.025;
    pine.rotation.x = (random() - 0.5) * 0.025;
    return pine;
  }

  bush(random: () => number, scale = 1): THREE.Group {
    const bush = new THREE.Group();
    const material = pick(this.palette.leaves, random);
    for (let i = 0; i < 4; i += 1) {
      const blob = new THREE.Mesh(this.softBlob, i === 3 ? pick(this.palette.leaves, random) : material);
      blob.position.set((i - 1.5) * 0.45 * scale, (0.55 + (i % 2) * 0.18) * scale, (random() - 0.5) * 0.4 * scale);
      blob.scale.set(0.8 * scale, 0.65 * scale, 0.75 * scale);
      blob.castShadow = true;
      bush.add(blob);
    }
    return bush;
  }

  rock(random: () => number, scale = 1): THREE.Mesh {
    const rock = new THREE.Mesh(this.stone, pick(this.palette.stone, random));
    rock.scale.set(scale * (0.85 + random() * 0.45), scale * (0.55 + random() * 0.3), scale);
    rock.rotation.set(random() * 0.3, random() * Math.PI, random() * 0.18);
    rock.position.y = rock.scale.y * 0.68;
    rock.castShadow = true;
    rock.receiveShadow = true;
    return rock;
  }

  flower(random: () => number, scale = 1): THREE.Group {
    const flower = new THREE.Group();
    const stemMaterial = this.material(0x3c9138);
    const colors = [0xffd52e, 0xff6f32, 0xf6539a, 0x9b6bea, 0xffffff, 0x5ab8ff];
    const petalMaterial = this.material(pick(colors, random), 0.75);
    const stem = new THREE.Mesh(this.unitCylinder, stemMaterial);
    stem.scale.set(0.035 * scale, 0.65 * scale, 0.035 * scale);
    stem.position.y = 0.32 * scale;
    flower.add(stem);
    for (let i = 0; i < 6; i += 1) {
      const petal = new THREE.Mesh(this.petal, petalMaterial);
      const angle = i * Math.PI / 3;
      petal.scale.set(0.2 * scale, 0.07 * scale, 0.1 * scale);
      petal.position.set(Math.cos(angle) * 0.16 * scale, 0.68 * scale, Math.sin(angle) * 0.16 * scale);
      petal.rotation.y = -angle;
      flower.add(petal);
    }
    const center = new THREE.Mesh(this.sphere, this.material(0xf6ae26));
    center.scale.setScalar(0.09 * scale);
    center.position.y = 0.7 * scale;
    flower.add(center);
    return flower;
  }

  grassTuft(random: () => number, scale = 1): THREE.Group {
    const tuft = new THREE.Group();
    const material = this.material(random() > 0.5 ? 0x3e992e : 0x59a932);
    for (let i = 0; i < 4; i += 1) {
      const blade = new THREE.Mesh(this.cone, material);
      const angle = i * Math.PI / 2 + random() * 0.35;
      blade.scale.set(0.075 * scale, (0.45 + random() * 0.3) * scale, 0.025 * scale);
      blade.position.set(Math.cos(angle) * 0.09 * scale, blade.scale.y * 0.48, Math.sin(angle) * 0.09 * scale);
      blade.rotation.z = Math.cos(angle) * 0.22;
      blade.rotation.x = Math.sin(angle) * 0.22;
      tuft.add(blade);
    }
    return tuft;
  }

  mushroom(random: () => number, scale = 1): THREE.Group {
    const mushroom = new THREE.Group();
    const stalk = new THREE.Mesh(this.unitCylinder, this.material(0xf2e5c2));
    stalk.scale.set(0.14 * scale, 0.55 * scale, 0.14 * scale);
    stalk.position.y = 0.28 * scale;
    const cap = new THREE.Mesh(this.cap, this.material(random() > 0.3 ? 0xd93c28 : 0xf49b2d, 0.72));
    cap.scale.set(0.48 * scale, 0.26 * scale, 0.48 * scale);
    cap.position.y = 0.55 * scale;
    mushroom.add(stalk, cap);
    for (let i = 0; i < 5; i += 1) {
      const spot = new THREE.Mesh(this.sphere, this.material(0xfff3d7));
      const angle = i * 2.4;
      spot.scale.set(0.055, 0.025, 0.055).multiplyScalar(scale);
      spot.position.set(Math.cos(angle) * 0.25 * scale, 0.76 * scale, Math.sin(angle) * 0.25 * scale);
      mushroom.add(spot);
    }
    return mushroom;
  }

  dispose(): void {
    [this.unitCylinder, this.softBlob, this.stone, this.cone, this.sphere, this.petal, this.cap].forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
  }
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}
