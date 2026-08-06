import * as THREE from 'three';

type RandomSource = () => number;
export type SceneryZone = 'olive-grove' | 'wildflower-meadow' | 'rocky-field' | 'cart-trail' | 'garden-outskirts';

const markForMotion = (object: THREE.Object3D, kind: 'sway' | 'butterfly' | 'leaf' | 'dust', random: RandomSource, amplitude: number): void => {
  object.userData.ambientMotion = kind;
  object.userData.motionPhase = random() * Math.PI * 2;
  object.userData.motionSpeed = 0.45 + random() * 0.55;
  object.userData.motionAmplitude = amplitude;
};

export class StorybookScenery {
  private readonly geometries = {
    stem: new THREE.CylinderGeometry(0.045, 0.065, 1, 6),
    trunk: new THREE.CylinderGeometry(0.09, 0.14, 1, 7),
    branch: new THREE.CylinderGeometry(0.035, 0.075, 1, 6),
    leaf: new THREE.IcosahedronGeometry(0.34, 1),
    flatLeaf: new THREE.SphereGeometry(0.13, 7, 5),
    canopy: new THREE.DodecahedronGeometry(0.72, 1),
    blossom: new THREE.SphereGeometry(0.075, 7, 5),
    seedHead: new THREE.CapsuleGeometry(0.065, 0.18, 3, 6),
    hay: new THREE.CylinderGeometry(0.62, 0.62, 1.15, 12),
    hayBand: new THREE.TorusGeometry(0.63, 0.025, 5, 12),
    stone: new THREE.DodecahedronGeometry(0.32, 0),
    stump: new THREE.CylinderGeometry(0.38, 0.48, 0.65, 9),
    stumpTop: new THREE.CylinderGeometry(0.385, 0.385, 0.025, 9),
    nest: new THREE.TorusGeometry(0.42, 0.12, 6, 16),
    sack: new THREE.SphereGeometry(0.46, 10, 7),
    toolHandle: new THREE.CylinderGeometry(0.035, 0.04, 1.7, 6),
    toolHead: new THREE.BoxGeometry(0.58, 0.12, 0.18),
    clay: new THREE.TetrahedronGeometry(0.23, 0),
    wing: new THREE.CircleGeometry(0.13, 7, 0, Math.PI),
    mote: new THREE.SphereGeometry(0.025, 5, 4),
  };

  private readonly materials = {
    bark: [0x654c3a, 0x71523c, 0x5f5040].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 1 })),
    twig: new THREE.MeshStandardMaterial({ color: 0x7a6049, roughness: 1 }),
    leaves: [0x4d6954, 0x5c735b, 0x687a62, 0x506657, 0x78806a].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.96 }),
    ),
    blossoms: [0xb9a3a0, 0xc6b78f, 0x9ba3b1, 0xafa58e].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.92 }),
    ),
    reeds: new THREE.MeshStandardMaterial({ color: 0x747d58, roughness: 1 }),
    seed: new THREE.MeshStandardMaterial({ color: 0x887253, roughness: 1 }),
    hay: new THREE.MeshStandardMaterial({ color: 0x9f8a61, roughness: 1 }),
    hayBand: new THREE.MeshStandardMaterial({ color: 0x685d4e, roughness: 1 }),
    stones: [0x817b71, 0x948a7b, 0x706e69, 0x8b8174].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    ),
    stumpTop: new THREE.MeshStandardMaterial({ color: 0xa1835e, roughness: 1 }),
    nest: new THREE.MeshStandardMaterial({ color: 0x745b42, roughness: 1 }),
    sack: new THREE.MeshStandardMaterial({ color: 0x9b8769, roughness: 1 }),
    sackTie: new THREE.MeshStandardMaterial({ color: 0x665845, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x666965, roughness: 0.9 }),
    clay: [0x9d6750, 0xaa7559, 0x8e604f].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 1 })),
    butterfly: [0xa89c86, 0x8b9b96, 0x9d8d9b].map(
      (color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.78 }),
    ),
    driftingLeaf: new THREE.MeshStandardMaterial({ color: 0x718069, roughness: 1, side: THREE.DoubleSide }),
    dust: new THREE.MeshBasicMaterial({ color: 0xc8b995, transparent: true, opacity: 0.33, depthWrite: false }),
  };

  createShrub(random: RandomSource, variant = 0): THREE.Group {
    const group = new THREE.Group();
    const stemCount = 3 + ((variant + Math.floor(random() * 4)) % 5);
    const crown = new THREE.Group();
    for (let index = 0; index < stemCount; index += 1) {
      const angle = (index / stemCount) * Math.PI * 2 + random() * 0.55;
      const height = 0.58 + random() * 0.68;
      const stem = new THREE.Mesh(this.geometries.stem, this.materials.twig);
      stem.scale.y = height;
      stem.position.set(Math.cos(angle) * 0.18, height * 0.46, Math.sin(angle) * 0.18);
      stem.rotation.z = Math.cos(angle) * (0.16 + random() * 0.17);
      stem.rotation.x = Math.sin(angle) * (0.16 + random() * 0.17);
      const leaf = new THREE.Mesh(this.geometries.leaf, this.materials.leaves[(index + variant) % this.materials.leaves.length]);
      leaf.position.set(Math.cos(angle) * (0.28 + random() * 0.22), height * 0.88, Math.sin(angle) * (0.28 + random() * 0.22));
      leaf.scale.set(1.05 + random() * 0.55, 0.68 + random() * 0.28, 0.84 + random() * 0.4);
      leaf.rotation.set(random() * 0.4, angle, random() * 0.3);
      stem.castShadow = leaf.castShadow = true;
      group.add(stem);
      crown.add(leaf);
    }
    markForMotion(crown, 'sway', random, 0.025);
    group.add(crown);
    group.scale.setScalar(0.72 + random() * 0.62);
    return group;
  }

  createSmallTree(random: RandomSource, profile: 'olive' | 'round' | 'slender' = 'round'): THREE.Group {
    const group = new THREE.Group();
    const height = profile === 'slender' ? 3.1 + random() * 1.4 : 2.15 + random() * 1.55;
    const trunk = new THREE.Mesh(this.geometries.trunk, this.materials.bark[Math.floor(random() * this.materials.bark.length)]);
    trunk.scale.set(profile === 'slender' ? 0.78 : 1.15 + random() * 0.42, height, profile === 'slender' ? 0.78 : 1.15 + random() * 0.42);
    trunk.position.y = height * 0.48;
    trunk.rotation.z = (random() - 0.5) * (profile === 'olive' ? 0.24 : 0.12);
    trunk.castShadow = true;
    group.add(trunk);

    const crownGroup = new THREE.Group();
    const crownCount = profile === 'olive' ? 6 + Math.floor(random() * 3) : 3 + Math.floor(random() * 5);
    for (let index = 0; index < crownCount; index += 1) {
      const angle = (index / crownCount) * Math.PI * 2 + random();
      const crown = new THREE.Mesh(this.geometries.canopy, this.materials.leaves[(index + Math.floor(random() * 3)) % this.materials.leaves.length]);
      const spread = profile === 'olive' ? 0.88 : profile === 'slender' ? 0.38 : 0.56;
      crown.position.set(Math.cos(angle) * (spread + random() * 0.38), height + (random() - 0.3) * 0.68, Math.sin(angle) * (spread * 0.82 + random() * 0.3));
      crown.scale.set(
        (profile === 'olive' ? 1.25 : 0.92) + random() * 0.48,
        (profile === 'olive' ? 0.55 : 0.75) + random() * 0.26,
        0.86 + random() * 0.4,
      );
      crown.rotation.set(random() * 0.2, random() * Math.PI, random() * 0.18);
      crown.castShadow = true;
      crownGroup.add(crown);
    }
    markForMotion(crownGroup, 'sway', random, profile === 'slender' ? 0.022 : 0.014);
    group.add(crownGroup);
    group.scale.setScalar(0.76 + random() * 0.34);
    return group;
  }

  createReeds(random: RandomSource): THREE.Group {
    const group = new THREE.Group();
    const stems = new THREE.Group();
    const count = 5 + Math.floor(random() * 6);
    for (let index = 0; index < count; index += 1) {
      const height = 0.62 + random() * 0.85;
      const stem = new THREE.Mesh(this.geometries.branch, this.materials.reeds);
      stem.scale.set(0.42, height, 0.42);
      stem.position.set((random() - 0.5) * 0.72, height * 0.48, (random() - 0.5) * 0.58);
      stem.rotation.z = (random() - 0.5) * 0.16;
      const seed = new THREE.Mesh(this.geometries.seedHead, this.materials.seed);
      seed.position.copy(stem.position).setY(height + 0.08);
      seed.rotation.z = stem.rotation.z;
      stem.castShadow = seed.castShadow = true;
      stems.add(stem, seed);
    }
    markForMotion(stems, 'sway', random, 0.035);
    group.add(stems);
    return group;
  }

  createHayRoll(random: RandomSource): THREE.Group {
    const group = new THREE.Group();
    const bale = new THREE.Mesh(this.geometries.hay, this.materials.hay);
    bale.rotation.z = Math.PI / 2;
    bale.position.y = 0.62;
    bale.castShadow = true;
    group.add(bale);
    for (const offset of [-0.32, 0.32]) {
      const band = new THREE.Mesh(this.geometries.hayBand, this.materials.hayBand);
      band.rotation.y = Math.PI / 2;
      band.position.set(offset, 0.62, 0);
      group.add(band);
    }
    group.rotation.y = random() * Math.PI;
    group.scale.setScalar(0.72 + random() * 0.38);
    return group;
  }

  createFloweringHerbs(random: RandomSource): THREE.Group {
    const group = this.createShrub(random, 2 + Math.floor(random() * 3));
    const blossoms = 4 + Math.floor(random() * 6);
    for (let index = 0; index < blossoms; index += 1) {
      const blossom = new THREE.Mesh(this.geometries.blossom, this.materials.blossoms[index % this.materials.blossoms.length]);
      const angle = random() * Math.PI * 2;
      blossom.position.set(Math.cos(angle) * (0.22 + random() * 0.4), 0.62 + random() * 0.68, Math.sin(angle) * (0.22 + random() * 0.4));
      blossom.scale.y = 0.62;
      blossom.castShadow = true;
      group.add(blossom);
    }
    group.scale.multiplyScalar(0.72 + random() * 0.28);
    return group;
  }

  createStoneCairn(random: RandomSource, clustered = false): THREE.Group {
    const group = new THREE.Group();
    const count = clustered ? 5 + Math.floor(random() * 4) : 2 + Math.floor(random() * 3);
    let y = 0;
    for (let index = 0; index < count; index += 1) {
      const stone = new THREE.Mesh(this.geometries.stone, this.materials.stones[index % this.materials.stones.length]);
      const stackedScale = clustered ? 0.7 + random() * 0.75 : 1 - index * 0.17;
      stone.scale.set(stackedScale * (1.05 + random() * 0.28), stackedScale * 0.52, stackedScale);
      stone.position.set(
        clustered ? (random() - 0.5) * 1.25 : (random() - 0.5) * 0.1,
        clustered ? 0.15 * stackedScale : y + 0.18 * stackedScale,
        clustered ? (random() - 0.5) * 0.95 : (random() - 0.5) * 0.1,
      );
      stone.rotation.set(random(), random() * Math.PI, random() * 0.3);
      stone.castShadow = true;
      group.add(stone);
      if (!clustered) y += 0.32 * stackedScale;
    }
    return group;
  }

  createFallenBranch(random: RandomSource): THREE.Group {
    const group = new THREE.Group();
    const limb = new THREE.Mesh(this.geometries.branch, this.materials.bark[1]);
    limb.scale.set(1.6, 2.1 + random(), 1.6);
    limb.rotation.z = Math.PI / 2;
    limb.rotation.y = random() * Math.PI;
    limb.position.y = 0.12;
    limb.castShadow = true;
    group.add(limb);
    for (const side of [-1, 1]) {
      const twig = new THREE.Mesh(this.geometries.branch, this.materials.twig);
      twig.scale.set(0.72, 0.72 + random() * 0.35, 0.72);
      twig.rotation.z = Math.PI / 2 + side * 0.68;
      twig.rotation.y = limb.rotation.y;
      twig.position.set(side * 0.55, 0.19, side * 0.18);
      twig.castShadow = true;
      group.add(twig);
    }
    return group;
  }

  createStump(random: RandomSource): THREE.Group {
    const group = new THREE.Group();
    const stump = new THREE.Mesh(this.geometries.stump, this.materials.bark[Math.floor(random() * this.materials.bark.length)]);
    stump.position.y = 0.32;
    stump.rotation.y = random() * Math.PI;
    stump.castShadow = true;
    const top = new THREE.Mesh(this.geometries.stumpTop, this.materials.stumpTop);
    top.position.y = 0.655;
    group.add(stump, top);
    group.scale.setScalar(0.72 + random() * 0.48);
    return group;
  }

  createNest(random: RandomSource): THREE.Group {
    const group = new THREE.Group();
    for (let index = 0; index < 4; index += 1) {
      const ring = new THREE.Mesh(this.geometries.nest, this.materials.nest);
      ring.rotation.x = Math.PI / 2 + (random() - 0.5) * 0.13;
      ring.rotation.z = random() * Math.PI;
      ring.position.y = 0.1 + index * 0.045;
      ring.scale.setScalar(1 - index * 0.08);
      ring.castShadow = true;
      group.add(ring);
    }
    group.rotation.y = random() * Math.PI;
    return group;
  }

  createSack(random: RandomSource): THREE.Group {
    const group = new THREE.Group();
    const sack = new THREE.Mesh(this.geometries.sack, this.materials.sack);
    sack.scale.set(0.82, 1.12, 0.7);
    sack.position.y = 0.45;
    sack.rotation.z = (random() - 0.5) * 0.2;
    sack.castShadow = true;
    const tie = new THREE.Mesh(this.geometries.hayBand, this.materials.sackTie);
    tie.scale.setScalar(0.28);
    tie.rotation.x = Math.PI / 2;
    tie.position.y = 0.86;
    group.add(sack, tie);
    return group;
  }

  createFarmTool(random: RandomSource): THREE.Group {
    const group = new THREE.Group();
    const handle = new THREE.Mesh(this.geometries.toolHandle, this.materials.twig);
    handle.rotation.z = Math.PI / 2 - 0.16;
    handle.rotation.y = random() * Math.PI;
    handle.position.y = 0.1;
    handle.castShadow = true;
    const head = new THREE.Mesh(this.geometries.toolHead, this.materials.iron);
    head.position.set(Math.cos(handle.rotation.y) * 0.76, 0.12, -Math.sin(handle.rotation.y) * 0.76);
    head.rotation.y = handle.rotation.y;
    head.castShadow = true;
    group.add(handle, head);
    return group;
  }

  createClayFragments(random: RandomSource): THREE.Group {
    const group = new THREE.Group();
    const count = 3 + Math.floor(random() * 4);
    for (let index = 0; index < count; index += 1) {
      const shard = new THREE.Mesh(this.geometries.clay, this.materials.clay[index % this.materials.clay.length]);
      shard.scale.set(0.58 + random() * 0.55, 0.2 + random() * 0.22, 0.7 + random() * 0.5);
      shard.position.set((random() - 0.5) * 1.05, 0.07, (random() - 0.5) * 0.82);
      shard.rotation.set(random(), random() * Math.PI, random());
      shard.castShadow = true;
      group.add(shard);
    }
    return group;
  }

  createButterfly(random: RandomSource): THREE.Group {
    const group = new THREE.Group();
    const material = this.materials.butterfly[Math.floor(random() * this.materials.butterfly.length)];
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(this.geometries.wing, material);
      wing.position.x = side * 0.08;
      wing.rotation.y = side * 0.52;
      wing.userData.wingSide = side;
      group.add(wing);
    }
    markForMotion(group, 'butterfly', random, 0.7 + random() * 0.45);
    group.position.y = 0.85 + random() * 0.75;
    return group;
  }

  createDriftingLeaf(random: RandomSource): THREE.Group {
    const group = new THREE.Group();
    const leaf = new THREE.Mesh(this.geometries.flatLeaf, this.materials.driftingLeaf);
    leaf.scale.set(1, 0.18, 0.48);
    group.add(leaf);
    group.position.y = 1.3 + random() * 1.8;
    markForMotion(group, 'leaf', random, 0.42 + random() * 0.36);
    return group;
  }

  createDustMote(random: RandomSource): THREE.Group {
    const group = new THREE.Group();
    const count = 3 + Math.floor(random() * 4);
    for (let index = 0; index < count; index += 1) {
      const mote = new THREE.Mesh(this.geometries.mote, this.materials.dust);
      mote.position.set((random() - 0.5) * 0.8, random() * 0.65, (random() - 0.5) * 0.8);
      group.add(mote);
    }
    markForMotion(group, 'dust', random, 0.24 + random() * 0.18);
    return group;
  }

  dispose(): void {
    Object.values(this.geometries).forEach((geometry) => geometry.dispose());
    Object.values(this.materials).flat().forEach((material) => material.dispose());
  }
}
