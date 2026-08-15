import * as THREE from 'three';
import { ForestAssets } from './ForestAssets';

const CLEARING_Z = -44;
const TRAIL_START_LOCAL_Z = 5;
const TRAIL_END_LOCAL_Z = -106;

export const RACE_START_Z = CLEARING_Z + TRAIL_START_LOCAL_Z;
// Checkpoints are evenly spaced within each playable stretch. Keeping these as
// cumulative race distances is useful for placement, but equal intervals stop
// the guide from appearing to send the player progressively farther away after
// every checkpoint.
export const TORTOISE_CHECKPOINTS = [7, 14, 21, 28, 35] as const;
export const GAMEPLAY_DISTANCE = 40;
export const SECOND_GAMEPLAY_CHECKPOINTS = [47, 54, 61, 68] as const;
export const SECOND_GAMEPLAY_END_DISTANCE = 76;
export const FINISH_DISTANCE = 100;
export const FINAL_RACE_CHECKPOINTS = [85, 90, 95] as const;
export const FINAL_GAMEPLAY_END_DISTANCE = FINISH_DISTANCE - 1.2;

export class RaceClearing {
  readonly group = new THREE.Group();
  private readonly assets = new ForestAssets();
  private readonly finishLine: THREE.Group;
  private readonly spectators: THREE.Group[] = [];
  private readonly finishSpectators: THREE.Group[] = [];
  private readonly napBed = new THREE.Group();
  private readonly napBedCushions: Array<{
    cushion: THREE.Mesh;
    baseY: number;
    baseScaleY: number;
  }> = [];
  private readonly napBedTufts: Array<{
    tuft: THREE.Group;
    angle: number;
    baseY: number;
    baseScaleY: number;
    baseRotationX: number;
    baseRotationZ: number;
  }> = [];
  private readonly napGroveTrees: THREE.Group[] = [];
  private readonly understoryPlants: THREE.Group[] = [];
  private readonly fireflies: THREE.Mesh[] = [];
  private readonly detailMaterials = new Set<THREE.Material>();
  private napBedCompression = 0;
  private napBedVelocity = 0;
  private napBedLoad = 0;
  private startCelebrating = false;
  private finishCelebrating = false;
  private elapsed = 0;

  constructor() {
    this.group.name = 'RaceClearing';
    this.group.position.z = CLEARING_Z;
    this.group.visible = false;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(116, 190),
      this.assets.material(0x75b93f, 0.98),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0.015, -46);
    ground.receiveShadow = true;
    this.finishLine = this.createFinishLine();
    this.group.add(ground, this.createTrail(), this.createStartingLine(), this.finishLine);
    this.addCheckpointLogs();
    this.addNapGrassBed();
    this.addFramingForest();
    this.addUnderstory();
    this.addNapGrove();
    this.addSpectators();
    this.addFinishSpectators();
    this.setFinishVisible(false);
  }

  show(): void {
    this.group.visible = true;
  }

  animate(delta: number): void {
    if (!this.group.visible) return;
    this.elapsed += delta;
    this.animateNapBed(delta);
    this.spectators.forEach((spectator, index) => {
      const phase = this.elapsed * (this.startCelebrating ? 4.1 + index * 0.13 : 1.35 + index * 0.07)
        + index * 1.47;
      const cheerHop = Math.max(0, Math.sin(phase));
      spectator.position.y = spectator.userData.baseY + (this.startCelebrating
        ? cheerHop * (index === 1 ? 0.09 : 0.14 + index % 2 * 0.025)
        : Math.sin(phase) * 0.025);
      spectator.rotation.z = spectator.userData.baseRotationZ
        + Math.sin(phase * 0.72) * (this.startCelebrating ? 0.045 : 0.012);
      spectator.rotation.x = spectator.userData.baseRotationX
        + Math.sin(phase * 0.5 + 0.7) * (this.startCelebrating ? 0.018 : 0.004);

      spectator.traverse((part) => {
        if (part.userData.cheerArm !== true) return;
        const direction = part.userData.cheerDirection as number;
        part.rotation.z = part.userData.baseRotationZ
          + direction * Math.sin(phase * 1.08) * (this.startCelebrating ? 0.28 : 0.045);
      });

      if (spectator.name === 'BirdSpectators') {
        spectator.children.forEach((bird, birdIndex) => {
          const birdPhase = phase + birdIndex * 1.8;
          bird.position.y = bird.userData.baseY + (this.startCelebrating
            ? Math.max(0, Math.sin(birdPhase * 1.2)) * 0.19
            : Math.sin(birdPhase) * 0.018);
          bird.rotation.z = Math.sin(birdPhase * 0.8) * (this.startCelebrating ? 0.07 : 0.015);
        });
      }
    });
    this.finishSpectators.forEach((spectator, index) => {
      const phase = this.elapsed * (this.finishCelebrating ? 4.6 : 1.25) + index * 1.37;
      spectator.position.y = spectator.userData.baseY + (this.finishCelebrating
        ? Math.max(0, Math.sin(phase)) * (0.16 + index % 3 * 0.035)
        : Math.sin(phase) * 0.018);
      spectator.rotation.z = spectator.userData.baseRotationZ
        + Math.sin(phase * 0.72) * (this.finishCelebrating ? 0.055 : 0.01);
      spectator.rotation.x = spectator.userData.baseRotationX
        + Math.sin(phase * 0.54 + 0.8) * (this.finishCelebrating ? 0.025 : 0.005);
    });
    this.napGroveTrees.forEach((tree, index) => {
      tree.rotation.x = tree.userData.baseRotationX
        + Math.sin(this.elapsed * (0.31 + index * 0.006) + index * 1.7) * 0.0045;
      tree.rotation.z = tree.userData.baseRotationZ
        + Math.sin(this.elapsed * (0.38 + index * 0.008) + index * 2.1) * 0.006;
    });
    this.understoryPlants.forEach((plant, index) => {
      const phase = this.elapsed * (0.52 + index % 5 * 0.035) + index * 1.19;
      plant.rotation.x = plant.userData.baseRotationX + Math.cos(phase * 0.82) * 0.005;
      plant.rotation.z = plant.userData.baseRotationZ + Math.sin(phase) * 0.009;
    });
    this.fireflies.forEach((firefly, index) => {
      const phase = this.elapsed * (0.75 + index * 0.035) + index * 1.83;
      firefly.position.x = firefly.userData.baseX + Math.sin(phase * 0.81) * 0.34;
      firefly.position.y = firefly.userData.baseY + Math.sin(phase * 1.13) * 0.18;
      firefly.position.z = firefly.userData.baseZ + Math.cos(phase * 0.67) * 0.23;
      const material = firefly.material as THREE.MeshBasicMaterial;
      material.opacity = 0.48 + (Math.sin(phase * 2.4) * 0.5 + 0.5) * 0.42;
    });
  }

  centerXAtWorldZ(worldZ: number): number {
    return trailCenterX(worldZ - CLEARING_Z);
  }

  pointOnTrail(worldZ: number, lateralOffset = 0, target = new THREE.Vector3()): THREE.Vector3 {
    const localZ = worldZ - CLEARING_Z;
    const previousZ = localZ + 0.15;
    const nextZ = localZ - 0.15;
    const previousX = trailCenterX(previousZ);
    const nextX = trailCenterX(nextZ);
    const tangentX = nextX - previousX;
    const tangentZ = nextZ - previousZ;
    const tangentLength = Math.hypot(tangentX, tangentZ) || 1;
    const normalX = -tangentZ / tangentLength;
    const normalZ = tangentX / tangentLength;
    return target.set(
      trailCenterX(localZ) + normalX * lateralOffset,
      0,
      worldZ + normalZ * lateralOffset,
    );
  }

  headingAtWorldZ(worldZ: number): number {
    const localZ = worldZ - CLEARING_Z;
    const nextZ = localZ - 0.15;
    return Math.atan2(trailCenterX(nextZ) - trailCenterX(localZ), nextZ - localZ);
  }

  napPosition(): THREE.Vector3 {
    const worldZ = RACE_START_Z - 61;
    return new THREE.Vector3(this.centerXAtWorldZ(worldZ) + 4.5, 0, worldZ);
  }

  resetNapBed(): void {
    this.napBedLoad = 0;
    this.napBedCompression = 0;
    this.napBedVelocity = 0;
    this.applyNapBedDeformation();
  }

  setNapBedLoad(load: number): void {
    this.napBedLoad = THREE.MathUtils.clamp(load, 0, 1);
  }

  napBedSurfaceHeight(): number {
    return 0.26 - this.napBedCompression * 0.065;
  }

  setFinishCelebration(active: boolean): void {
    this.finishCelebrating = active;
  }

  setFinishVisible(visible: boolean): void {
    this.finishLine.visible = visible;
    this.finishSpectators.forEach((spectator) => {
      spectator.visible = visible;
    });
  }

  setStartCelebration(active: boolean): void {
    this.startCelebrating = active;
  }

  dispose(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) geometries.add(child.geometry);
    });
    geometries.forEach((geometry) => geometry.dispose());
    this.detailMaterials.forEach((material) => material.dispose());
    this.assets.dispose();
    this.group.clear();
  }

  private createTrail(): THREE.Group {
    const trail = new THREE.Group();
    trail.name = 'WindingRaceTrail';
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const samples = 50;

    for (let index = 0; index <= samples; index += 1) {
      const t = index / samples;
      const z = THREE.MathUtils.lerp(TRAIL_START_LOCAL_Z + 5, TRAIL_END_LOCAL_Z, t);
      const x = trailCenterX(z);
      const width = THREE.MathUtils.lerp(5.6, 3.4, t);
      const previousX = trailCenterX(z + 0.2);
      const nextX = trailCenterX(z - 0.2);
      const tangent = new THREE.Vector2(nextX - previousX, -0.4).normalize();
      const normal = new THREE.Vector2(-tangent.y, tangent.x);
      positions.push(
        x + normal.x * width * 0.5, 0.07, z + normal.y * width * 0.5,
        x - normal.x * width * 0.5, 0.07, z - normal.y * width * 0.5,
      );
      uvs.push(0, t * 9, 1, t * 9);
      if (index < samples) {
        const current = index * 2;
        indices.push(current, current + 2, current + 1, current + 1, current + 2, current + 3);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const path = new THREE.Mesh(geometry, this.assets.material(0xdca34c, 1));
    path.receiveShadow = true;
    trail.add(path);

    const random = seededRandom(7143);
    for (let index = 0; index < 38; index += 1) {
      const t = index / 37;
      const z = THREE.MathUtils.lerp(TRAIL_START_LOCAL_Z + 2, TRAIL_END_LOCAL_Z + 2, t);
      const width = THREE.MathUtils.lerp(6.1, 3.9, t);
      for (const side of [-1, 1]) {
        const stone = this.assets.rock(random, 0.16 + random() * 0.1);
        stone.position.x = trailCenterX(z) + side * width * 0.5;
        stone.position.z = z + (random() - 0.5) * 0.45;
        stone.position.y *= 0.62;
        stone.scale.y *= 0.58;
        trail.add(stone);
      }
    }

    for (let index = 0; index < 72; index += 1) {
      const t = (index + random() * 0.7) / 72;
      const z = THREE.MathUtils.lerp(TRAIL_START_LOCAL_Z + 1, TRAIL_END_LOCAL_Z + 2, t);
      const width = THREE.MathUtils.lerp(5.35, 3.2, t);
      const side = index % 2 === 0 ? -1 : 1;
      const x = trailCenterX(z) + side * width * (0.27 + random() * 0.16);
      const detail = index % 5 === 0
        ? this.assets.rock(random, 0.075 + random() * 0.075)
        : index % 3 === 0
          ? this.assets.flower(random, 0.2 + random() * 0.17)
          : this.assets.grassTuft(random, 0.18 + random() * 0.16);
      detail.name = index % 3 === 0 ? `TrailDandelion${index + 1}` : `TrailDetail${index + 1}`;
      detail.position.set(x, 0.085, z + (random() - 0.5) * 0.5);
      detail.rotation.y = random() * Math.PI * 2;
      trail.add(detail);
    }

    for (let index = 0; index < 11; index += 1) {
      const t = index / 10;
      const z = THREE.MathUtils.lerp(1, TRAIL_END_LOCAL_Z + 5, t);
      const width = THREE.MathUtils.lerp(7.3, 5, t);
      trail.add(this.createTrailPost(trailCenterX(z) - width * 0.5, z));
      trail.add(this.createTrailPost(trailCenterX(z) + width * 0.5, z));
    }
    return trail;
  }

  private createTrailPost(x: number, z: number): THREE.Group {
    const post = new THREE.Group();
    const wood = this.assets.material(0x875027, 0.95);
    const stem = new THREE.Mesh(this.assets.unitCylinder, wood);
    stem.scale.set(0.13, 1.25, 0.13);
    stem.position.y = 0.62;
    stem.castShadow = true;
    const cap = new THREE.Mesh(this.assets.softBlob, wood);
    cap.scale.set(0.18, 0.13, 0.18);
    cap.position.y = 1.25;
    cap.castShadow = true;
    post.add(stem, cap);
    post.position.set(x, 0, z);
    return post;
  }

  private createStartingLine(): THREE.Group {
    const line = new THREE.Group();
    line.name = 'StartingPoint';
    const geometry = new THREE.PlaneGeometry(0.68, 0.72);
    const cream = this.assets.material(0xfff2c9, 0.98);
    const rust = this.assets.material(0xb96631, 0.98);
    for (let index = 0; index < 8; index += 1) {
      const tile = new THREE.Mesh(geometry, index % 2 ? rust : cream);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set((index - 3.5) * 0.68, 0.095, TRAIL_START_LOCAL_Z);
      tile.receiveShadow = true;
      line.add(tile);
    }
    return line;
  }

  private createFinishLine(): THREE.Group {
    const finish = new THREE.Group();
    finish.name = 'ForestFinishLine';
    const localZ = TRAIL_START_LOCAL_Z - FINISH_DISTANCE;
    const centerX = trailCenterX(localZ);
    const cream = this.assets.material(0xffedbf, 0.96);
    const rust = this.assets.material(0xb85a35, 0.94);
    cream.side = THREE.DoubleSide;
    rust.side = THREE.DoubleSide;
    const wood = this.assets.material(0x7f4826, 0.98);
    const leafGreen = this.assets.material(0x3c8d38, 0.9);

    const tileGeometry = new THREE.PlaneGeometry(0.58, 0.78);
    for (let index = 0; index < 7; index += 1) {
      const tile = new THREE.Mesh(tileGeometry, index % 2 === 0 ? cream : rust);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(centerX + (index - 3) * 0.58, 0.1, localZ);
      tile.receiveShadow = true;
      finish.add(tile);
    }

    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(this.assets.unitCylinder, wood);
      post.scale.set(0.19, 4.2, 0.19);
      post.position.set(centerX + side * 2.55, 2.1, localZ);
      post.castShadow = true;
      finish.add(post);

      const finial = new THREE.Mesh(this.assets.softBlob, leafGreen);
      finial.scale.set(0.33, 0.28, 0.33);
      finial.position.set(centerX + side * 2.55, 4.28, localZ);
      finial.castShadow = true;
      finish.add(finial);
    }

    const crossbar = new THREE.Mesh(this.assets.unitCylinder, wood);
    crossbar.scale.set(0.14, 2.7, 0.14);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(centerX, 4.02, localZ);
    crossbar.castShadow = true;
    finish.add(crossbar);

    const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 0.82), cream);
    banner.position.set(centerX, 3.55, localZ + 0.035);
    banner.castShadow = true;
    finish.add(banner);
    const checkerGeometry = new THREE.PlaneGeometry(0.47, 0.34);
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 10; column += 1) {
        if ((row + column) % 2 !== 0) continue;
        const checker = new THREE.Mesh(checkerGeometry, rust);
        checker.position.set(
          centerX + (column - 4.5) * 0.47,
          3.38 + row * 0.34,
          localZ + 0.045,
        );
        finish.add(checker);
      }
    }

    for (let index = 0; index < 7; index += 1) {
      const pennant = new THREE.Mesh(this.assets.cone, index % 2 === 0 ? rust : leafGreen);
      pennant.scale.set(0.16, 0.38, 0.035);
      pennant.rotation.z = Math.PI;
      pennant.position.set(centerX + (index - 3) * 0.63, 3.02, localZ + 0.055);
      finish.add(pennant);
    }
    return finish;
  }

  private addCheckpointLogs(): void {
    const wood = this.assets.material(0x7f4725, 0.96);
    const rings = this.assets.material(0xc88743, 0.93);
    TORTOISE_CHECKPOINTS.forEach((distance, index) => {
      const worldZ = RACE_START_Z - distance;
      const localZ = worldZ - CLEARING_Z;
      const side = index % 2 === 0 ? -1 : 1;
      const log = new THREE.Group();
      log.name = `CheckpointLog${index + 1}`;
      const trunk = new THREE.Mesh(this.assets.unitCylinder, wood);
      trunk.scale.set(0.24, 1.35, 0.24);
      trunk.rotation.z = Math.PI / 2;
      trunk.position.y = 0.25;
      trunk.castShadow = true;
      const end = new THREE.Mesh(this.assets.unitCylinder, rings);
      end.scale.set(0.255, 0.035, 0.255);
      end.rotation.z = Math.PI / 2;
      end.position.set(side * 0.67, 0.25, 0);
      end.castShadow = true;
      log.add(trunk, end);
      log.position.set(
        trailCenterX(localZ) + side * 4.25,
        0,
        localZ,
      );
      log.rotation.y = side * 0.22;
      this.group.add(log);
    });
  }

  private addNapGrassBed(): void {
    const nap = this.napPosition();
    this.napBed.name = 'RabbitSoftGrassBed';
    this.napBed.position.set(nap.x, 0, nap.z - CLEARING_Z);

    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x224c24,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    this.detailMaterials.add(shadowMaterial);
    const bedShadow = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), shadowMaterial);
    bedShadow.name = 'GrassBedContactShadow';
    bedShadow.rotation.x = -Math.PI / 2;
    bedShadow.scale.set(1.42, 0.94, 1);
    bedShadow.position.y = 0.055;
    bedShadow.renderOrder = 1;
    this.napBed.add(bedShadow);

    const moundPieces = [
      [-1.45, 0.14, 0.05, 1.24, 0.16, 0.92, 0x397f2d],
      [-0.5, 0.18, -0.22, 1.38, 0.2, 1.0, 0x4b9836],
      [0.55, 0.18, -0.18, 1.42, 0.21, 0.98, 0x62ae3d],
      [1.55, 0.14, 0.03, 1.22, 0.17, 0.88, 0x3f8c31],
      [-1.05, 0.21, 0.48, 1.14, 0.2, 0.72, 0x55a43a],
      [0.12, 0.25, 0.42, 1.37, 0.23, 0.78, 0x72bb48],
      [1.22, 0.2, 0.43, 1.08, 0.19, 0.7, 0x5eaa3d],
      [-0.55, 0.21, -0.72, 1.28, 0.19, 0.66, 0x468f32],
      [0.78, 0.2, -0.69, 1.22, 0.18, 0.65, 0x559d35],
    ] as const;
    moundPieces.forEach(([x, y, z, sx, sy, sz, color], index) => {
      const cushion = new THREE.Mesh(this.assets.softBlob, this.assets.material(color, 1));
      cushion.name = `GrassCushion${index + 1}`;
      cushion.position.set(x, y, z);
      cushion.scale.set(sx * 0.82, sy * 0.9, sz * 0.8);
      cushion.rotation.set(index * 0.13, index * 0.81, index * 0.07);
      cushion.castShadow = true;
      cushion.receiveShadow = true;
      this.napBedCushions.push({
        cushion,
        baseY: cushion.position.y,
        baseScaleY: cushion.scale.y,
      });
      this.napBed.add(cushion);
    });

    const legCover = new THREE.Mesh(this.assets.softBlob, this.assets.material(0x5aa33a, 1));
    legCover.name = 'RabbitLegGrassCover';
    legCover.position.set(0.35, 0.92, 1.48);
    legCover.scale.set(1.08, 1.02, 1.04);
    legCover.rotation.set(-0.05, 0.28, 0.04);
    legCover.castShadow = true;
    legCover.receiveShadow = true;
    this.napBedCushions.push({
      cushion: legCover,
      baseY: legCover.position.y,
      baseScaleY: legCover.scale.y,
    });
    this.napBed.add(legCover);

    const random = seededRandom(4407);
    for (let index = 0; index < 62; index += 1) {
      const edgeTuft = index < 34;
      const angle = edgeTuft ? index / 34 * Math.PI * 2 : random() * Math.PI * 2;
      const radial = edgeTuft ? 1 : Math.sqrt(random()) * 0.82;
      const foreground = Math.sin(angle) > -0.15;
      const tuftScale = edgeTuft
        ? 0.98 + random() * 0.58
        : foreground ? 0.82 + random() * 0.5 : 0.66 + random() * 0.38;
      const tuft = this.assets.grassTuft(random, tuftScale);
      tuft.position.set(
        Math.cos(angle) * (edgeTuft ? 2.72 + random() * 0.2 : 2.35 * radial),
        edgeTuft ? 0.08 : 0.18 + (1 - radial) * 0.09,
        Math.sin(angle) * (edgeTuft ? 1.66 + random() * 0.14 : 1.34 * radial),
      );
      tuft.rotation.y = -angle + (random() - 0.5) * 0.35;
      tuft.rotation.x = Math.cos(angle) * (edgeTuft ? 0.08 : 0.025);
      tuft.rotation.z = -Math.sin(angle) * (edgeTuft ? 0.08 : 0.025);
      this.napBedTufts.push({
        tuft,
        angle,
        baseY: tuft.position.y,
        baseScaleY: tuft.scale.y,
        baseRotationX: tuft.rotation.x,
        baseRotationZ: tuft.rotation.z,
      });
      this.napBed.add(tuft);
    }

    for (let index = 0; index < 18; index += 1) {
      const progress = index / 17;
      const x = THREE.MathUtils.lerp(-1.85, 1.35, progress) + (random() - 0.5) * 0.18;
      const z = 0.42 + Math.sin(progress * Math.PI) * 0.48 + random() * 0.2;
      const angle = Math.atan2(z, x);
      const tuft = this.assets.grassTuft(random, 1.02 + random() * 0.5);
      tuft.name = `RabbitBlanketGrass${index + 1}`;
      tuft.position.set(x, 0.16 + random() * 0.08, z);
      tuft.rotation.y = -angle + (random() - 0.5) * 0.28;
      tuft.rotation.x = -0.04 + random() * 0.05;
      tuft.rotation.z = (random() - 0.5) * 0.06;
      this.napBedTufts.push({
        tuft,
        angle,
        baseY: tuft.position.y,
        baseScaleY: tuft.scale.y,
        baseRotationX: tuft.rotation.x,
        baseRotationZ: tuft.rotation.z,
      });
      this.napBed.add(tuft);
    }

    for (const side of [-1, 1]) {
      const clover = this.assets.flower(random, 0.48);
      clover.position.set(side * 2.25, 0.12, 0.82);
      clover.rotation.y = random() * Math.PI * 2;
      this.napBed.add(clover);
    }

    this.group.add(this.napBed);
    this.applyNapBedDeformation();
  }

  private animateNapBed(delta: number): void {
    const step = Math.min(delta, 0.05);
    const springStrength = 20;
    const damping = 9;
    const acceleration = (this.napBedLoad - this.napBedCompression) * springStrength
      - this.napBedVelocity * damping;
    this.napBedVelocity += acceleration * step;
    this.napBedCompression = THREE.MathUtils.clamp(
      this.napBedCompression + this.napBedVelocity * step,
      -0.035,
      1.06,
    );
    this.applyNapBedDeformation();
  }

  private applyNapBedDeformation(): void {
    const compression = Math.max(0, this.napBedCompression);
    this.napBed.scale.set(
      1 + compression * 0.028,
      1,
      1 + compression * 0.035,
    );
    this.napBedCushions.forEach(({ cushion, baseY, baseScaleY }, index) => {
      const offset = index % 2 === 0 ? 1 : 0.86;
      cushion.position.y = baseY - compression * 0.075 * offset;
      cushion.scale.y = baseScaleY * (1 - compression * 0.32 * offset);
    });
    this.napBedTufts.forEach(({
      tuft,
      angle,
      baseY,
      baseScaleY,
      baseRotationX,
      baseRotationZ,
    }, index) => {
      const springFlutter = Math.sin(this.elapsed * 5.2 + index * 1.71) * Math.abs(this.napBedVelocity) * 0.012;
      const outwardBend = compression * 0.15 + springFlutter;
      tuft.position.y = baseY - compression * 0.055;
      tuft.scale.y = baseScaleY * (1 - compression * 0.08);
      tuft.rotation.x = baseRotationX + Math.cos(angle) * outwardBend;
      tuft.rotation.z = baseRotationZ - Math.sin(angle) * outwardBend;
    });
  }

  private addFramingForest(): void {
    const random = seededRandom(9021);
    const treePositions = [
      [-15, 2, 1.22], [-11, -9, 0.92], [-16, -20, 1.18], [-12, -34, 0.86],
      [-17, -49, 1.12], [-12, -63, 0.82], [15, 1, 1.18], [12, -11, 0.9],
      [17, -24, 1.22], [12, -38, 0.86], [16, -54, 1.13], [11, -69, 0.82],
      [-25, -7, 1.34], [25, -12, 1.28], [-25, -43, 1.22], [24, -58, 1.3],
      [-20, -15, 0.94], [-21, -29, 1.05], [-21, -58, 1.08], [-19, -71, 0.95],
      [21, -21, 1.02], [22, -35, 0.96], [21, -48, 1.06], [20, -70, 0.94],
      [-9, -18, 0.68], [9, -25, 0.7], [-9, -40, 0.72], [9, -48, 0.7],
      [-14, -78, 0.88], [-17, -90, 1.08], [-13, -103, 0.9], [-24, -82, 1.18],
      [14, -79, 0.92], [17, -91, 1.12], [13, -104, 0.86], [24, -99, 1.16],
      [-9, -86, 0.68], [9, -88, 0.72], [-10, -100, 0.7], [10, -102, 0.74],
    ] as const;
    treePositions.forEach(([x, z, scale], index) => {
      const tree = index % 4 === 1
        ? this.assets.pineTree(random, scale)
        : this.assets.tree(random, scale);
      tree.position.set(x, 0, z);
      tree.rotation.y = random() * Math.PI * 2;
      this.group.add(tree);
    });

    for (let index = 0; index < 54; index += 1) {
      const t = index / 53;
      const z = THREE.MathUtils.lerp(8, -103, t);
      const side = index % 2 ? -1 : 1;
      const x = trailCenterX(z) + side * (5.2 + random() * 4.8);
      const decoration = index % 5 === 0
        ? this.assets.bush(random, 0.55 + random() * 0.55)
        : index % 4 === 0
          ? this.createFern(random, 0.62 + random() * 0.55)
          : this.assets.flower(random, 0.65 + random() * 0.7);
      decoration.position.set(x, 0.08, z + (random() - 0.5) * 3);
      this.group.add(decoration);
    }
  }

  private addUnderstory(): void {
    const random = seededRandom(44117);
    const fallenLeafMaterials = [
      this.assets.material(0xa66b2e, 0.98),
      this.assets.material(0xd39a31, 0.96),
      this.assets.material(0x8c7b2f, 0.98),
      this.assets.material(0xb9542e, 0.96),
    ];
    const twigMaterial = this.assets.material(0x704020, 0.98);
    const stumpTopMaterial = this.assets.material(0xb67b3d, 0.96);

    // Low plant islands make the forest feel layered without narrowing the
    // playable trail or adding another wall of trees.
    for (let index = 0; index < 76; index += 1) {
      const progress = (index + random() * 0.7) / 76;
      const z = THREE.MathUtils.lerp(8, TRAIL_END_LOCAL_Z + 1.5, progress);
      const side = index % 2 === 0 ? -1 : 1;
      const clearance = 4.3 + random() * 7.4;
      const cluster = new THREE.Group();
      cluster.name = `ForestUnderstoryCluster${index + 1}`;

      const tuftCount = index % 4 === 0 ? 3 : 2;
      for (let tuftIndex = 0; tuftIndex < tuftCount; tuftIndex += 1) {
        const tuft = this.assets.grassTuft(random, 0.38 + random() * 0.62);
        tuft.position.set(
          (random() - 0.5) * 1.35,
          0,
          (random() - 0.5) * 1.15,
        );
        tuft.rotation.y = random() * Math.PI * 2;
        cluster.add(tuft);
      }

      if (index % 3 === 0) {
        const flowerCount = 1 + Math.floor(random() * 3);
        for (let flowerIndex = 0; flowerIndex < flowerCount; flowerIndex += 1) {
          const flower = this.assets.flower(random, 0.34 + random() * 0.42);
          flower.position.set(
            (random() - 0.5) * 1.2,
            0.01,
            (random() - 0.5) * 1.05,
          );
          flower.rotation.y = random() * Math.PI * 2;
          cluster.add(flower);
        }
      }
      if (index % 5 === 0) {
        const fern = this.createFern(random, 0.46 + random() * 0.48);
        fern.position.set((random() - 0.5) * 0.65, 0, (random() - 0.5) * 0.5);
        fern.rotation.y = random() * Math.PI * 2;
        cluster.add(fern);
      }
      if (index % 6 === 0) {
        const shrub = this.assets.bush(random, 0.34 + random() * 0.34);
        shrub.position.set((random() - 0.5) * 0.55, 0, (random() - 0.5) * 0.45);
        cluster.add(shrub);
      }
      if (index % 11 === 0) {
        const mushroom = this.assets.mushroom(random, 0.3 + random() * 0.34);
        mushroom.position.set((random() - 0.5) * 0.8, 0, (random() - 0.5) * 0.65);
        cluster.add(mushroom);
      }

      cluster.position.set(
        trailCenterX(z) + side * clearance,
        0.045,
        z + (random() - 0.5) * 2.1,
      );
      cluster.rotation.y = random() * Math.PI * 2;
      cluster.userData.baseRotationX = cluster.rotation.x;
      cluster.userData.baseRotationZ = cluster.rotation.z;
      this.understoryPlants.push(cluster);
      this.group.add(cluster);
    }

    // Scattered leaf litter breaks up broad areas of flat green ground.
    for (let index = 0; index < 84; index += 1) {
      const z = THREE.MathUtils.lerp(7, TRAIL_END_LOCAL_Z + 2, random());
      const side = random() < 0.5 ? -1 : 1;
      const leaf = new THREE.Mesh(
        this.assets.softBlob,
        fallenLeafMaterials[Math.floor(random() * fallenLeafMaterials.length)],
      );
      leaf.name = `FallenLeaf${index + 1}`;
      leaf.scale.set(0.1 + random() * 0.16, 0.012, 0.16 + random() * 0.22);
      leaf.position.set(
        trailCenterX(z) + side * (3.8 + random() * 10.5),
        0.055,
        z + (random() - 0.5) * 2.5,
      );
      leaf.rotation.set(0, random() * Math.PI * 2, (random() - 0.5) * 0.24);
      leaf.receiveShadow = true;
      this.group.add(leaf);
    }

    // Fallen twigs and mossy stumps add woodland storytelling at ankle height.
    for (let index = 0; index < 16; index += 1) {
      const z = THREE.MathUtils.lerp(5, TRAIL_END_LOCAL_Z + 4, (index + random()) / 16);
      const side = index % 2 === 0 ? -1 : 1;
      const twig = new THREE.Mesh(this.assets.unitCylinder, twigMaterial);
      twig.name = `FallenTwig${index + 1}`;
      twig.scale.set(0.045 + random() * 0.025, 0.42 + random() * 0.42, 0.045 + random() * 0.025);
      twig.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.16;
      twig.rotation.y = random() * Math.PI * 2;
      twig.position.set(
        trailCenterX(z) + side * (5.1 + random() * 7.8),
        0.105,
        z + (random() - 0.5) * 2,
      );
      twig.castShadow = true;
      this.group.add(twig);
    }

    for (let index = 0; index < 7; index += 1) {
      const z = THREE.MathUtils.lerp(1, TRAIL_END_LOCAL_Z + 7, (index + 0.5) / 7);
      const side = index % 2 === 0 ? -1 : 1;
      const stump = new THREE.Group();
      stump.name = `MossyStump${index + 1}`;
      const trunk = new THREE.Mesh(this.assets.unitCylinder, twigMaterial);
      trunk.scale.set(0.28 + random() * 0.12, 0.42 + random() * 0.2, 0.28 + random() * 0.12);
      trunk.position.y = trunk.scale.y * 0.5;
      trunk.castShadow = true;
      const top = new THREE.Mesh(this.assets.softBlob, stumpTopMaterial);
      top.scale.set(trunk.scale.x * 1.03, 0.065, trunk.scale.z * 1.03);
      top.position.y = trunk.scale.y;
      top.castShadow = true;
      const moss = new THREE.Mesh(this.assets.softBlob, this.assets.material(0x4f9632, 0.94));
      moss.scale.set(trunk.scale.x * 0.72, 0.035, trunk.scale.z * 0.5);
      moss.position.set(-0.06, trunk.scale.y + 0.055, 0.02);
      stump.add(trunk, top, moss);
      stump.position.set(
        trailCenterX(z) + side * (6.2 + random() * 6),
        0.035,
        z + (random() - 0.5) * 2.4,
      );
      stump.rotation.y = random() * Math.PI * 2;
      this.group.add(stump);
    }
  }

  private addNapGrove(): void {
    const nap = this.napPosition();
    const napLocalZ = nap.z - CLEARING_Z;
    const random = seededRandom(12831);

    const dappleMaterial = new THREE.MeshBasicMaterial({
      color: 0x286b2c,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    this.detailMaterials.add(dappleMaterial);
    [
      [-2.8, -1.7, 3.8, 1.8], [2.9, -2.5, 3.3, 1.65],
      [-4.7, 2.0, 2.6, 1.25], [4.8, 1.5, 2.8, 1.3],
    ].forEach(([dx, dz, sx, sz], index) => {
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 20), dappleMaterial);
      shadow.name = `CanopyDapple${index + 1}`;
      shadow.rotation.x = -Math.PI / 2;
      shadow.rotation.z = index * 0.67;
      shadow.scale.set(sx, sz, 1);
      shadow.position.set(nap.x + dx, 0.067, napLocalZ + dz);
      shadow.renderOrder = 1;
      this.group.add(shadow);
    });

    const groveTreePlacements = [
      [-7.7, 3.2, 1.0], [7.8, 3.5, 0.96], [-10.5, 0.2, 1.18], [10.1, -0.5, 1.12],
      [-7.2, -4.8, 0.93], [7.7, -5.6, 1.02], [-4.8, -9.4, 0.88], [4.5, -10.2, 1.0],
      [-11.6, -8.5, 1.16], [11.7, -10.4, 1.13], [-7.5, -13.2, 0.78], [7.2, -14.0, 0.85],
      [-13.5, 5.1, 1.06], [13.2, 5.4, 1.02],
    ] as const;
    groveTreePlacements.forEach(([dx, dz, scale], index) => {
      const tree = index % 4 === 1 || index === 10
        ? this.assets.pineTree(random, scale)
        : this.assets.tree(random, scale);
      tree.name = `NapGroveTree${index + 1}`;
      const localZ = napLocalZ + dz;
      tree.position.set(this.besideTrailX(nap.x + dx, localZ, 4.6), 0, localZ);
      tree.rotation.y = random() * Math.PI * 2;
      tree.userData.baseRotationX = tree.rotation.x;
      tree.userData.baseRotationZ = tree.rotation.z;
      this.napGroveTrees.push(tree);
      this.group.add(tree);
    });

    const bushPlacements = [
      [-4.1, 1.3, 0.9], [4.2, 0.9, 0.82], [-5.1, -1.9, 1.08], [5.3, -2.1, 0.96],
      [-4.6, -5.0, 0.86], [4.9, -5.7, 1.1], [-5.8, -7.4, 0.82], [6.0, -8.0, 0.94],
      [-7.0, 4.2, 1.0], [7.2, 4.1, 0.95], [-7.9, -6.4, 1.05], [8.2, -7.0, 0.9],
    ] as const;
    bushPlacements.forEach(([dx, dz, scale]) => {
      const bush = this.assets.bush(random, scale);
      const localZ = napLocalZ + dz;
      bush.position.set(this.besideTrailX(nap.x + dx, localZ, 3.9), 0, localZ);
      bush.rotation.y = random() * Math.PI * 2;
      this.group.add(bush);
    });

    const fernPlacements = [
      [-3.5, 0.0, 0.9], [3.5, -0.2, 0.78], [-4.1, -3.2, 1.05], [4.0, -3.7, 0.92],
      [-2.8, -5.2, 0.82], [2.4, -6.2, 1.08], [-5.7, 2.7, 1.0], [5.8, 2.4, 0.88],
      [-6.0, -5.4, 1.06], [6.2, -6.1, 0.94], [-8.0, -1.8, 1.12], [8.2, -2.8, 1.02],
    ] as const;
    fernPlacements.forEach(([dx, dz, scale]) => {
      const fern = this.createFern(random, scale);
      const localZ = napLocalZ + dz;
      fern.position.set(this.besideTrailX(nap.x + dx, localZ, 3.35), 0.06, localZ);
      fern.rotation.y = random() * Math.PI * 2;
      this.group.add(fern);
    });

    for (let index = 0; index < 18; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 3.4 + random() * 4.5;
      const detail = index % 4 === 0
        ? this.assets.mushroom(random, 0.42 + random() * 0.38)
        : index % 3 === 0
          ? this.assets.rock(random, 0.2 + random() * 0.3)
          : this.assets.flower(random, 0.45 + random() * 0.48);
      detail.position.x += nap.x + Math.cos(angle) * radius;
      detail.position.z += napLocalZ + Math.sin(angle) * radius * 0.72;
      detail.position.x = this.besideTrailX(detail.position.x, detail.position.z, 2.85);
      detail.position.y += 0.065;
      this.group.add(detail);
    }

    const fallenLog = this.createFallenLog(random);
    const fallenLogZ = napLocalZ - 3.45;
    fallenLog.position.set(this.besideTrailX(nap.x - 5.25, fallenLogZ, 4.8), 0, fallenLogZ);
    fallenLog.rotation.y = -0.34;
    this.group.add(fallenLog);

    for (let index = 0; index < 11; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? 0xc9ff8b : 0xffe38a,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
      this.detailMaterials.add(material);
      const firefly = new THREE.Mesh(this.assets.sphere, material);
      const angle = random() * Math.PI * 2;
      const radius = 2.5 + random() * 4.2;
      firefly.name = `NapGroveFirefly${index + 1}`;
      firefly.scale.setScalar(0.025 + random() * 0.018);
      firefly.position.set(
        nap.x + Math.cos(angle) * radius,
        0.75 + random() * 2.1,
        napLocalZ + Math.sin(angle) * radius * 0.64,
      );
      firefly.userData.baseX = firefly.position.x;
      firefly.userData.baseY = firefly.position.y;
      firefly.userData.baseZ = firefly.position.z;
      this.fireflies.push(firefly);
      this.group.add(firefly);
    }

    const warmCanopyLight = new THREE.PointLight(0xffd98e, 4.5, 10, 2);
    warmCanopyLight.name = 'NapGroveWarmLight';
    warmCanopyLight.position.set(nap.x, 4.5, napLocalZ + 0.5);
    this.group.add(warmCanopyLight);
  }

  private besideTrailX(proposedX: number, localZ: number, clearance: number): number {
    const center = trailCenterX(localZ);
    const offset = proposedX - center;
    if (Math.abs(offset) >= clearance) return proposedX;
    return center + (offset < 0 ? -clearance : clearance);
  }

  private createFern(random: () => number, scale: number): THREE.Group {
    const fern = new THREE.Group();
    const material = this.assets.material(random() > 0.5 ? 0x267b37 : 0x348d3c, 0.92);
    for (let index = 0; index < 7; index += 1) {
      const angle = index / 7 * Math.PI * 2 + random() * 0.2;
      const frond = new THREE.Mesh(this.assets.cone, material);
      frond.scale.set(0.1 * scale, (0.7 + random() * 0.28) * scale, 0.035 * scale);
      frond.position.set(Math.cos(angle) * 0.22 * scale, 0.35 * scale, Math.sin(angle) * 0.22 * scale);
      frond.rotation.order = 'YXZ';
      frond.rotation.y = -angle;
      frond.rotation.z = Math.cos(angle) * 0.62;
      frond.rotation.x = Math.sin(angle) * 0.62;
      frond.castShadow = true;
      fern.add(frond);
    }
    return fern;
  }

  private createFallenLog(random: () => number): THREE.Group {
    const log = new THREE.Group();
    log.name = 'MossyFallenLog';
    const bark = this.assets.material(0x70401f, 1);
    const rings = this.assets.material(0xb8793e, 0.98);
    const moss = this.assets.material(0x4c9634, 1);
    const trunk = new THREE.Mesh(this.assets.unitCylinder, bark);
    trunk.scale.set(0.36, 3.8, 0.36);
    trunk.rotation.z = Math.PI / 2;
    trunk.position.y = 0.37;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    const end = new THREE.Mesh(this.assets.unitCylinder, rings);
    end.scale.set(0.37, 0.045, 0.37);
    end.rotation.z = Math.PI / 2;
    end.position.set(1.91, 0.37, 0);
    end.castShadow = true;
    log.add(trunk, end);
    for (let index = 0; index < 5; index += 1) {
      const mossPatch = new THREE.Mesh(this.assets.softBlob, moss);
      mossPatch.scale.set(0.42 + random() * 0.22, 0.08, 0.24 + random() * 0.1);
      mossPatch.position.set(-1.45 + index * 0.72, 0.7, (random() - 0.5) * 0.2);
      mossPatch.rotation.y = random() * Math.PI;
      log.add(mossPatch);
    }
    for (let index = 0; index < 3; index += 1) {
      const mushroom = this.assets.mushroom(random, 0.38 + index * 0.06);
      mushroom.position.set(-1.1 + index * 0.75, 0.62, -0.25);
      log.add(mushroom);
    }
    return log;
  }

  private addSpectators(): void {
    const placements: Array<[THREE.Group, number, number, number]> = [
      [this.createSquirrel(), -5.4, 0.4, 0.5],
      [this.createDeer(), -8.2, -3.6, 0.35],
      [this.createFox(), 5.7, 0.2, -0.55],
      [this.createHedgehog(), 5.1, -4.2, -0.5],
      [this.createBirdAudience(), -3.8, -5.6, 0.25],
    ];
    placements.forEach(([spectator, x, z, rotation]) => {
      spectator.position.set(x, 0, z);
      spectator.rotation.y = rotation;
      spectator.userData.baseY = 0;
      spectator.userData.baseRotationX = spectator.rotation.x;
      spectator.userData.baseRotationZ = spectator.rotation.z;
      this.spectators.push(spectator);
      this.group.add(spectator);
    });
  }

  private addFinishSpectators(): void {
    const localZ = TRAIL_START_LOCAL_Z - FINISH_DISTANCE;
    const centerX = trailCenterX(localZ);
    const placements: Array<[THREE.Group, number, number, number]> = [
      [this.createSquirrel(), centerX - 4.1, localZ + 2.2, 0.42],
      [this.createDeer(), centerX - 6.3, localZ - 0.8, 0.28],
      [this.createBirdAudience(), centerX - 4.0, localZ - 3.5, 0.18],
      [this.createFox(), centerX + 4.2, localZ + 1.8, -0.48],
      [this.createHedgehog(), centerX + 4.8, localZ - 1.3, -0.35],
      [this.createSquirrel(), centerX + 3.7, localZ - 4.1, -0.32],
    ];
    placements.forEach(([spectator, x, z, rotation], index) => {
      spectator.name = `Finish${spectator.name}${index + 1}`;
      spectator.position.set(x, 0, z);
      spectator.rotation.y = rotation;
      spectator.userData.baseY = 0;
      spectator.userData.baseRotationX = spectator.rotation.x;
      spectator.userData.baseRotationZ = spectator.rotation.z;
      this.finishSpectators.push(spectator);
      this.group.add(spectator);
    });
  }

  private createSquirrel(): THREE.Group {
    const animal = new THREE.Group();
    animal.name = 'SquirrelSpectator';
    const fur = this.assets.material(0xa95c2d, 0.9);
    const cream = this.assets.material(0xf2c987, 0.94);
    animal.add(
      ellipsoid(this.assets.sphere, fur, 0, 0.72, 0, 0.5, 0.72, 0.46),
      ellipsoid(this.assets.sphere, fur, 0, 1.42, 0.02, 0.43, 0.43, 0.4),
      ellipsoid(this.assets.sphere, cream, 0, 0.72, 0.39, 0.3, 0.48, 0.08),
    );
    addFace(animal, this.assets, 0, 1.5, 0.38, 0.2);
    const tail = new THREE.Group();
    for (let index = 0; index < 5; index += 1) {
      const puff = ellipsoid(this.assets.softBlob, fur, -0.55, 0.65 + index * 0.28, -0.12, 0.35, 0.48, 0.3);
      puff.rotation.z = -0.45 + index * 0.17;
      tail.add(puff);
    }
    const leftArm = cheeringArm(this.assets, fur, -0.38, 1.02, 0.32, -0.55);
    const rightArm = cheeringArm(this.assets, fur, 0.38, 1.02, 0.32, 0.55);
    animal.add(tail, leftArm, rightArm, pointedEar(this.assets, fur, -0.22, 1.86), pointedEar(this.assets, fur, 0.22, 1.86));
    animal.scale.setScalar(0.9);
    return animal;
  }

  private createDeer(): THREE.Group {
    const animal = new THREE.Group();
    animal.name = 'DeerSpectator';
    const fur = this.assets.material(0xb87a42, 0.94);
    const dark = this.assets.material(0x704124, 0.98);
    animal.add(
      ellipsoid(this.assets.sphere, fur, 0, 1.45, 0, 1.1, 0.72, 0.54),
      ellipsoid(this.assets.sphere, fur, 0, 2.75, 0.12, 0.48, 0.58, 0.42),
      limb(this.assets, fur, -0.65, 0.72, -0.2, 0.16, 1.4),
      limb(this.assets, fur, 0.65, 0.72, -0.2, 0.16, 1.4),
      limb(this.assets, fur, -0.55, 0.72, 0.3, 0.16, 1.4),
      limb(this.assets, fur, 0.55, 0.72, 0.3, 0.16, 1.4),
    );
    const neck = limb(this.assets, fur, 0, 2.15, 0, 0.28, 1.25);
    neck.rotation.x = -0.22;
    animal.add(neck, pointedEar(this.assets, fur, -0.34, 3.24), pointedEar(this.assets, fur, 0.34, 3.24));
    addFace(animal, this.assets, 0, 2.82, 0.42, 0.23);
    for (const side of [-1, 1]) {
      const antler = limb(this.assets, dark, side * 0.2, 3.48, 0, 0.045, 0.7);
      antler.rotation.z = side * -0.2;
      animal.add(antler);
    }
    animal.scale.setScalar(0.84);
    return animal;
  }

  private createFox(): THREE.Group {
    const animal = new THREE.Group();
    animal.name = 'FoxSpectator';
    const orange = this.assets.material(0xd9672f, 0.9);
    const cream = this.assets.material(0xffe0ad, 0.96);
    animal.add(
      ellipsoid(this.assets.sphere, orange, 0, 0.78, 0, 0.78, 0.7, 0.55),
      ellipsoid(this.assets.sphere, orange, 0, 1.58, 0.06, 0.55, 0.52, 0.48),
      ellipsoid(this.assets.sphere, cream, 0, 1.42, 0.43, 0.34, 0.3, 0.15),
      pointedEar(this.assets, orange, -0.34, 2.08),
      pointedEar(this.assets, orange, 0.34, 2.08),
    );
    addFace(animal, this.assets, 0, 1.63, 0.48, 0.23);
    const tail = ellipsoid(this.assets.softBlob, orange, -0.9, 0.73, -0.15, 0.85, 0.35, 0.38);
    tail.rotation.z = 0.6;
    const tip = ellipsoid(this.assets.softBlob, cream, -1.35, 1.12, -0.15, 0.3, 0.26, 0.28);
    const leftArm = cheeringArm(this.assets, orange, -0.5, 1.02, 0.34, -0.48);
    const rightArm = cheeringArm(this.assets, orange, 0.5, 1.02, 0.34, 0.48);
    animal.add(tail, tip, leftArm, rightArm);
    animal.scale.setScalar(0.9);
    return animal;
  }

  private createHedgehog(): THREE.Group {
    const animal = new THREE.Group();
    animal.name = 'HedgehogSpectator';
    const spikes = this.assets.material(0x6f442c, 1);
    const face = this.assets.material(0xc88b58, 0.96);
    animal.add(
      ellipsoid(this.assets.softBlob, spikes, 0, 0.55, 0, 0.72, 0.58, 0.6),
      ellipsoid(this.assets.sphere, face, 0, 0.5, 0.5, 0.47, 0.44, 0.34),
    );
    addFace(animal, this.assets, 0, 0.6, 0.8, 0.18);
    for (let index = 0; index < 9; index += 1) {
      const angle = index / 9 * Math.PI * 2;
      const spike = new THREE.Mesh(this.assets.cone, spikes);
      spike.scale.set(0.12, 0.38, 0.12);
      spike.position.set(Math.cos(angle) * 0.48, 0.83, Math.sin(angle) * 0.38);
      spike.rotation.z = Math.cos(angle) * -0.55;
      spike.rotation.x = Math.sin(angle) * 0.55;
      spike.castShadow = true;
      animal.add(spike);
    }
    return animal;
  }

  private createBirdAudience(): THREE.Group {
    const audience = new THREE.Group();
    audience.name = 'BirdSpectators';
    [0x348fd0, 0xe9a22e, 0x67a74a].forEach((color, index) => {
      const bird = new THREE.Group();
      const feathers = this.assets.material(color, 0.88);
      bird.add(
        ellipsoid(this.assets.sphere, feathers, 0, 0.62, 0, 0.3, 0.42, 0.3),
        ellipsoid(this.assets.sphere, feathers, 0, 1.02, 0.08, 0.25, 0.25, 0.25),
      );
      addFace(bird, this.assets, 0, 1.06, 0.26, 0.11);
      bird.position.x = (index - 1) * 0.75;
      bird.userData.baseY = bird.position.y;
      audience.add(bird);
    });
    return audience;
  }
}

function trailCenterX(localZ: number): number {
  const t = THREE.MathUtils.clamp((TRAIL_START_LOCAL_Z - localZ) / (TRAIL_START_LOCAL_Z - TRAIL_END_LOCAL_Z), 0, 1);
  return Math.sin(t * Math.PI * 2.25) * (0.7 + t * 3.3) + Math.sin(t * Math.PI * 4.2) * 0.55;
}

function ellipsoid(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function limb(
  assets: ForestAssets,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
): THREE.Mesh {
  return ellipsoid(assets.unitCylinder, material, x, y, z, radius, height, radius);
}

function pointedEar(assets: ForestAssets, material: THREE.Material, x: number, y: number): THREE.Mesh {
  const ear = ellipsoid(assets.cone, material, x, y, 0, 0.2, 0.48, 0.16);
  ear.rotation.z = x < 0 ? 0.13 : -0.13;
  return ear;
}

function addFace(animal: THREE.Group, assets: ForestAssets, x: number, y: number, z: number, scale: number): void {
  const white = assets.material(0xffffff, 0.8);
  const black = assets.material(0x241a16, 0.84);
  for (const side of [-1, 1]) {
    animal.add(
      ellipsoid(assets.sphere, white, x + side * scale * 0.65, y, z, scale * 0.48, scale * 0.58, scale * 0.25),
      ellipsoid(assets.sphere, black, x + side * scale * 0.65, y, z + scale * 0.2, scale * 0.2, scale * 0.28, scale * 0.13),
    );
  }
  animal.add(ellipsoid(assets.sphere, black, x, y - scale * 0.45, z + scale * 0.26, scale * 0.23, scale * 0.16, scale * 0.16));
  const smileCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(x - scale * 0.34, y - scale * 0.68, z + scale * 0.3),
    new THREE.Vector3(x, y - scale * 0.9, z + scale * 0.38),
    new THREE.Vector3(x + scale * 0.34, y - scale * 0.68, z + scale * 0.3),
  );
  const smile = new THREE.Mesh(
    new THREE.TubeGeometry(smileCurve, 10, scale * 0.045, 5, false),
    black,
  );
  smile.castShadow = true;
  animal.add(smile);
}

function cheeringArm(
  assets: ForestAssets,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rotationZ: number,
): THREE.Mesh {
  const arm = limb(assets, material, x, y, z, 0.1, 0.52);
  arm.rotation.z = rotationZ;
  arm.userData.cheerArm = true;
  arm.userData.cheerDirection = Math.sign(rotationZ) || 1;
  arm.userData.baseRotationZ = rotationZ;
  return arm;
}

function seededRandom(initialSeed: number): () => number {
  let seed = initialSeed;
  return () => {
    seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
