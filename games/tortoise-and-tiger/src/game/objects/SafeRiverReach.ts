import * as THREE from 'three';
import type { ForestRiverWorld } from './ForestRiverWorld';
import type { RiverObstacle } from './RiverEscapeCourse';

type FloatingDetail = {
  object: THREE.Object3D;
  baseY: number;
  phase: number;
};

export class SafeRiverReach {
  readonly group = new THREE.Group();
  readonly obstacles: RiverObstacle[] = [];
  private readonly floatingDetails: FloatingDetail[] = [];
  private readonly safeZone = new THREE.Vector3();
  private readonly endingRockPosition = new THREE.Vector3();
  private readonly safeRings = new THREE.Group();
  private startZ = 0;
  private finishZ = 0;
  private elapsed = 0;
  private configured = false;

  constructor(private readonly world: ForestRiverWorld) {
    this.group.name = 'SafeRiverReach';
    this.group.visible = false;
  }

  configure(startZ: number): void {
    if (this.configured && Math.abs(this.startZ - startZ) < 0.001) {
      this.elapsed = 0;
      return;
    }
    this.group.clear();
    this.obstacles.length = 0;
    this.floatingDetails.length = 0;
    this.safeRings.clear();
    this.elapsed = 0;
    this.startZ = startZ;
    this.finishZ = startZ - 24;
    this.configured = true;

    this.addLargeRock(startZ - 5.3);
    this.addFallenBranch(startZ - 10.4);
    this.addLilyGate(startZ - 15.6);
    this.addSafeBank();
  }

  update(delta: number): void {
    if (!this.group.visible) return;
    this.elapsed += delta;
    this.floatingDetails.forEach(({ object, baseY, phase }) => {
      object.position.y = baseY + Math.sin(this.elapsed * 1.7 + phase) * 0.018;
    });
    this.safeRings.children.forEach((child, index) => {
      const pulse = 1 + Math.sin(this.elapsed * 2.2 - index * 0.75) * 0.08;
      child.scale.setScalar(pulse);
      child.rotation.z += delta * (index % 2 === 0 ? 0.08 : -0.06);
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.opacity = 0.34 + Math.sin(this.elapsed * 2.5 - index) * 0.1;
      }
    });
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  isVisible(): boolean {
    return this.group.visible;
  }

  setSafeZoneGlowVisible(visible: boolean): void {
    this.safeRings.visible = visible;
  }

  getStartZ(): number {
    return this.startZ;
  }

  getFinishZ(): number {
    return this.finishZ;
  }

  getProgress(z: number): number {
    return THREE.MathUtils.clamp((this.startZ - z) / (this.startZ - this.finishZ), 0, 1);
  }

  getSafeZone(target: THREE.Vector3): THREE.Vector3 {
    return target.copy(this.safeZone);
  }

  getEndingRockPosition(target: THREE.Vector3): THREE.Vector3 {
    return target.copy(this.endingRockPosition);
  }

  distanceToSafeZone(position: THREE.Vector3): number {
    return Math.hypot(position.x - this.safeZone.x, position.z - this.safeZone.z);
  }

  isReached(position: THREE.Vector3): boolean {
    return this.distanceToSafeZone(position) <= 1.5;
  }

  private laneX(z: number, lane: number): number {
    return this.world.riverCenterAt(z) + lane * this.world.riverWidthAt(z) * 0.36;
  }

  private addLargeRock(z: number): void {
    const position = new THREE.Vector3(this.laneX(z, -0.02), 0.04, z);
    const material = new THREE.MeshStandardMaterial({
      color: 0x758a83,
      roughness: 0.98,
      flatShading: true,
    });
    const group = new THREE.Group();
    group.name = 'SafeReachLargeRock';
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 1), material);
    rock.scale.set(1.15, 0.78, 0.96);
    rock.rotation.set(0.08, 0.72, -0.06);
    rock.receiveShadow = true;
    group.add(rock);
    const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), material.clone());
    cap.position.set(-0.9, 0.15, 0.2);
    cap.scale.set(0.9, 0.6, 0.8);
    group.add(cap);
    group.position.copy(position);
    this.group.add(group);
    this.obstacles.push({
      id: 'safe-large-rock',
      kind: 'rock',
      position,
      radius: 1.72,
      speedFactor: 0.52,
      drift: 0.85,
    });
  }

  private addFallenBranch(z: number): void {
    const center = this.world.riverCenterAt(z) + this.world.riverWidthAt(z) * 0.04;
    const group = new THREE.Group();
    group.name = 'SafeReachFallenBranch';
    const bark = new THREE.MeshStandardMaterial({ color: 0x825036, roughness: 0.96 });
    const cut = new THREE.MeshStandardMaterial({ color: 0xc28b58, roughness: 0.92 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 8.6, 10), bark);
    trunk.rotation.z = Math.PI / 2;
    trunk.rotation.y = 0.12;
    group.add(trunk);
    for (const side of [-1, 1]) {
      const end = new THREE.Mesh(new THREE.CircleGeometry(side < 0 ? 0.15 : 0.21, 10), cut);
      end.position.x = side * 4.3;
      end.rotation.y = side * Math.PI / 2;
      group.add(end);
    }
    for (const offset of [-2.3, 1.65, 2.8]) {
      const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.09, 1.25, 7), bark);
      twig.position.set(offset, 0.28, 0);
      twig.rotation.z = offset < 0 ? -0.72 : 0.82;
      group.add(twig);
    }
    group.position.set(center, 1.76, z);
    group.rotation.y = 0.08;
    this.group.add(group);
  }

  private addLilyGate(z: number): void {
    this.addLilies('safe-lilies-left', z, -0.2, -0.34);
    this.addLilies('safe-lilies-right', z - 0.45, 0.23, 0.34);
  }

  private addLilies(id: string, z: number, lane: number, drift: number): void {
    const position = new THREE.Vector3(this.laneX(z, lane), 0.17, z);
    const group = new THREE.Group();
    group.name = id;
    for (let index = 0; index < 4; index += 1) {
      const pad = new THREE.Mesh(
        new THREE.CircleGeometry(0.38 + (index % 2) * 0.08, 18, 0.3, Math.PI * 1.78),
        new THREE.MeshStandardMaterial({
          color: index % 2 ? 0x69b86b : 0x4f9f60,
          roughness: 0.9,
        }),
      );
      pad.rotation.x = -Math.PI / 2;
      pad.rotation.z = index * 1.31;
      pad.position.set((index - 1.5) * 0.38, (index % 2) * 0.012, Math.sin(index * 1.7) * 0.34);
      group.add(pad);
    }
    group.position.copy(position);
    this.group.add(group);
    this.floatingDetails.push({ object: group, baseY: position.y, phase: lane * 7 });
    this.obstacles.push({ id, kind: 'lilies', position, radius: 1.02, speedFactor: 0.8, drift });
  }

  private addSafeBank(): void {
    const z = this.finishZ;
    const center = this.world.riverCenterAt(z);
    const width = this.world.riverWidthAt(z);
    this.safeZone.set(center + width * 0.38, 0.02, z);

    this.safeRings.name = 'GlowingSafeZone';
    this.safeRings.visible = true;
    this.safeRings.position.copy(this.safeZone);
    this.safeRings.position.y = 0.12;
    for (let index = 0; index < 3; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.95 + index * 0.38, 1.04 + index * 0.38, 40),
        new THREE.MeshBasicMaterial({
          color: index === 0 ? 0xffef9a : 0xd8ffd0,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 2;
      this.safeRings.add(ring);
    }
    this.group.add(this.safeRings);

    this.endingRockPosition.set(center + width * 0.47, 0.78, z - 1.05);
    const endingRock = new THREE.Group();
    endingRock.name = 'TortoiseEndingRock';
    endingRock.position.set(this.endingRockPosition.x, 0.25, this.endingRockPosition.z);
    const stone = new THREE.MeshStandardMaterial({
      color: 0x82958d,
      roughness: 0.98,
      flatShading: true,
    });
    const moss = new THREE.MeshStandardMaterial({
      color: 0x719b5d,
      roughness: 0.98,
      flatShading: true,
    });
    const baseRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.28, 1), stone);
    baseRock.scale.set(1.25, 0.44, 0.92);
    baseRock.rotation.set(0.03, 0.46, -0.04);
    baseRock.receiveShadow = true;
    const mossCap = new THREE.Mesh(new THREE.SphereGeometry(0.86, 12, 7), moss);
    mossCap.position.set(-0.12, 0.42, -0.04);
    mossCap.scale.set(1.2, 0.12, 0.76);
    endingRock.add(baseRock, mossCap);
    this.group.add(endingRock);

    const bank = new THREE.Group();
    bank.name = 'PeacefulSafeRiverbank';
    bank.position.set(center + width * 0.49, 0, z - 0.3);
    const grass = new THREE.MeshStandardMaterial({ color: 0x78bd62, roughness: 0.96 });
    const stems = new THREE.MeshStandardMaterial({ color: 0x438b4d, roughness: 0.95 });
    const flowerColors = [0xffd05e, 0xff8ca5, 0xf4f0b7, 0x9b85e8];
    for (let index = 0; index < 8; index += 1) {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.42 + (index % 3) * 0.12, 10, 7), grass);
      mound.scale.y = 0.32;
      mound.position.set((index % 3) * 0.72, -0.22, (Math.floor(index / 3) - 1) * 0.75);
      bank.add(mound);
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 6),
        new THREE.MeshStandardMaterial({ color: flowerColors[index % flowerColors.length], roughness: 0.82 }),
      );
      flower.position.copy(mound.position);
      flower.position.y = 0.14 + (index % 2) * 0.08;
      const stemHeight = flower.position.y + 0.08;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, stemHeight, 5), stems);
      stem.position.copy(mound.position);
      stem.position.y = flower.position.y - stemHeight * 0.5;
      bank.add(stem, flower);
    }
    this.group.add(bank);
  }
}
