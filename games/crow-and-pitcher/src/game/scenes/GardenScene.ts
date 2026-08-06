import * as THREE from 'three';
import { AncientTree } from './assets/AncientTree';
import { createFence } from './assets/FieldAssets';
import { StoneWall } from './assets/StoneWall';
import { type SceneryZone, StorybookScenery } from './assets/StorybookScenery';
import { SunnySky } from './assets/SunnySky';
import { WoodenCart } from './assets/WoodenCart';
import { PITCHER_POSITION } from '../worldLayout';

const ZONES: SceneryZone[] = ['olive-grove', 'wildflower-meadow', 'rocky-field', 'cart-trail', 'garden-outskirts'];

const createDistantMaterial = (color: THREE.ColorRepresentation): THREE.MeshStandardMaterial => {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 1 });
  // Distant silhouettes need enough saturation to survive the global
  // storybook palette pass and the remaining atmospheric fog.
  material.userData.paletteSaturationScale = 0.92;
  return material;
};

export class GardenScene {
  readonly group = new THREE.Group();
  private readonly sky = new SunnySky();
  private readonly scenery = new StorybookScenery();
  private readonly sceneryLayer = new THREE.Group();
  private readonly distantLayer = new THREE.Group();
  private readonly sceneryTiles = new Map<string, THREE.Group>();
  private readonly distantTiles = new Map<string, THREE.Group>();
  private readonly sceneryTileSize = 22;
  private readonly sceneryRadius = 2;
  private readonly distantRadius = 3;
  private lastSceneryCellX = Number.NaN;
  private lastSceneryCellZ = Number.NaN;
  private elapsed = 0;

  private readonly worldGeometry = {
    hill: new THREE.SphereGeometry(1, 18, 9),
    distantTrunk: new THREE.CylinderGeometry(0.12, 0.18, 1, 6),
    distantCrown: new THREE.DodecahedronGeometry(0.75, 0),
    fencePost: new THREE.BoxGeometry(0.13, 1, 0.13),
    fenceRail: new THREE.BoxGeometry(1, 0.09, 0.09),
    cottage: new THREE.BoxGeometry(1, 1, 1),
    roof: new THREE.ConeGeometry(0.86, 0.62, 4),
  };

  private readonly worldMaterial = {
    distantHills: [0x607966, 0x6f8067, 0x526e63].map(createDistantMaterial),
    distantTrees: [0x365943, 0x48664b, 0x587254].map(createDistantMaterial),
    distantWood: createDistantMaterial(0x76543a),
    distantStructure: createDistantMaterial(0x9a7957),
    distantRoof: createDistantMaterial(0x70493d),
  };

  constructor() {
    this.group.name = 'Sunny_Summer_World';
    this.sceneryLayer.name = 'Infinite_Themed_Scenery';
    this.distantLayer.name = 'Streamed_Distant_Landscape';
    this.group.add(this.sky.group, this.sceneryLayer, this.distantLayer);
    this.createGround();
    this.createLandmarks();
    this.createStoryClearingDetails();
    this.updateSceneryTiles(new THREE.Vector3());
  }

  dispose(): void {
    this.sceneryTiles.clear();
    this.distantTiles.clear();
    this.sceneryLayer.clear();
    this.distantLayer.clear();
    this.scenery.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      geometries.add(child.geometry);
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
      meshMaterials.forEach((material) => materials.add(material));
    });
    Object.values(this.worldGeometry).forEach((geometry) => geometries.add(geometry));
    Object.values(this.worldMaterial).forEach((value) => {
      if (Array.isArray(value)) value.forEach((material) => materials.add(material));
      else materials.add(value as THREE.Material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }

  update(position: THREE.Vector3, delta: number, reducedMotion: boolean): void {
    this.elapsed += delta;
    this.sky.group.position.set(position.x, 0, position.z);
    this.sky.update(delta, reducedMotion);
    this.updateSceneryTiles(position);
    this.updateAmbientMotion(reducedMotion);
  }

  private createGround(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(10000, 10000),
      new THREE.MeshStandardMaterial({ color: 0xcba267, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  private createLandmarks(): void {
    const tree = new AncientTree();
    tree.position.set(-10.5, 0, -15.5);
    tree.scale.setScalar(0.82);

    const wall = new StoneWall(17);
    wall.position.set(1.5, 0, -21.8);

    const cart = new WoodenCart();
    cart.position.set(10, 0, -18.7);
    cart.scale.setScalar(0.82);

    const leftFence = createFence(21);
    leftFence.position.set(-10.5, 0, 9);
    leftFence.rotation.y = Math.PI / 2;
    const rightFence = createFence(21);
    rightFence.position.set(10.5, 0, 9);
    rightFence.rotation.y = Math.PI / 2;
    this.group.add(tree, wall, cart, leftFence, rightFence);

    const cartRandom = this.createRandom(81, -37);
    const sacks = [this.scenery.createSack(cartRandom), this.scenery.createSack(cartRandom)];
    sacks[0].position.set(7.8, 0, -19.4);
    sacks[1].position.set(8.45, 0, -20.05);
    sacks[1].scale.setScalar(0.8);
    const tool = this.scenery.createFarmTool(cartRandom);
    tool.position.set(12.1, 0, -19.9);
    const branch = this.scenery.createFallenBranch(cartRandom);
    branch.position.set(-8.1, 0, -13.7);
    this.group.add(...sacks, tool, branch);
  }

  private createStoryClearingDetails(): void {
    const random = this.createRandom(12, 45);
    const details: Array<{ object: THREE.Group; x: number; z: number; scale?: number }> = [
      { object: this.scenery.createFloweringHerbs(random), x: -7.5, z: 18.5, scale: 0.92 },
      { object: this.scenery.createShrub(random, 3), x: 7.7, z: 17.2, scale: 0.82 },
      { object: this.scenery.createStoneCairn(random, true), x: -11.5, z: 10.8, scale: 0.72 },
      { object: this.scenery.createReeds(random), x: 12.2, z: 7.5, scale: 0.88 },
      { object: this.scenery.createClayFragments(random), x: -8.8, z: -3.2 },
      { object: this.scenery.createStump(random), x: 11.2, z: -8.5, scale: 0.82 },
      { object: this.scenery.createNest(random), x: -15.2, z: -7.8, scale: 0.86 },
    ];
    details.forEach(({ object, x, z, scale = 1 }, index) => {
      object.position.set(x, 0, z);
      object.rotation.y = index * 1.17;
      object.scale.multiplyScalar(scale);
      this.group.add(object);
    });
  }

  private updateSceneryTiles(position: THREE.Vector3): void {
    const cellX = Math.floor(position.x / this.sceneryTileSize);
    const cellZ = Math.floor(position.z / this.sceneryTileSize);
    if (cellX === this.lastSceneryCellX && cellZ === this.lastSceneryCellZ) return;
    this.lastSceneryCellX = cellX;
    this.lastSceneryCellZ = cellZ;

    const required = new Set<string>();
    for (let offsetX = -this.sceneryRadius; offsetX <= this.sceneryRadius; offsetX += 1) {
      for (let offsetZ = -this.sceneryRadius; offsetZ <= this.sceneryRadius; offsetZ += 1) {
        const tileX = cellX + offsetX;
        const tileZ = cellZ + offsetZ;
        const key = `${tileX}:${tileZ}`;
        required.add(key);
        if (this.sceneryTiles.has(key)) continue;
        const tile = this.createSceneryTile(tileX, tileZ);
        this.sceneryTiles.set(key, tile);
        this.sceneryLayer.add(tile);
      }
    }
    for (const [key, tile] of this.sceneryTiles) {
      if (required.has(key)) continue;
      tile.removeFromParent();
      this.sceneryTiles.delete(key);
    }
    this.updateDistantTiles(cellX, cellZ);
  }

  private createSceneryTile(tileX: number, tileZ: number): THREE.Group {
    const tile = new THREE.Group();
    const zone = this.getZone(tileX, tileZ);
    tile.name = `Scenery_Tile_${tileX}_${tileZ}_${zone}`;
    tile.userData.zone = zone;
    tile.position.set(tileX * this.sceneryTileSize, 0, tileZ * this.sceneryTileSize);
    const random = this.createRandom(tileX, tileZ);

    const add = (detail: THREE.Group, scale = 1): void => {
      for (let attempt = 0; attempt < 7; attempt += 1) {
        const localX = (random() - 0.5) * (this.sceneryTileSize - 3.2);
        const localZ = (random() - 0.5) * (this.sceneryTileSize - 3.2);
        if (this.isReservedStorySpace(tile.position.x + localX, tile.position.z + localZ)) continue;
        detail.position.x += localX;
        detail.position.z += localZ;
        detail.rotation.y += random() * Math.PI * 2;
        detail.scale.multiplyScalar(scale * (0.86 + random() * 0.3));
        tile.add(detail);
        return;
      }
    };

    switch (zone) {
      case 'olive-grove': {
        const treeCount = 3 + Math.floor(random() * 3);
        for (let index = 0; index < treeCount; index += 1) add(this.scenery.createSmallTree(random, 'olive'), 0.88);
        for (let index = 0; index < 2; index += 1) add(this.scenery.createShrub(random, index + 1), 0.78);
        add(random() > 0.5 ? this.scenery.createFallenBranch(random) : this.scenery.createNest(random), 0.82);
        add(this.scenery.createDriftingLeaf(random));
        if (random() > 0.45) add(this.scenery.createDriftingLeaf(random), 0.86);
        break;
      }
      case 'wildflower-meadow':
        for (let index = 0; index < 7; index += 1) {
          add(index % 3 === 0 ? this.scenery.createReeds(random) : this.scenery.createFloweringHerbs(random), 0.68 + random() * 0.22);
        }
        add(this.scenery.createButterfly(random));
        if (random() > 0.38) add(this.scenery.createButterfly(random), 0.9);
        break;
      case 'rocky-field':
        for (let index = 0; index < 5; index += 1) add(this.scenery.createStoneCairn(random, index < 2), 0.78 + random() * 0.35);
        add(this.scenery.createStump(random));
        add(this.scenery.createFallenBranch(random), 0.82);
        add(this.scenery.createDustMote(random));
        break;
      case 'cart-trail':
        add(this.scenery.createHayRoll(random), 0.9);
        add(this.scenery.createSack(random), 0.9);
        add(random() > 0.5 ? this.scenery.createFarmTool(random) : this.scenery.createStump(random));
        for (let index = 0; index < 3; index += 1) add(index % 2 ? this.scenery.createReeds(random) : this.scenery.createShrub(random, index), 0.72);
        add(this.scenery.createDustMote(random));
        break;
      case 'garden-outskirts':
        for (let index = 0; index < 5; index += 1) {
          add(index % 2 ? this.scenery.createFloweringHerbs(random) : this.scenery.createShrub(random, index), 0.72 + random() * 0.2);
        }
        add(this.scenery.createSmallTree(random, random() > 0.55 ? 'slender' : 'round'), 0.78);
        add(this.scenery.createClayFragments(random), 0.82);
        if (random() > 0.48) add(this.scenery.createButterfly(random), 0.85);
        break;
    }
    return tile;
  }

  private updateDistantTiles(cellX: number, cellZ: number): void {
    const required = new Set<string>();
    for (let offsetX = -this.distantRadius; offsetX <= this.distantRadius; offsetX += 1) {
      for (let offsetZ = -this.distantRadius; offsetZ <= this.distantRadius; offsetZ += 1) {
        if (Math.max(Math.abs(offsetX), Math.abs(offsetZ)) !== this.distantRadius) continue;
        const tileX = cellX + offsetX;
        const tileZ = cellZ + offsetZ;
        const key = `${tileX}:${tileZ}`;
        required.add(key);
        if (this.distantTiles.has(key)) continue;
        const tile = this.createDistantTile(tileX, tileZ);
        this.distantTiles.set(key, tile);
        this.distantLayer.add(tile);
      }
    }
    for (const [key, tile] of this.distantTiles) {
      if (required.has(key)) continue;
      tile.removeFromParent();
      this.distantTiles.delete(key);
    }
  }

  private createDistantTile(tileX: number, tileZ: number): THREE.Group {
    const tile = new THREE.Group();
    tile.name = `Distant_Tile_${tileX}_${tileZ}`;
    tile.position.set(tileX * this.sceneryTileSize, 0, tileZ * this.sceneryTileSize);
    const random = this.createRandom(tileX + 311, tileZ - 127);

    const hill = new THREE.Mesh(
      this.worldGeometry.hill,
      this.worldMaterial.distantHills[Math.floor(random() * this.worldMaterial.distantHills.length)],
    );
    hill.position.set((random() - 0.5) * 10, -3.4 - random() * 0.8, (random() - 0.5) * 8);
    hill.scale.set(8 + random() * 6, 3.8 + random() * 1.7, 7 + random() * 5);
    hill.receiveShadow = true;
    tile.add(hill);

    const treeCount = 2 + Math.floor(random() * 4);
    for (let index = 0; index < treeCount; index += 1) {
      const silhouette = new THREE.Group();
      const height = 2.4 + random() * 2.4;
      const trunk = new THREE.Mesh(this.worldGeometry.distantTrunk, this.worldMaterial.distantWood);
      trunk.scale.y = height;
      trunk.position.y = height * 0.5;
      const crown = new THREE.Mesh(
        this.worldGeometry.distantCrown,
        this.worldMaterial.distantTrees[index % this.worldMaterial.distantTrees.length],
      );
      crown.position.y = height + 0.35;
      crown.scale.set(1.15 + random() * 0.8, 0.9 + random() * 0.55, 1.05 + random() * 0.6);
      silhouette.add(trunk, crown);
      silhouette.position.set((random() - 0.5) * 16, 0, (random() - 0.5) * 9);
      tile.add(silhouette);
    }

    if (random() > 0.67) this.addDistantFence(tile, random);
    if (random() > 0.8) this.addDistantStructure(tile, random);
    return tile;
  }

  private addDistantFence(tile: THREE.Group, random: () => number): void {
    const fence = new THREE.Group();
    const length = 5 + Math.floor(random() * 4);
    for (let index = 0; index < length; index += 1) {
      const post = new THREE.Mesh(this.worldGeometry.fencePost, this.worldMaterial.distantWood);
      post.position.set(index * 1.45, 0.5, 0);
      fence.add(post);
      if (index === length - 1) continue;
      const rail = new THREE.Mesh(this.worldGeometry.fenceRail, this.worldMaterial.distantWood);
      rail.scale.x = 1.48;
      rail.position.set(index * 1.45 + 0.72, 0.64, 0);
      fence.add(rail);
    }
    fence.position.set((random() - 0.5) * 12, 0, (random() - 0.5) * 7);
    fence.rotation.y = random() * Math.PI;
    fence.scale.setScalar(0.82);
    tile.add(fence);
  }

  private addDistantStructure(tile: THREE.Group, random: () => number): void {
    const structure = new THREE.Group();
    const cottage = new THREE.Mesh(this.worldGeometry.cottage, this.worldMaterial.distantStructure);
    cottage.scale.set(2.2 + random(), 1.6 + random() * 0.4, 1.8 + random() * 0.5);
    cottage.position.y = cottage.scale.y * 0.5;
    const roof = new THREE.Mesh(this.worldGeometry.roof, this.worldMaterial.distantRoof);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(2.2, 1, 1.85);
    roof.position.y = cottage.scale.y + 0.3;
    structure.add(cottage, roof);
    structure.position.set((random() - 0.5) * 13, 0, (random() - 0.5) * 7);
    structure.rotation.y = random() * Math.PI;
    tile.add(structure);
  }

  private updateAmbientMotion(reducedMotion: boolean): void {
    const motionScale = reducedMotion ? 0.14 : 1;
    this.group.traverse((object) => {
      const kind = object.userData.ambientMotion as 'sway' | 'butterfly' | 'leaf' | 'dust' | undefined;
      if (!kind) return;
      if (!object.userData.motionOrigin) {
        object.userData.motionOrigin = object.position.clone();
        object.userData.motionBaseRotation = object.rotation.clone();
      }
      const origin = object.userData.motionOrigin as THREE.Vector3;
      const baseRotation = object.userData.motionBaseRotation as THREE.Euler;
      const phase = object.userData.motionPhase as number;
      const speed = object.userData.motionSpeed as number;
      const amplitude = object.userData.motionAmplitude as number;
      const time = this.elapsed * speed + phase;

      if (kind === 'sway') {
        object.rotation.z = baseRotation.z + Math.sin(time) * amplitude * motionScale;
        object.rotation.x = baseRotation.x + Math.cos(time * 0.71) * amplitude * 0.42 * motionScale;
        return;
      }
      if (kind === 'butterfly') {
        object.position.x = origin.x + Math.sin(time * 0.9) * amplitude * motionScale;
        object.position.z = origin.z + Math.cos(time * 0.67) * amplitude * 0.55 * motionScale;
        object.position.y = origin.y + Math.sin(time * 1.6) * 0.18 * motionScale;
        object.rotation.y = baseRotation.y + Math.sin(time * 0.53) * 0.8 * motionScale;
        object.children.forEach((wing) => {
          const side = wing.userData.wingSide as number | undefined;
          if (!side) return;
          wing.rotation.y = side * (0.4 + Math.sin(time * 4.2) * 0.3 * motionScale);
        });
        return;
      }
      if (kind === 'leaf') {
        object.position.x = origin.x + Math.sin(time) * amplitude * motionScale;
        object.position.z = origin.z + Math.cos(time * 0.74) * amplitude * 0.4 * motionScale;
        object.position.y = origin.y + Math.sin(time * 0.58) * 0.16 * motionScale;
        object.rotation.set(baseRotation.x + time * 0.18 * motionScale, baseRotation.y + time * 0.24 * motionScale, baseRotation.z + Math.sin(time) * 0.5 * motionScale);
        return;
      }
      object.position.x = origin.x + Math.sin(time * 0.53) * amplitude * motionScale;
      object.position.y = origin.y + (0.08 + Math.sin(time * 0.72) * 0.1) * motionScale;
      object.position.z = origin.z + Math.cos(time * 0.47) * amplitude * 0.7 * motionScale;
    });
  }

  private getZone(tileX: number, tileZ: number): SceneryZone {
    if (tileX === 0 && tileZ === -1) return 'garden-outskirts';
    const zoneX = Math.floor(tileX / 2);
    const zoneZ = Math.floor(tileZ / 2);
    const random = this.createRandom(zoneX + 901, zoneZ - 503);
    return ZONES[Math.floor(random() * ZONES.length)];
  }

  private isReservedStorySpace(x: number, z: number): boolean {
    const nearPitcher = Math.hypot(x - PITCHER_POSITION.x, z - PITCHER_POSITION.z) < 8.5;
    const nearAncientTree = Math.hypot(x + 10.5, z + 15.5) < 6.5;
    const nearCart = Math.hypot(x - 10, z + 18.7) < 5.2;
    const openingPath = Math.abs(x) < 4.4 && z > -8 && z < 28;
    return nearPitcher || nearAncientTree || nearCart || openingPath;
  }

  private createRandom(tileX: number, tileZ: number): () => number {
    let state = (Math.imul(tileX, 73856093) ^ Math.imul(tileZ, 19349663) ^ 0x6d2b79f5) >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }
}
