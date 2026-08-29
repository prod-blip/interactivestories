import * as THREE from 'three';
import type { ForestRiverWorld } from './ForestRiverWorld';

export type RiverObstacleKind = 'rock' | 'log' | 'lilies' | 'reeds' | 'current';

export type RiverObstacle = {
  id: string;
  kind: RiverObstacleKind;
  position: THREE.Vector3;
  radius: number;
  speedFactor: number;
  drift: number;
};

type FloatingCourseObject = {
  object: THREE.Object3D;
  baseY: number;
  phase: number;
};

export class RiverEscapeCourse {
  readonly group = new THREE.Group();
  readonly obstacles: RiverObstacle[] = [];
  private readonly floating: FloatingCourseObject[] = [];
  private elapsed = 0;
  private startZ = 0;
  private finishZ = 0;
  private configured = false;

  constructor(private readonly world: ForestRiverWorld) {
    this.group.name = 'RiverEscapeCourse';
    this.group.visible = false;
  }

  configure(startZ: number): void {
    if (this.configured && Math.abs(this.startZ - startZ) < 0.001) {
      this.elapsed = 0;
      this.group.visible = true;
      return;
    }
    this.group.clear();
    this.obstacles.length = 0;
    this.floating.length = 0;
    this.elapsed = 0;
    this.startZ = startZ;
    this.finishZ = startZ - 34;
    this.configured = true;

    this.addRock('rock-one', startZ - 6.2, -0.22, 0.9);
    this.addLilies('lilies-one', startZ - 9.5, 0.28);
    this.addLog('log-one', startZ - 13.2, -0.18);
    this.addCurrent('current-one', startZ - 16.3, 0.36, -0.7);
    this.addReeds('reeds-one', startZ - 20.2, -0.3);
    this.addRock('rock-two', startZ - 23.3, 0.24, 1.05);
    this.addLilies('lilies-two', startZ - 25.9, -0.3);
    this.addLog('log-two', startZ - 28.8, 0.22);
    this.addCurrent('current-two', startZ - 31.2, -0.32, 0.65);
    this.group.visible = true;
  }

  update(delta: number): void {
    this.elapsed += delta;
    this.floating.forEach(({ object, baseY, phase }) => {
      object.position.y = baseY + Math.sin(this.elapsed * 1.55 + phase) * 0.025;
      object.rotation.y += delta * 0.018;
    });
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
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

  private laneX(z: number, lane: number): number {
    return this.world.riverCenterAt(z) + lane * this.world.riverWidthAt(z) * 0.36;
  }

  private addRock(id: string, z: number, lane: number, size: number): void {
    const position = new THREE.Vector3(this.laneX(z, lane), 0.02, z);
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size, 0),
      new THREE.MeshStandardMaterial({ color: 0x758a83, roughness: 0.98, flatShading: true }),
    );
    rock.name = `EscapeRock-${id}`;
    rock.position.copy(position);
    rock.scale.set(1.05, 0.74, 0.92);
    rock.rotation.set(0.12, lane * 1.8, -0.08);
    rock.receiveShadow = true;
    this.group.add(rock);
    this.obstacles.push({ id, kind: 'rock', position, radius: size * 1.05, speedFactor: 0.5, drift: lane >= 0 ? -0.8 : 0.8 });
  }

  private addLog(id: string, z: number, lane: number): void {
    const position = new THREE.Vector3(this.laneX(z, lane), 0.2, z);
    const group = new THREE.Group();
    group.name = `EscapeLog-${id}`;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.27, 2.9, 9),
      new THREE.MeshStandardMaterial({ color: 0x8b5737, roughness: 0.95 }),
    );
    trunk.rotation.z = Math.PI / 2;
    group.add(trunk);
    for (const side of [-1, 1]) {
      const end = new THREE.Mesh(
        new THREE.CircleGeometry(side < 0 ? 0.2 : 0.27, 9),
        new THREE.MeshStandardMaterial({ color: 0xc28a56, roughness: 0.9 }),
      );
      end.position.x = side * 1.45;
      end.rotation.y = side * Math.PI / 2;
      group.add(end);
    }
    group.position.copy(position);
    group.rotation.y = lane * 0.55;
    this.group.add(group);
    this.floating.push({ object: group, baseY: position.y, phase: lane * 4 + 1.2 });
    this.obstacles.push({ id, kind: 'log', position, radius: 1.42, speedFactor: 0.58, drift: lane >= 0 ? -0.9 : 0.9 });
  }

  private addLilies(id: string, z: number, lane: number): void {
    const position = new THREE.Vector3(this.laneX(z, lane), 0.17, z);
    const group = new THREE.Group();
    group.name = `EscapeLilies-${id}`;
    for (let index = 0; index < 5; index += 1) {
      const pad = new THREE.Mesh(
        new THREE.CircleGeometry(0.34 + (index % 2) * 0.09, 18, 0.28, Math.PI * 1.78),
        new THREE.MeshStandardMaterial({ color: index % 2 ? 0x62ab64 : 0x4f995c, roughness: 0.9 }),
      );
      pad.rotation.x = -Math.PI / 2;
      pad.rotation.z = index * 1.17;
      pad.position.set((index - 2) * 0.42, (index % 2) * 0.012, Math.sin(index * 2.1) * 0.38);
      group.add(pad);
    }
    group.position.copy(position);
    this.group.add(group);
    this.floating.push({ object: group, baseY: position.y, phase: lane * 5 + 2.4 });
    this.obstacles.push({ id, kind: 'lilies', position, radius: 1.15, speedFactor: 0.78, drift: lane >= 0 ? -0.32 : 0.32 });
  }

  private addReeds(id: string, z: number, lane: number): void {
    const position = new THREE.Vector3(this.laneX(z, lane), 0, z);
    const group = new THREE.Group();
    group.name = `EscapeReeds-${id}`;
    const reedMaterial = new THREE.MeshStandardMaterial({ color: 0x3f8050, roughness: 0.96 });
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x785139, roughness: 0.94 });
    for (let index = 0; index < 8; index += 1) {
      const height = 0.58 + (index % 3) * 0.13;
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, height, 5), reedMaterial);
      reed.position.set((index - 3.5) * 0.16, height * 0.5 - 0.12, Math.sin(index * 1.8) * 0.25);
      reed.rotation.z = Math.sin(index) * 0.06;
      const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.17, 3, 6), headMaterial);
      head.position.copy(reed.position);
      head.position.y += height * 0.52;
      group.add(reed, head);
    }
    group.position.copy(position);
    this.group.add(group);
    this.obstacles.push({ id, kind: 'reeds', position, radius: 1.05, speedFactor: 0.7, drift: lane >= 0 ? -0.48 : 0.48 });
  }

  private addCurrent(id: string, z: number, lane: number, drift: number): void {
    const position = new THREE.Vector3(this.laneX(z, lane), 0.185, z);
    const group = new THREE.Group();
    group.name = `GentleCurrent-${id}`;
    const material = new THREE.MeshBasicMaterial({
      color: 0xb8fff0,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let index = 0; index < 3; index += 1) {
      const ribbon = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.39, 24, 1, 0.35, Math.PI * 1.3), material);
      ribbon.rotation.x = -Math.PI / 2;
      ribbon.rotation.z = drift > 0 ? -0.45 : Math.PI + 0.45;
      ribbon.position.set((index - 1) * 0.58, 0, (index - 1) * 0.28);
      group.add(ribbon);
    }
    group.position.copy(position);
    this.group.add(group);
    this.floating.push({ object: group, baseY: position.y, phase: lane * 3 + 4.1 });
    this.obstacles.push({ id, kind: 'current', position, radius: 1.65, speedFactor: 0.92, drift });
  }

}
