import * as THREE from 'three';

type SwayingTree = {
  crown: THREE.Group;
  phase: number;
  strength: number;
};

type Butterfly = {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  origin: THREE.Vector3;
  phase: number;
};

type JumpingFish = {
  group: THREE.Group;
  z: number;
  phase: number;
};

type FlyingBird = {
  group: THREE.Group;
  phase: number;
  radius: number;
};

const WORLD_MIN_Z = -76;
const WORLD_MAX_Z = 46;
const RIVER_BASE_WIDTH = 12.6;

function seeded(index: number, salt = 0): number {
  const value = Math.sin(index * 91.733 + salt * 31.117) * 43758.5453;
  return value - Math.floor(value);
}

function makeMaterial(
  color: number,
  roughness = 0.82,
  metalness = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function setShadows(object: THREE.Object3D, cast = true, receive = true): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = cast;
    child.receiveShadow = receive;
  });
}

export class ForestRiverWorld {
  readonly group = new THREE.Group();
  private readonly swayingTrees: SwayingTree[] = [];
  private readonly butterflies: Butterfly[] = [];
  private readonly fish: JumpingFish[] = [];
  private readonly birds: FlyingBird[] = [];
  private readonly bushMeshes: THREE.InstancedMesh[] = [];
  private readonly riverGameplayDecor: THREE.Object3D[] = [];
  private readonly floatingThings: { object: THREE.Object3D; phase: number; baseY: number }[] = [];
  private readonly sparklePositions: Float32Array;
  private readonly sparklePoints: THREE.Points;
  private elapsed = 0;

  private readonly bark = makeMaterial(0x8a5738, 0.96);
  private readonly barkLight = makeMaterial(0xb17748, 0.92);
  private readonly leafA = makeMaterial(0x58a85f, 0.91);
  private readonly leafB = makeMaterial(0x77be65, 0.9);
  private readonly leafC = makeMaterial(0x3e8b55, 0.93);
  private readonly stone = makeMaterial(0x7d8b80, 0.98);
  private readonly stoneWarm = makeMaterial(0xa89a7e, 0.98);
  private readonly sand = makeMaterial(0xe8c98a, 0.98);
  private readonly grass = makeMaterial(0x78b95c, 0.96);
  private readonly darkGrass = makeMaterial(0x3f8b52, 0.98);
  private readonly treeTrunkGeometry = new THREE.CylinderGeometry(0.36, 0.58, 4.8, 9);
  private readonly treeBranchGeometry = new THREE.CylinderGeometry(0.12, 0.2, 2.1, 7);
  private readonly canopyGeometry = new THREE.DodecahedronGeometry(1, 1);
  private readonly bushGeometry = new THREE.IcosahedronGeometry(1, 1);
  private readonly rockGeometry = new THREE.DodecahedronGeometry(1, 0);

  constructor() {
    this.group.name = 'OpeningForestRiver';

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 110), this.grass);
    ground.name = 'ForestFloor';
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.42;
    ground.receiveShadow = true;
    this.group.add(ground);

    this.createRiverAndBanks();
    this.createTrees();
    this.createBushes();
    this.createRocksAndBranches();
    this.createFlowersAndMushrooms();
    this.createReeds();
    this.createWaterLife();
    this.createButterflies();
    this.createBirds();

    this.sparklePositions = new Float32Array(72 * 3);
    for (let index = 0; index < 72; index += 1) {
      const z = THREE.MathUtils.lerp(WORLD_MIN_Z, WORLD_MAX_Z, seeded(index, 17));
      const x = this.riverCenterAt(z) + (seeded(index, 18) - 0.5) * (this.riverWidthAt(z) - 1.2);
      this.sparklePositions[index * 3] = x;
      this.sparklePositions[index * 3 + 1] = 0.13;
      this.sparklePositions[index * 3 + 2] = z;
    }
    const sparkleGeometry = new THREE.BufferGeometry();
    sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(this.sparklePositions, 3));
    const sparkleMaterial = new THREE.PointsMaterial({
      color: 0xfff7c3,
      size: 0.11,
      transparent: true,
      opacity: 0.76,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.sparklePoints = new THREE.Points(sparkleGeometry, sparkleMaterial);
    this.sparklePoints.name = 'RiverSparkles';
    this.group.add(this.sparklePoints);
  }

  riverCenterAt(z: number): number {
    return Math.sin(z * 0.088) * 3.25 + Math.sin(z * 0.031 + 1.2) * 1.5;
  }

  riverWidthAt(z: number): number {
    const longVariation = Math.sin(z * 0.052 + 0.9) * 1.15;
    const shortVariation = Math.sin(z * 0.137 - 0.35) * 0.55;
    const storyPool = Math.exp(-Math.pow((z - 5) / 10, 2)) * 1.1;
    return RIVER_BASE_WIDTH + longVariation + shortVariation + storyPool;
  }

  private leftWaterEdgeAt(z: number): number {
    return this.riverCenterAt(z)
      - this.riverWidthAt(z) * 0.5
      + Math.sin(z * 0.19 + 1.1) * 0.32
      + Math.sin(z * 0.071) * 0.18;
  }

  private rightWaterEdgeAt(z: number): number {
    return this.riverCenterAt(z)
      + this.riverWidthAt(z) * 0.5
      + Math.sin(z * 0.155 - 0.8) * 0.38
      - Math.sin(z * 0.061 + 0.5) * 0.15;
  }

  leftBankPathAt(z: number): number {
    return this.leftWaterEdgeAt(z) - 1.35;
  }

  setBushesVisible(visible: boolean): void {
    this.bushMeshes.forEach((bushes) => {
      bushes.visible = visible;
    });
  }

  setGameplayRiverDecorVisible(visible: boolean): void {
    this.riverGameplayDecor.forEach((object) => {
      object.visible = visible;
    });
  }

  update(delta: number): void {
    this.elapsed += delta;

    this.swayingTrees.forEach(({ crown, phase, strength }) => {
      crown.rotation.z = Math.sin(this.elapsed * 0.72 + phase) * strength;
      crown.rotation.x = Math.cos(this.elapsed * 0.55 + phase * 0.8) * strength * 0.42;
    });

    this.butterflies.forEach((butterfly) => {
      const t = this.elapsed * 0.75 + butterfly.phase;
      butterfly.group.position.set(
        butterfly.origin.x + Math.sin(t * 1.3) * 0.8,
        butterfly.origin.y + Math.sin(t * 2.1) * 0.22,
        butterfly.origin.z + Math.cos(t) * 0.75,
      );
      butterfly.group.rotation.y = -t * 0.35;
      const flap = 0.24 + Math.abs(Math.sin(t * 8.5)) * 0.95;
      butterfly.leftWing.rotation.y = flap;
      butterfly.rightWing.rotation.y = -flap;
    });

    this.fish.forEach((fish) => {
      const cycle = (this.elapsed + fish.phase) % 6.5;
      fish.group.visible = cycle < 1.35;
      if (!fish.group.visible) return;
      const progress = cycle / 1.35;
      const z = fish.z - progress * 1.45;
      fish.group.position.set(
        this.riverCenterAt(z) + Math.sin(fish.phase) * 1.7,
        0.04 + Math.sin(progress * Math.PI) * 1.18,
        z,
      );
      fish.group.rotation.x = progress * Math.PI * 1.15;
    });

    this.birds.forEach((bird) => {
      const angle = this.elapsed * 0.12 + bird.phase;
      bird.group.position.set(
        Math.cos(angle) * bird.radius,
        10.5 + Math.sin(angle * 2) * 0.7,
        -4 + Math.sin(angle) * bird.radius * 0.62,
      );
      bird.group.rotation.y = -angle + Math.PI * 0.5;
      bird.group.children.forEach((wing, index) => {
        wing.rotation.z = (index === 0 ? 1 : -1) * (0.18 + Math.sin(this.elapsed * 4 + bird.phase) * 0.2);
      });
    });

    this.floatingThings.forEach(({ object, phase, baseY }) => {
      object.position.y = baseY + Math.sin(this.elapsed * 1.15 + phase) * 0.025;
      object.rotation.y += delta * (0.035 + (phase % 0.08));
    });

    const sparkleAttribute = this.sparklePoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let index = 0; index < sparkleAttribute.count; index += 1) {
      const offset = index * 3;
      const z = this.sparklePositions[offset + 2]! - delta * (0.34 + seeded(index, 31) * 0.18);
      const wrappedZ = z < WORLD_MIN_Z ? WORLD_MAX_Z : z;
      this.sparklePositions[offset + 2] = wrappedZ;
      this.sparklePositions[offset] = this.riverCenterAt(wrappedZ)
        + Math.sin(this.elapsed * 0.9 + index) * (this.riverWidthAt(wrappedZ) * 0.38);
      this.sparklePositions[offset + 1] = 0.12 + Math.sin(this.elapsed * 2 + index) * 0.018;
    }
    sparkleAttribute.needsUpdate = true;
  }

  private createRiverAndBanks(): void {
    const waterGeometry = this.createRibbonGeometry(
      (z) => this.leftWaterEdgeAt(z),
      (z) => this.rightWaterEdgeAt(z),
      0.01,
    );
    const water = new THREE.Mesh(
      waterGeometry,
      new THREE.MeshPhysicalMaterial({
        color: 0x39acd0,
        roughness: 0.22,
        metalness: 0.02,
        transparent: true,
        opacity: 0.9,
        transmission: 0.08,
        clearcoat: 0.48,
        clearcoatRoughness: 0.25,
      }),
    );
    water.name = 'SparklingRiver';
    water.receiveShadow = true;
    this.group.add(water);

    const riverbed = new THREE.Mesh(
      this.createRibbonGeometry(
        (z) => this.leftWaterEdgeAt(z) + 0.42,
        (z) => this.rightWaterEdgeAt(z) - 0.42,
        -0.08,
      ),
      makeMaterial(0x65b59c, 1),
    );
    riverbed.name = 'VisibleRiverbed';
    this.group.add(riverbed);

    const leftSand = new THREE.Mesh(
      this.createRibbonGeometry(
        (z) => this.leftWaterEdgeAt(z) - 2.85 - Math.sin(z * 0.11 + 0.4) * 0.3,
        (z) => this.leftWaterEdgeAt(z) + 0.1,
        -0.015,
      ),
      this.sand,
    );
    leftSand.name = 'WideSandyBank';
    leftSand.receiveShadow = true;

    const rightSand = new THREE.Mesh(
      this.createRibbonGeometry(
        (z) => this.rightWaterEdgeAt(z) - 0.1,
        (z) => this.rightWaterEdgeAt(z) + 2.2 + Math.sin(z * 0.095 - 0.7) * 0.28,
        -0.02,
      ),
      makeMaterial(0xe1c181, 0.98),
    );
    rightSand.name = 'OppositeSandyEdge';
    rightSand.receiveShadow = true;
    this.group.add(leftSand, rightSand);

    for (let index = 0; index < 22; index += 1) {
      const z = THREE.MathUtils.lerp(WORLD_MIN_Z + 3, WORLD_MAX_Z - 3, seeded(index, 22));
      const ripple = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.19, 24),
        new THREE.MeshBasicMaterial({ color: 0xcdf8ef, transparent: true, opacity: 0.42 }),
      );
      ripple.rotation.x = -Math.PI / 2;
      ripple.scale.x = 1.8;
      ripple.position.set(
        this.riverCenterAt(z) + (seeded(index, 23) - 0.5) * (this.riverWidthAt(z) - 1.5),
        0.14,
        z,
      );
      this.group.add(ripple);
      this.floatingThings.push({ object: ripple, phase: seeded(index, 24) * Math.PI * 2, baseY: 0.14 });
    }
  }

  private createTrees(): void {
    const shadowGeometry = new THREE.CircleGeometry(1, 20);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x285d3c,
      transparent: true,
      opacity: 0.19,
      depthWrite: false,
    });
    const treeShadows = new THREE.InstancedMesh(shadowGeometry, shadowMaterial, 34);
    treeShadows.name = 'InstancedTreeContactShadows';
    const dummy = new THREE.Object3D();
    for (let index = 0; index < 34; index += 1) {
      const z = THREE.MathUtils.lerp(WORLD_MIN_Z, WORLD_MAX_Z, index / 33);
      const side = index % 2 === 0 ? -1 : 1;
      const distance = this.riverWidthAt(z) * 0.5 + 3.8 + seeded(index, 1) * 7.4;
      const x = this.riverCenterAt(z) + side * distance;
      const scale = 0.78 + seeded(index, 2) * 0.7;
      const tree = this.createTree(index, scale);
      tree.position.set(x, -0.38, z + (seeded(index, 3) - 0.5) * 3.8);
      if (index === 18) tree.position.set(17.4, -0.38, -9.4);
      if (index === 20) {
        // Keep both trees in the forest, but move the near-camera pair to the
        // far bank so their trunks do not cross Scene 3's reveal or POV shots.
        tree.position.set(16.8, -0.38, -1.9);
      }
      tree.rotation.y = seeded(index, 4) * Math.PI * 2;
      this.group.add(tree);
      dummy.position.set(tree.position.x, -0.405, tree.position.z);
      dummy.rotation.set(-Math.PI / 2, 0, tree.rotation.y);
      dummy.scale.set(2.25 * scale, 1.55 * scale, 1);
      dummy.updateMatrix();
      treeShadows.setMatrixAt(index, dummy.matrix);
    }
    treeShadows.instanceMatrix.needsUpdate = true;
    this.group.add(treeShadows);
  }

  private createTree(index: number, scale: number): THREE.Group {
    const tree = new THREE.Group();
    tree.name = `RoundedStoryTree-${index}`;
    tree.scale.setScalar(scale);

    const trunk = new THREE.Mesh(this.treeTrunkGeometry, this.bark);
    trunk.position.y = 2.35;
    trunk.rotation.z = (seeded(index, 7) - 0.5) * 0.08;
    tree.add(trunk);

    for (const direction of [-1, 1]) {
      const branch = new THREE.Mesh(this.treeBranchGeometry, this.barkLight);
      branch.position.set(direction * 0.62, 3.6, 0);
      branch.rotation.z = direction * -0.74;
      tree.add(branch);
    }

    const crown = new THREE.Group();
    crown.position.y = 4.75;
    const foliageMaterial = [this.leafA, this.leafB, this.leafC][index % 3]!;
    const crownParts = [
      [-1.05, 0.05, 0.05, 1.45],
      [0.1, 0.55, 0.15, 1.62],
      [1.1, 0.08, -0.08, 1.35],
      [-0.18, -0.48, 0.35, 1.42],
    ] as const;
    crownParts.forEach(([x, y, z, radius], partIndex) => {
      const canopy = new THREE.Mesh(this.canopyGeometry, foliageMaterial);
      canopy.name = `SoftCanopy-${partIndex}`;
      canopy.position.set(x, y, z);
      canopy.scale.set(radius, radius * (0.86 + seeded(index, partIndex + 40) * 0.2), radius);
      crown.add(canopy);
    });
    tree.add(crown);
    setShadows(tree, false, true);
    this.swayingTrees.push({ crown, phase: seeded(index, 11) * Math.PI * 2, strength: 0.018 + seeded(index, 12) * 0.02 });
    return tree;
  }

  private createBushes(): void {
    const darkClusterCount = Array.from({ length: 32 }, (_, index) => index)
      .filter((index) => index % 3 === 0).length * 4;
    const brightClusterCount = 32 * 4 - darkClusterCount;
    const darkBushes = new THREE.InstancedMesh(this.bushGeometry, this.leafC, darkClusterCount);
    const brightBushes = new THREE.InstancedMesh(this.bushGeometry, this.leafA, brightClusterCount);
    darkBushes.name = 'InstancedDarkBushes';
    brightBushes.name = 'InstancedBrightBushes';
    const dummy = new THREE.Object3D();
    let darkOffset = 0;
    let brightOffset = 0;
    for (let index = 0; index < 32; index += 1) {
      const z = THREE.MathUtils.lerp(WORLD_MIN_Z, WORLD_MAX_Z, seeded(index, 70));
      const side = index % 2 === 0 ? -1 : 1;
      const x = this.riverCenterAt(z)
        + side * (this.riverWidthAt(z) * 0.5 + 2.25 + seeded(index, 71) * 7.1);
      for (let part = 0; part < 4; part += 1) {
        const radius = 0.72 + seeded(index, part + 80) * 0.32;
        dummy.position.set(
          x + (part - 1.5) * 0.45,
          -0.22 + 0.55 + (part % 2) * 0.2,
          z + (seeded(index, part + 90) - 0.5) * 0.4,
        );
        dummy.scale.set(radius, radius * 0.8, radius);
        dummy.rotation.set(0, seeded(index, part + 95) * Math.PI, 0);
        dummy.updateMatrix();
        if (index % 3 === 0) darkBushes.setMatrixAt(darkOffset++, dummy.matrix);
        else brightBushes.setMatrixAt(brightOffset++, dummy.matrix);
      }
    }
    darkBushes.instanceMatrix.needsUpdate = true;
    brightBushes.instanceMatrix.needsUpdate = true;
    darkBushes.receiveShadow = true;
    brightBushes.receiveShadow = true;
    this.bushMeshes.push(darkBushes, brightBushes);
    this.group.add(darkBushes, brightBushes);
  }

  private createRocksAndBranches(): void {
    for (let index = 0; index < 26; index += 1) {
      const z = THREE.MathUtils.lerp(WORLD_MIN_Z, WORLD_MAX_Z, seeded(index, 105));
      const inRiver = index % 5 === 0;
      const side = index % 2 === 0 ? -1 : 1;
      const x = inRiver
        ? this.riverCenterAt(z) + (seeded(index, 106) - 0.5) * (this.riverWidthAt(z) - 2.4)
        : this.riverCenterAt(z)
          + side * (this.riverWidthAt(z) * 0.5 + 1.45 + seeded(index, 107) * 5.5);
      const radius = 0.46 + seeded(index, 108) * (inRiver ? 0.65 : 0.52);
      const rock = new THREE.Mesh(this.rockGeometry, index % 3 === 0 ? this.stoneWarm : this.stone);
      rock.name = inRiver ? 'RiverRock' : 'ForestRock';
      rock.position.set(x, inRiver ? -0.02 : -0.08, z);
      rock.scale.set(radius * 1.1, radius * (0.62 + seeded(index, 109) * 0.35), radius * 0.86);
      rock.rotation.set(seeded(index, 110), seeded(index, 111) * Math.PI, seeded(index, 112) * 0.25);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.group.add(rock);
      if (inRiver) this.riverGameplayDecor.push(rock);
    }

    for (let index = 0; index < 8; index += 1) {
      const z = THREE.MathUtils.lerp(-35, 37, seeded(index, 120));
      const side = index % 2 === 0 ? -1 : 1;
      const branch = new THREE.Group();
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.8, 8), this.bark);
      log.rotation.z = Math.PI * 0.5;
      branch.add(log);
      const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.2, 6), this.barkLight);
      twig.position.set(0.65, 0.36, 0);
      twig.rotation.z = -0.85;
      branch.add(twig);
      branch.position.set(
        this.riverCenterAt(z)
          + side * (this.riverWidthAt(z) * 0.5 + 2.1 + seeded(index, 121) * 3.8),
        -0.03,
        z,
      );
      branch.rotation.y = seeded(index, 122) * Math.PI;
      setShadows(branch);
      this.group.add(branch);
    }
  }

  private createFlowersAndMushrooms(): void {
    const flowerColors = [0xffdc5c, 0xff8fa8, 0xf5f0ff, 0x8bd7ff];
    const stemGeometry = new THREE.CylinderGeometry(0.018, 0.025, 0.35, 5);
    const centerGeometry = new THREE.SphereGeometry(0.055, 8, 6);
    const petalGeometry = new THREE.SphereGeometry(0.075, 7, 5);
    const stems = new THREE.InstancedMesh(stemGeometry, this.darkGrass, 58);
    const centers = new THREE.InstancedMesh(centerGeometry, makeMaterial(0xffc83d, 0.8), 58);
    const petalsByColor = flowerColors.map((color, colorIndex) => {
      const flowerCount = Array.from({ length: 58 }, (_, index) => index)
        .filter((index) => index % flowerColors.length === colorIndex).length;
      return new THREE.InstancedMesh(petalGeometry, makeMaterial(color, 0.76), flowerCount * 5);
    });
    const petalOffsets = flowerColors.map(() => 0);
    const dummy = new THREE.Object3D();
    for (let index = 0; index < 58; index += 1) {
      const z = THREE.MathUtils.lerp(-38, 40, seeded(index, 130));
      const side = index % 2 === 0 ? -1 : 1;
      const x = this.riverCenterAt(z)
        + side * (this.riverWidthAt(z) * 0.5 + 1.85 + seeded(index, 131) * 5.2);
      const scale = 0.72 + seeded(index, 132) * 0.65;
      dummy.position.set(x, -0.2 + 0.12 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      stems.setMatrixAt(index, dummy.matrix);

      dummy.position.set(x, -0.2 + 0.31 * scale, z);
      dummy.updateMatrix();
      centers.setMatrixAt(index, dummy.matrix);

      const colorIndex = index % flowerColors.length;
      const petalMesh = petalsByColor[colorIndex]!;
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = (petal / 5) * Math.PI * 2;
        dummy.position.set(
          x + Math.cos(angle) * 0.09 * scale,
          -0.2 + 0.31 * scale,
          z + Math.sin(angle) * 0.09 * scale,
        );
        dummy.scale.set(scale, scale * 0.42, scale * 0.7);
        dummy.rotation.set(0, -angle, 0);
        dummy.updateMatrix();
        petalMesh.setMatrixAt(petalOffsets[colorIndex]!, dummy.matrix);
        petalOffsets[colorIndex]! += 1;
      }
    }
    stems.name = 'InstancedFlowerStems';
    centers.name = 'InstancedFlowerCenters';
    stems.instanceMatrix.needsUpdate = true;
    centers.instanceMatrix.needsUpdate = true;
    petalsByColor.forEach((mesh, index) => {
      mesh.name = `InstancedFlowerPetals-${index}`;
      mesh.instanceMatrix.needsUpdate = true;
    });
    this.group.add(stems, centers, ...petalsByColor);

    const mushroomStems = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.08, 0.11, 0.42, 8),
      makeMaterial(0xffe8c0, 0.9),
      16,
    );
    const capGeometry = new THREE.SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const warmCaps = new THREE.InstancedMesh(capGeometry, makeMaterial(0xf18b54, 0.78), 8);
    const redCaps = new THREE.InstancedMesh(capGeometry, makeMaterial(0xe65f52, 0.78), 8);
    let warmIndex = 0;
    let redIndex = 0;
    for (let index = 0; index < 16; index += 1) {
      const z = THREE.MathUtils.lerp(-38, 39, seeded(index, 140));
      const side = index % 2 === 0 ? -1 : 1;
      const x = this.riverCenterAt(z)
        + side * (this.riverWidthAt(z) * 0.5 + 2.9 + seeded(index, 141) * 4.7);
      dummy.position.set(x, -0.05, z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mushroomStems.setMatrixAt(index, dummy.matrix);
      dummy.position.set(x, 0.15, z);
      dummy.scale.set(1, 0.5, 1);
      dummy.rotation.set(0, seeded(index, 142) * Math.PI, 0);
      dummy.updateMatrix();
      if (index % 2) warmCaps.setMatrixAt(warmIndex++, dummy.matrix);
      else redCaps.setMatrixAt(redIndex++, dummy.matrix);
    }
    mushroomStems.instanceMatrix.needsUpdate = true;
    warmCaps.instanceMatrix.needsUpdate = true;
    redCaps.instanceMatrix.needsUpdate = true;
    this.group.add(mushroomStems, warmCaps, redCaps);
  }

  private createReeds(): void {
    const reedMaterial = makeMaterial(0x4f9051, 0.98);
    const headMaterial = makeMaterial(0x7f573b, 0.94);
    const reeds = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.026, 1, 5), reedMaterial, 26 * 6);
    const heads = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.045, 0.18, 4, 6), headMaterial, 26 * 3);
    const dummy = new THREE.Object3D();
    let reedOffset = 0;
    let headOffset = 0;
    for (let cluster = 0; cluster < 26; cluster += 1) {
      const z = THREE.MathUtils.lerp(WORLD_MIN_Z, WORLD_MAX_Z, seeded(cluster, 150));
      const side = cluster % 2 === 0 ? -1 : 1;
      const rootX = (side < 0 ? this.leftWaterEdgeAt(z) : this.rightWaterEdgeAt(z)) + side * 0.35;
      for (let reedIndex = 0; reedIndex < 6; reedIndex += 1) {
        const height = 0.6 + seeded(cluster, reedIndex + 151) * 0.55;
        const x = rootX + (reedIndex - 2.5) * 0.11;
        const reedZ = z + (seeded(cluster, reedIndex + 158) - 0.5) * 0.25;
        dummy.position.set(x, -0.18 + height * 0.5, reedZ);
        dummy.scale.set(1, height, 1);
        dummy.rotation.set(0, 0, (seeded(cluster, reedIndex + 165) - 0.5) * 0.08);
        dummy.updateMatrix();
        reeds.setMatrixAt(reedOffset++, dummy.matrix);
        if (reedIndex % 2 === 0) {
          dummy.position.set(x, -0.16 + height, reedZ);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          heads.setMatrixAt(headOffset++, dummy.matrix);
        }
      }
    }
    reeds.name = 'InstancedRiverReeds';
    heads.name = 'InstancedCattailHeads';
    reeds.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    reeds.castShadow = true;
    reeds.receiveShadow = true;
    this.group.add(reeds, heads);
  }

  private createWaterLife(): void {
    const lilyMaterial = makeMaterial(0x4e9e61, 0.92);
    for (let index = 0; index < 18; index += 1) {
      const z = THREE.MathUtils.lerp(-38, 40, seeded(index, 170));
      const lily = new THREE.Mesh(new THREE.CircleGeometry(0.32 + seeded(index, 171) * 0.24, 20, 0.3, Math.PI * 1.78), lilyMaterial);
      lily.name = 'LilyPad';
      lily.rotation.x = -Math.PI / 2;
      lily.rotation.z = seeded(index, 172) * Math.PI * 2;
      lily.position.set(
        this.riverCenterAt(z) + (seeded(index, 173) - 0.5) * (this.riverWidthAt(z) - 1.8),
        0.12,
        z,
      );
      this.group.add(lily);
      this.riverGameplayDecor.push(lily);
      this.floatingThings.push({ object: lily, phase: seeded(index, 174) * 6, baseY: 0.12 });
      if (index % 4 === 0) {
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 7), makeMaterial(0xffd4de, 0.75));
        bloom.scale.y = 0.55;
        bloom.position.set(0.16, 0.06, 0.02);
        lily.add(bloom);
      }
    }

    for (let index = 0; index < 6; index += 1) {
      const fish = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), makeMaterial(index % 2 ? 0xf2a54a : 0x67c6be, 0.62));
      body.scale.set(1.5, 0.55, 0.62);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 3), makeMaterial(0xf4c05e, 0.7));
      tail.rotation.z = -Math.PI / 2;
      tail.position.x = 0.38;
      fish.add(body, tail);
      fish.visible = false;
      this.group.add(fish);
      this.fish.push({ group: fish, z: THREE.MathUtils.lerp(-32, 32, seeded(index, 180)), phase: index * 1.08 });
    }

    for (let index = 0; index < 5; index += 1) {
      const z = THREE.MathUtils.lerp(-35, 34, seeded(index, 185));
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 2.2, 9), this.bark);
      log.name = 'FloatingLog';
      log.rotation.z = Math.PI / 2;
      log.rotation.y = seeded(index, 186) * 0.6;
      log.position.set(
        this.riverCenterAt(z) + (seeded(index, 187) - 0.5) * (this.riverWidthAt(z) - 3),
        0.17,
        z,
      );
      this.group.add(log);
      this.riverGameplayDecor.push(log);
      this.floatingThings.push({ object: log, phase: seeded(index, 188) * 6, baseY: 0.17 });
    }
  }

  private createButterflies(): void {
    const colors = [0xffc94c, 0xff82a8, 0x8fd7ff, 0xe6a6ff];
    for (let index = 0; index < 10; index += 1) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.12, 3, 6), makeMaterial(0x503d36, 0.88));
      body.rotation.x = Math.PI / 2;
      const wingMaterial = new THREE.MeshStandardMaterial({
        color: colors[index % colors.length],
        roughness: 0.7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      });
      const leftWing = new THREE.Mesh(new THREE.CircleGeometry(0.17, 12), wingMaterial);
      leftWing.position.x = -0.13;
      leftWing.scale.set(1, 1.35, 1);
      const rightWing = leftWing.clone();
      rightWing.position.x = 0.13;
      group.add(body, leftWing, rightWing);
      const z = THREE.MathUtils.lerp(-22, 27, seeded(index, 200));
      const side = index % 2 === 0 ? -1 : 1;
      const origin = new THREE.Vector3(
        this.riverCenterAt(z)
          + side * (this.riverWidthAt(z) * 0.5 + 2.05 + seeded(index, 201) * 3),
        1.1 + seeded(index, 202) * 1.5,
        z,
      );
      group.position.copy(origin);
      this.group.add(group);
      this.butterflies.push({ group, leftWing, rightWing, origin, phase: seeded(index, 203) * Math.PI * 2 });
    }
  }

  private createBirds(): void {
    const birdMaterial = makeMaterial(0x3d5960, 0.86);
    for (let index = 0; index < 5; index += 1) {
      const group = new THREE.Group();
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.65, 3), birdMaterial);
        wing.rotation.x = Math.PI / 2;
        wing.rotation.z = side * 0.25;
        wing.position.x = side * 0.28;
        group.add(wing);
      }
      group.scale.setScalar(0.75 + index * 0.06);
      this.group.add(group);
      this.birds.push({ group, phase: index * 1.3, radius: 16 + index * 2.2 });
    }
  }

  private createRibbonGeometry(
    leftAt: (z: number) => number,
    rightAt: (z: number) => number,
    y: number,
  ): THREE.BufferGeometry {
    const segments = 96;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let index = 0; index <= segments; index += 1) {
      const t = index / segments;
      const z = THREE.MathUtils.lerp(WORLD_MIN_Z, WORLD_MAX_Z, t);
      positions.push(leftAt(z), y, z, rightAt(z), y, z);
      uvs.push(0, t * 8, 1, t * 8);
      if (index === segments) continue;
      const root = index * 2;
      indices.push(root, root + 2, root + 1, root + 2, root + 3, root + 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
}
