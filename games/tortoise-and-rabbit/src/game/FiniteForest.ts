import { refreshInstancedMeshBounds } from '@moonlit/story-rendering';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ForestAssets } from './ForestAssets';

const CELL_SIZE = 34;
const CELL_RADIUS = 1;
const WORLD_SIZE = CELL_SIZE * (CELL_RADIUS * 2 + 1);
const CELL_COUNT = (CELL_RADIUS * 2 + 1) ** 2;

type BatchName = 'tree' | 'pine' | 'bush' | 'flower' | 'grass' | 'mushroom' | 'rock' | 'twig' | 'leaf' | 'patch';

type ForestBatch = {
  mesh: THREE.InstancedMesh;
  cursor: number;
};

type Transform = {
  x: number;
  y: number;
  z: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
};

/**
 * A fixed forest for the opening chapters. The race uses RaceClearing, so this
 * world never needs to follow the camera or recycle scenery at runtime.
 */
export class FiniteForest {
  readonly group = new THREE.Group();
  private readonly assets = new ForestAssets();
  private readonly grassMaterial = this.assets.material(0x68ad35, 0.98);
  private readonly groundGeometry = new THREE.PlaneGeometry(WORLD_SIZE + 0.2, WORLD_SIZE + 0.2, 1, 1);
  private readonly horizonGeometry = new THREE.PlaneGeometry(360, 360, 1, 1);
  private readonly patchGeometry = new THREE.CircleGeometry(1, 14);
  private readonly windTime = { value: 0 };
  private readonly windMaterial = this.createWindMaterial();
  private readonly plainMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9 });
  private readonly templateGeometries: Record<'tree' | 'pine' | 'bush' | 'flower' | 'grass' | 'mushroom', THREE.BufferGeometry>;
  private readonly transform = new THREE.Object3D();
  private readonly batches: Record<BatchName, ForestBatch>;
  private swayTime = 0;

  constructor() {
    this.group.name = 'FiniteOpeningForest';
    this.groundGeometry.rotateX(-Math.PI / 2);
    this.horizonGeometry.rotateX(-Math.PI / 2);

    const horizonGround = new THREE.Mesh(this.horizonGeometry, this.grassMaterial);
    horizonGround.name = 'FogHorizonGround';
    horizonGround.position.y = -0.025;
    horizonGround.receiveShadow = true;
    horizonGround.frustumCulled = true;

    const ground = new THREE.Mesh(this.groundGeometry, this.grassMaterial);
    ground.name = 'FiniteForestGround';
    ground.receiveShadow = true;
    ground.frustumCulled = true;
    this.group.add(horizonGround, ground);

    this.templateGeometries = {
      tree: this.mergeTemplate(this.assets.tree(mulberry32(101), 1)),
      pine: this.mergeTemplate(this.assets.pineTree(mulberry32(202), 1)),
      bush: this.mergeTemplate(this.assets.bush(mulberry32(303), 1)),
      flower: this.mergeTemplate(this.assets.flower(mulberry32(404), 1)),
      grass: this.mergeTemplate(this.assets.grassTuft(mulberry32(505), 1)),
      mushroom: this.mergeTemplate(this.assets.mushroom(mulberry32(606), 1)),
    };

    this.batches = {
      tree: this.createBatch('Trees', this.templateGeometries.tree, this.windMaterial, 7 * CELL_COUNT, true),
      pine: this.createBatch('Pines', this.templateGeometries.pine, this.windMaterial, 7 * CELL_COUNT, true),
      bush: this.createBatch('Bushes', this.templateGeometries.bush, this.windMaterial, 9 * CELL_COUNT),
      flower: this.createBatch('Flowers', this.templateGeometries.flower, this.windMaterial, 19 * CELL_COUNT),
      grass: this.createBatch('GrassTufts', this.templateGeometries.grass, this.windMaterial, 29 * CELL_COUNT),
      mushroom: this.createBatch('Mushrooms', this.templateGeometries.mushroom, this.plainMaterial, 6 * CELL_COUNT),
      rock: this.createBatch('Rocks', this.assets.stone, this.assets.material(0x829184, 1), 3 * CELL_COUNT),
      twig: this.createBatch('Twigs', this.assets.unitCylinder, this.assets.material(0x6d421f, 0.98), 4 * CELL_COUNT),
      leaf: this.createBatch('FallenLeaves', this.assets.softBlob, this.assets.material(0xa67831, 0.98), 10 * CELL_COUNT),
      patch: this.createBatch('GroundPatches', this.patchGeometry, this.assets.material(0x529d31, 1), 7 * CELL_COUNT),
    };
    Object.values(this.batches).forEach(({ mesh }) => this.group.add(mesh));

    for (let cellZ = -CELL_RADIUS; cellZ <= CELL_RADIUS; cellZ += 1) {
      for (let cellX = -CELL_RADIUS; cellX <= CELL_RADIUS; cellX += 1) {
        this.populateCell(cellX, cellZ);
      }
    }
    Object.values(this.batches).forEach((batch) => {
      batch.mesh.count = batch.cursor;
      batch.mesh.instanceMatrix.needsUpdate = true;
      refreshInstancedMeshBounds(batch.mesh);
    });
  }

  animate(delta: number): void {
    this.swayTime += delta;
    this.windTime.value = this.swayTime;
  }

  dispose(): void {
    this.groundGeometry.dispose();
    this.horizonGeometry.dispose();
    this.patchGeometry.dispose();
    Object.values(this.templateGeometries).forEach((geometry) => geometry.dispose());
    this.windMaterial.dispose();
    this.plainMaterial.dispose();
    this.assets.dispose();
  }

  private createBatch(
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    capacity: number,
    castShadow = false,
  ): ForestBatch {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.name = `FiniteForest${name}`;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    return { mesh, cursor: 0 };
  }

  private populateCell(cellX: number, cellZ: number): void {
    const random = mulberry32(hash2(cellX, cellZ));

    for (let index = 0; index < 7; index += 1) {
      const point = this.placement(cellX, cellZ, random);
      const scale = 0.8 + random() * 0.62;
      this.add(random() < 0.24 ? 'pine' : 'tree', {
        ...point, y: 0, rotationY: random() * Math.PI * 2,
        rotationX: (random() - 0.5) * 0.025, rotationZ: (random() - 0.5) * 0.025,
        scaleX: scale, scaleY: scale, scaleZ: scale,
      });
    }
    for (let index = 0; index < 9; index += 1) {
      const point = this.placement(cellX, cellZ, random);
      const scale = 0.42 + random() * 0.68;
      this.add('bush', { ...point, y: 0, rotationY: random() * Math.PI * 2, scaleX: scale, scaleY: scale, scaleZ: scale });
    }
    for (let index = 0; index < 19; index += 1) {
      const point = this.placement(cellX, cellZ, random);
      const scale = 0.42 + random() * 0.76;
      this.add('flower', { ...point, y: 0.02, rotationY: random() * Math.PI * 2, scaleX: scale, scaleY: scale, scaleZ: scale });
    }
    for (let index = 0; index < 29; index += 1) {
      const point = this.placement(cellX, cellZ, random);
      const scale = 0.72 + random() * 1.2;
      this.add('grass', { ...point, y: 0.02, rotationY: random() * Math.PI * 2, scaleX: scale, scaleY: scale, scaleZ: scale });
    }
    for (let cluster = 0; cluster < 2; cluster += 1) {
      const point = this.placement(cellX, cellZ, random);
      for (let index = 0; index < 3; index += 1) {
        const scale = 0.62 + random() * 0.72;
        this.add('mushroom', {
          x: point.x + (index - 1) * 0.7, y: 0, z: point.z + (random() - 0.5) * 1.5,
          rotationY: random() * Math.PI * 2, scaleX: scale, scaleY: scale, scaleZ: scale,
        });
      }
    }
    for (let index = 0; index < 4; index += 1) {
      const point = this.placement(cellX, cellZ, random);
      this.add('twig', {
        ...point, y: 0.075, rotationY: random() * Math.PI * 2, rotationZ: Math.PI / 2 + (random() - 0.5) * 0.2,
        scaleX: 0.04 + random() * 0.025, scaleY: 0.38 + random() * 0.45, scaleZ: 0.04 + random() * 0.025,
      });
    }
    for (let index = 0; index < 10; index += 1) {
      const point = this.placement(cellX, cellZ, random);
      this.add('leaf', {
        ...point, y: 0.04, rotationY: random() * Math.PI * 2,
        scaleX: 0.09 + random() * 0.12, scaleY: 0.01, scaleZ: 0.14 + random() * 0.18,
      });
    }
    for (let index = 0; index < 3; index += 1) {
      const point = this.placement(cellX, cellZ, random);
      const scale = index === 0 ? 0.8 + random() * 0.8 : 0.18 + random() * 0.42;
      this.add('rock', {
        ...point, y: scale * 0.68, rotationX: random() * 0.3, rotationY: random() * Math.PI,
        rotationZ: random() * 0.18, scaleX: scale * (0.85 + random() * 0.45),
        scaleY: scale * (0.55 + random() * 0.3), scaleZ: scale,
      });
    }
    for (let index = 0; index < 7; index += 1) {
      const point = this.placement(cellX, cellZ, random);
      this.add('patch', {
        ...point, y: 0.018, rotationX: -Math.PI / 2, rotationZ: random() * Math.PI,
        scaleX: 1.3 + random() * 3.8, scaleY: 0.7 + random() * 1.8, scaleZ: 1,
      });
    }
  }

  private add(name: BatchName, value: Transform): void {
    const batch = this.batches[name];
    this.transform.position.set(value.x, value.y, value.z);
    this.transform.rotation.set(value.rotationX ?? 0, value.rotationY ?? 0, value.rotationZ ?? 0);
    this.transform.scale.set(value.scaleX, value.scaleY, value.scaleZ);
    this.transform.updateMatrix();
    batch.mesh.setMatrixAt(batch.cursor, this.transform.matrix);
    batch.cursor += 1;
  }

  private placement(cellX: number, cellZ: number, random: () => number): { x: number; z: number } {
    let x = 0;
    let z = 0;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      x = cellX * CELL_SIZE + (random() - 0.5) * (CELL_SIZE - 2);
      z = cellZ * CELL_SIZE + (random() - 0.5) * (CELL_SIZE - 2);
      if (Math.hypot(x, z + 10) > 7.5) break;
    }
    return { x, z };
  }

  private mergeTemplate(group: THREE.Group): THREE.BufferGeometry {
    group.updateMatrixWorld(true);
    const pieces: THREE.BufferGeometry[] = [];
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(object.matrixWorld);
      for (const attribute of Object.keys(geometry.attributes)) {
        if (attribute !== 'position' && attribute !== 'normal') geometry.deleteAttribute(attribute);
      }
      const material = Array.isArray(object.material) ? object.material[0] : object.material;
      const color = material instanceof THREE.MeshStandardMaterial ? material.color : new THREE.Color(0xffffff);
      const colors = new Float32Array(geometry.getAttribute('position').count * 3);
      for (let index = 0; index < colors.length; index += 3) {
        colors[index] = color.r;
        colors[index + 1] = color.g;
        colors[index + 2] = color.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      pieces.push(geometry);
    });
    const merged = mergeGeometries(pieces, false);
    pieces.forEach((geometry) => geometry.dispose());
    if (!merged) throw new Error('Unable to merge a finite forest asset');
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    return merged;
  }

  private createWindMaterial(): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9 });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = this.windTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float moonlitWindPhase = instanceMatrix[3][0] * 0.19 + instanceMatrix[3][2] * 0.13;
            float moonlitWindHeight = max(position.y, 0.0);
            transformed.x += sin(uWindTime * 0.82 + moonlitWindPhase) * moonlitWindHeight * 0.012;
            transformed.z += cos(uWindTime * 0.63 + moonlitWindPhase) * moonlitWindHeight * 0.006;
          #endif`,
        );
    };
    material.customProgramCacheKey = () => 'moonlit-finite-forest-wind-v1';
    return material;
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
