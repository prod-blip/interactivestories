import * as THREE from 'three';
import { ForestAssets } from './ForestAssets';

const TILE_SIZE = 34;
const GRID_RADIUS = 2;
const TILE_COUNT = (GRID_RADIUS * 2 + 1) ** 2;

type ForestTile = {
  tileX: number;
  tileZ: number;
  root: THREE.Group;
  trees: THREE.Group[];
  plants: THREE.Group[];
};

export class InfiniteForest {
  readonly group = new THREE.Group();
  private readonly assets = new ForestAssets();
  private readonly tiles: ForestTile[] = [];
  private readonly grassMaterial = this.assets.material(0x68ad35, 0.98);
  private readonly grassPatchMaterials = [
    this.assets.material(0x529d31, 1),
    this.assets.material(0x80bd3d, 1),
    this.assets.material(0x478f2c, 1),
  ];
  private readonly groundGeometry = new THREE.PlaneGeometry(TILE_SIZE + 0.15, TILE_SIZE + 0.15, 1, 1);
  private readonly horizonGeometry = new THREE.PlaneGeometry(360, 360, 1, 1);
  private readonly horizonGround = new THREE.Mesh(this.horizonGeometry, this.grassMaterial);
  private readonly patchGeometry = new THREE.CircleGeometry(1, 18);
  private centerTileX = Number.NaN;
  private centerTileZ = Number.NaN;
  private swayTime = 0;

  constructor() {
    this.groundGeometry.rotateX(-Math.PI / 2);
    this.horizonGeometry.rotateX(-Math.PI / 2);
    this.horizonGround.position.y = -0.025;
    this.horizonGround.receiveShadow = true;
    this.group.add(this.horizonGround);
    for (let slot = 0; slot < TILE_COUNT; slot += 1) {
      const tile: ForestTile = {
        tileX: Number.NaN,
        tileZ: Number.NaN,
        root: new THREE.Group(),
        trees: [],
        plants: [],
      };
      this.tiles.push(tile);
      this.group.add(tile.root);
    }
    this.update(0, 0, true);
  }

  update(viewerX: number, viewerZ: number, force = false): void {
    const nextTileX = Math.round(viewerX / TILE_SIZE);
    const nextTileZ = Math.round(viewerZ / TILE_SIZE);
    if (!force && nextTileX === this.centerTileX && nextTileZ === this.centerTileZ) return;
    this.centerTileX = nextTileX;
    this.centerTileZ = nextTileZ;
    this.horizonGround.position.set(viewerX, -0.025, viewerZ);

    const needed = new Map<string, [number, number]>();
    for (let z = nextTileZ - GRID_RADIUS; z <= nextTileZ + GRID_RADIUS; z += 1) {
      for (let x = nextTileX - GRID_RADIUS; x <= nextTileX + GRID_RADIUS; x += 1) {
        needed.set(`${x}:${z}`, [x, z]);
      }
    }
    const available = this.tiles.filter((tile) => !needed.has(`${tile.tileX}:${tile.tileZ}`));

    for (const [key, [tileX, tileZ]] of needed) {
      if (this.tiles.some((tile) => `${tile.tileX}:${tile.tileZ}` === key)) continue;
      const tile = available.shift();
      if (tile) this.populate(tile, tileX, tileZ);
    }
  }

  animate(delta: number): void {
    this.swayTime += delta;
    for (const tile of this.tiles) {
      for (const tree of tile.trees) {
        const phase = tree.userData.swayPhase as number;
        const strength = tree.userData.swayStrength as number;
        tree.rotation.z = tree.userData.baseTiltZ + Math.sin(this.swayTime * 0.72 + phase) * strength;
        tree.rotation.x = tree.userData.baseTiltX + Math.cos(this.swayTime * 0.58 + phase * 1.3) * strength * 0.55;
      }
      for (const plant of tile.plants) {
        const phase = plant.userData.swayPhase as number;
        const strength = plant.userData.swayStrength as number;
        plant.rotation.x = plant.userData.baseTiltX
          + Math.cos(this.swayTime * 0.76 + phase * 1.17) * strength * 0.45;
        plant.rotation.z = plant.userData.baseTiltZ
          + Math.sin(this.swayTime * 0.92 + phase) * strength;
      }
    }
  }

  dispose(): void {
    this.groundGeometry.dispose();
    this.horizonGeometry.dispose();
    this.patchGeometry.dispose();
    this.assets.dispose();
  }

  private populate(tile: ForestTile, tileX: number, tileZ: number): void {
    tile.root.clear();
    tile.trees.length = 0;
    tile.plants.length = 0;
    tile.tileX = tileX;
    tile.tileZ = tileZ;
    const centerX = tileX * TILE_SIZE;
    const centerZ = tileZ * TILE_SIZE;
    tile.root.position.set(centerX, 0, centerZ);
    const random = mulberry32(hash2(tileX, tileZ));

    const ground = new THREE.Mesh(this.groundGeometry, this.grassMaterial);
    ground.receiveShadow = true;
    tile.root.add(ground);

    this.addGroundVariation(tile.root, centerX, centerZ, random);
    this.addRocks(tile.root, centerX, centerZ, random);
    this.addPlants(tile.root, centerX, centerZ, random, tile.plants);
    this.addForest(tile.root, centerX, centerZ, random, tile.trees);
  }

  private addForest(
    root: THREE.Group,
    centerX: number,
    centerZ: number,
    random: () => number,
    trees: THREE.Group[],
  ): void {
    for (let i = 0; i < 7; i += 1) {
      const placement = this.placement(centerX, centerZ, random);
      const scale = 0.8 + random() * 0.62;
      const tree = random() < 0.24 ? this.assets.pineTree(random, scale) : this.assets.tree(random, scale);
      tree.position.set(placement.x - centerX, 0, placement.z - centerZ);
      tree.rotation.y = random() * Math.PI * 2;
      tree.userData.baseTiltX = tree.rotation.x;
      tree.userData.baseTiltZ = tree.rotation.z;
      tree.userData.swayPhase = random() * Math.PI * 2;
      tree.userData.swayStrength = 0.006 + random() * 0.008;
      root.add(tree);
      trees.push(tree);
    }
  }

  private addPlants(
    root: THREE.Group,
    centerX: number,
    centerZ: number,
    random: () => number,
    plants: THREE.Group[],
  ): void {
    const registerSway = (plant: THREE.Group, strength: number) => {
      plant.userData.baseTiltX = plant.rotation.x;
      plant.userData.baseTiltZ = plant.rotation.z;
      plant.userData.swayPhase = random() * Math.PI * 2;
      plant.userData.swayStrength = strength;
      plants.push(plant);
    };

    for (let i = 0; i < 9; i += 1) {
      const placement = this.placement(centerX, centerZ, random);
      const bush = this.assets.bush(random, 0.42 + random() * 0.68);
      bush.position.set(placement.x - centerX, 0, placement.z - centerZ);
      bush.rotation.y = random() * Math.PI * 2;
      registerSway(bush, 0.004 + random() * 0.004);
      root.add(bush);
    }
    for (let i = 0; i < 19; i += 1) {
      const placement = this.placement(centerX, centerZ, random);
      const flower = this.assets.flower(random, 0.42 + random() * 0.76);
      flower.position.set(placement.x - centerX, 0.02, placement.z - centerZ);
      flower.rotation.y = random() * Math.PI * 2;
      registerSway(flower, 0.012 + random() * 0.009);
      root.add(flower);
    }
    for (let i = 0; i < 29; i += 1) {
      const placement = this.placement(centerX, centerZ, random);
      const tuft = this.assets.grassTuft(random, 0.72 + random() * 1.2);
      tuft.position.set(placement.x - centerX, 0.02, placement.z - centerZ);
      tuft.rotation.y = random() * Math.PI * 2;
      if (i % 3 === 0) registerSway(tuft, 0.01 + random() * 0.007);
      root.add(tuft);
    }
    for (let cluster = 0; cluster < 2; cluster += 1) {
      const placement = this.placement(centerX, centerZ, random);
      for (let i = 0; i < 3; i += 1) {
        const mushroom = this.assets.mushroom(random, 0.62 + random() * 0.72);
        mushroom.position.set(
          placement.x - centerX + (i - 1) * 0.7,
          0,
          placement.z - centerZ + (random() - 0.5) * 1.5,
        );
        root.add(mushroom);
      }
    }

    const twigMaterial = this.assets.material(0x6d421f, 0.98);
    const leafMaterials = [
      this.assets.material(0xa96b2c, 0.98),
      this.assets.material(0xd59a32, 0.96),
      this.assets.material(0x8f7e31, 0.98),
    ];
    for (let index = 0; index < 4; index += 1) {
      const placement = this.placement(centerX, centerZ, random);
      const twig = new THREE.Mesh(this.assets.unitCylinder, twigMaterial);
      twig.scale.set(0.04 + random() * 0.025, 0.38 + random() * 0.45, 0.04 + random() * 0.025);
      twig.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.2;
      twig.rotation.y = random() * Math.PI * 2;
      twig.position.set(placement.x - centerX, 0.075, placement.z - centerZ);
      twig.castShadow = true;
      root.add(twig);
    }
    for (let index = 0; index < 10; index += 1) {
      const placement = this.placement(centerX, centerZ, random);
      const leaf = new THREE.Mesh(
        this.assets.softBlob,
        leafMaterials[Math.floor(random() * leafMaterials.length)],
      );
      leaf.scale.set(0.09 + random() * 0.12, 0.01, 0.14 + random() * 0.18);
      leaf.position.set(placement.x - centerX, 0.04, placement.z - centerZ);
      leaf.rotation.y = random() * Math.PI * 2;
      root.add(leaf);
    }
  }

  private addRocks(root: THREE.Group, centerX: number, centerZ: number, random: () => number): void {
    for (let i = 0; i < 3; i += 1) {
      const placement = this.placement(centerX, centerZ, random);
      const rock = this.assets.rock(random, i === 0 ? 0.8 + random() * 0.8 : 0.18 + random() * 0.42);
      rock.position.x = placement.x - centerX;
      rock.position.z = placement.z - centerZ;
      root.add(rock);
    }
  }

  private addGroundVariation(root: THREE.Group, centerX: number, centerZ: number, random: () => number): void {
    for (let i = 0; i < 7; i += 1) {
      const placement = this.placement(centerX, centerZ, random);
      const patch = new THREE.Mesh(
        this.patchGeometry,
        this.grassPatchMaterials[Math.floor(random() * this.grassPatchMaterials.length)],
      );
      patch.rotation.x = -Math.PI / 2;
      patch.rotation.z = random() * Math.PI;
      patch.scale.set(1.3 + random() * 3.8, 0.7 + random() * 1.8, 1);
      patch.position.set(
        placement.x - centerX,
        0.018,
        placement.z - centerZ,
      );
      root.add(patch);
    }
  }

  private placement(
    centerX: number,
    centerZ: number,
    random: () => number,
  ): { x: number; z: number } {
    let x = centerX;
    let z = centerZ;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      x = centerX + (random() - 0.5) * (TILE_SIZE - 2);
      z = centerZ + (random() - 0.5) * (TILE_SIZE - 2);
      if (Math.hypot(x, z + 10) > 7.5) break;
    }
    return { x, z };
  }
}

function hash2(x: number, z: number): number {
  let result = Math.imul(x | 0, 0x1f123bb5) ^ Math.imul(z | 0, 0x5f356495);
  result = Math.imul(result ^ (result >>> 16), 0x45d9f3b);
  result = Math.imul(result ^ (result >>> 16), 0x45d9f3b);
  return (result ^ (result >>> 16)) >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
