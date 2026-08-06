import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { InputState } from '../types';

export type MovementBounds = { minX: number; maxX: number; minZ: number; maxZ: number };

const CLIPS = {
  idle: 'Perched_Idle',
  takeoff: 'Takeoff',
  fly: 'Fly_Loop',
  land: 'Land',
} as const;

export class Crow {
  readonly group = new THREE.Group();
  private readonly carriedPebbleAnchor = new THREE.Group();
  private readonly beakTipAnchor = new THREE.Group();
  private readonly beakWorldPosition = new THREE.Vector3();
  private readonly beakCorrection = new THREE.Vector3();
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private readonly legMeshes: THREE.Object3D[] = [];
  private currentAction: THREE.AnimationAction | null = null;
  private nextLoop: string | null = null;
  private transitionRemaining = 0;
  private wasMoving = false;
  private reducedMotion = false;
  private flightHeight = 0;
  private flightPitch = 0;
  private lookingDown = false;
  private drinking = false;
  private drinkingElapsed = 0;
  private readonly flightDirection = new THREE.Vector2(0, -1);
  private flightSpeed = 2.35;

  constructor() {
    this.group.position.set(0, 0, 7);
    this.carriedPebbleAnchor.name = 'Pebble_Carry_Anchor';
    this.beakTipAnchor.name = 'Beak_Tip_Anchor';
  }

  get isFlying(): boolean {
    return this.wasMoving;
  }

  async load(url: string): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(url);
    this.model = gltf.scene;
    this.model.name = 'Crow_Model';
    this.model.scale.setScalar(0.9);
    // The Blender crow faces +Z; the game treats local -Z as forward.
    this.model.rotation.y = Math.PI;
    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (/^Leg_[LR](?:_\d+)?$/.test(child.name)) this.legMeshes.push(child);
    });
    this.group.add(this.model);

    this.mixer = new THREE.AnimationMixer(this.model);
    this.mixer.timeScale = this.reducedMotion ? 0.65 : 1;
    const takeoffClip = THREE.AnimationClip.findByName(gltf.animations, CLIPS.takeoff);
    const flightClip = THREE.AnimationClip.findByName(gltf.animations, CLIPS.fly);
    if (takeoffClip && flightClip) {
      this.rebuildFlightWingCycle(flightClip, takeoffClip);
      this.stabilizeFlightWingRoots(flightClip);
    }
    for (const clip of gltf.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.assertRequiredClips();

    const head = this.model.getObjectByName('Head');
    if (!head) throw new Error('The crow model is missing its Head joint.');
    this.carriedPebbleAnchor.position.set(0, 0.03, 0.43);
    // The crow mesh has no separately named beak object. This point follows
    // the animated Head joint and represents the actual tip of the beak.
    this.beakTipAnchor.position.set(0, 0.015, 0.5);
    head.add(this.carriedPebbleAnchor, this.beakTipAnchor);
    this.playLoop(CLIPS.idle, 0);
  }

  update(delta: number, input: InputState, enabled: boolean, bounds: MovementBounds): number {
    const x = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.moveX;
    const z = (input.down ? 1 : 0) - (input.up ? 1 : 0) + input.moveY;
    const length = Math.hypot(x, z);
    const moving = enabled && length > 0.08;
    const speed = moving ? 3.4 : 0;

    if (moving) {
      const nx = x / Math.max(1, length);
      const nz = z / Math.max(1, length);
      this.group.position.x += nx * speed * delta;
      this.group.position.z += nz * speed * delta;
      this.group.rotation.y = Math.atan2(-nx, -nz);
    }

    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, bounds.minX, bounds.maxX);
    this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, bounds.minZ, bounds.maxZ);
    const targetHeight = moving ? 0.72 : 0;
    const heightResponse = this.reducedMotion ? 3 : 5;
    this.flightHeight = THREE.MathUtils.lerp(this.flightHeight, targetHeight, 1 - Math.exp(-delta * heightResponse));
    this.group.position.y = this.flightHeight;
    this.updateAnimation(delta, moving);
    return speed * delta;
  }

  updateCinematicFlight(delta: number): void {
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, 0, 1 - Math.exp(-delta * 2));
    this.flightHeight = THREE.MathUtils.lerp(this.flightHeight, 1.75, 1 - Math.exp(-delta * 2.2));
    this.group.position.y = this.flightHeight;
    this.updateAnimation(delta, true);
  }

  updateOpenFlight(delta: number, input: InputState, enabled: boolean): number {
    const inputX = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.moveX;
    const inputZ = (input.down ? 1 : 0) - (input.up ? 1 : 0) + input.moveY;
    const inputLength = Math.hypot(inputX, inputZ);
    const hasDirection = inputLength > 0.08;
    const boost = input.wheelBoost * 2.8 + (input.action ? 1.9 : 0);
    const glideSpeed = 2.35 + boost;
    const directionalSpeed = 5.45 + boost;

    if (enabled) {
      if (hasDirection) this.flightDirection.set(inputX / inputLength, inputZ / inputLength);
      const response = hasDirection ? 5.2 : 2.4;
      const targetSpeed = hasDirection ? directionalSpeed : glideSpeed;
      this.flightSpeed = THREE.MathUtils.lerp(this.flightSpeed, targetSpeed, 1 - Math.exp(-delta * response));
      this.group.position.x += this.flightDirection.x * this.flightSpeed * delta;
      this.group.position.z += this.flightDirection.y * this.flightSpeed * delta;

      const desiredRotation = Math.atan2(-this.flightDirection.x, -this.flightDirection.y);
      let rotationDifference = desiredRotation - this.group.rotation.y;
      rotationDifference = Math.atan2(Math.sin(rotationDifference), Math.cos(rotationDifference));
      this.group.rotation.y += rotationDifference * (1 - Math.exp(-delta * 7));
    }
    this.flightHeight = THREE.MathUtils.lerp(this.flightHeight, 1.75, 1 - Math.exp(-delta * 2.8));
    this.group.position.y = this.flightHeight;
    this.updateAnimation(delta, enabled);
    return this.flightSpeed * delta;
  }

  nudgeFlightToward(target: THREE.Vector3, delta: number, strength: number): void {
    const desired = new THREE.Vector2(target.x - this.group.position.x, target.z - this.group.position.z);
    if (desired.lengthSq() < 0.01) return;
    desired.normalize();
    this.flightDirection.lerp(desired, 1 - Math.exp(-delta * strength)).normalize();
  }

  updatePose(delta: number, flying = false): void {
    this.updateAnimation(delta, flying);
  }

  turnToward(target: THREE.Vector3, delta: number): void {
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    const desired = Math.atan2(-dx, -dz);
    let difference = desired - this.group.rotation.y;
    difference = Math.atan2(Math.sin(difference), Math.cos(difference));
    this.group.rotation.y += difference * (1 - Math.exp(-delta * 2.2));
  }

  faceToward(target: THREE.Vector3): void {
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    this.group.rotation.y = Math.atan2(-dx, -dz);
  }

  setLookingDown(lookingDown: boolean): void {
    this.lookingDown = lookingDown;
  }

  setDrinking(drinking: boolean): void {
    this.drinking = drinking;
    if (drinking) this.drinkingElapsed = 0;
  }

  syncFlightHeightToPosition(): void {
    this.flightHeight = this.group.position.y;
  }

  alignBeakTo(target: THREE.Vector3): void {
    this.group.updateWorldMatrix(true, true);
    this.beakTipAnchor.getWorldPosition(this.beakWorldPosition);
    this.beakCorrection.copy(target).sub(this.beakWorldPosition);
    // Resolve the animated beak point exactly onto the water target. The
    // animation can continue changing the pose while contact stays locked.
    this.group.position.add(this.beakCorrection);
  }

  updateDeparture(delta: number): void {
    this.group.rotation.y = 0;
    this.group.position.z -= delta * 3.1;
    this.group.position.y = THREE.MathUtils.damp(this.group.position.y, 12.5, 0.72, delta);
    this.updateAnimation(delta, true);
  }

  carry(mesh: THREE.Object3D): void {
    mesh.removeFromParent();
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.setScalar(0.72);
    this.carriedPebbleAnchor.add(mesh);
  }

  releaseCarried(): THREE.Object3D | null {
    const pebble = this.carriedPebbleAnchor.children[0] ?? null;
    pebble?.removeFromParent();
    return pebble;
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (this.mixer) this.mixer.timeScale = reduced ? 0.65 : 1;
  }

  dispose(): void {
    if (this.mixer && this.model) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.model);
    }
    this.model?.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    });
    this.actions.clear();
  }

  private updateAnimation(delta: number, moving: boolean): void {
    this.drinkingElapsed += delta;
    if (moving !== this.wasMoving) {
      this.wasMoving = moving;
      if (moving) this.playOnce(CLIPS.takeoff, CLIPS.fly);
      else this.playOnce(CLIPS.land, CLIPS.idle);
    }

    if (this.transitionRemaining > 0) {
      this.transitionRemaining -= delta * (this.reducedMotion ? 0.65 : 1);
      if (this.transitionRemaining <= 0 && this.nextLoop) {
        this.playLoop(this.wasMoving ? CLIPS.fly : CLIPS.idle);
      }
    }
    this.mixer?.update(delta);
    const inFlightLoop = moving && this.currentAction?.getClip().name === CLIPS.fly;
    const sip = this.drinking ? (Math.sin(this.drinkingElapsed * 3.8) + 1) * 0.5 : 0;
    const targetPitch = this.drinking
      ? THREE.MathUtils.degToRad(-38 - sip * 8)
      : inFlightLoop
        ? THREE.MathUtils.degToRad(-12)
        : this.lookingDown
          ? THREE.MathUtils.degToRad(-24)
          : 0;
    this.flightPitch = THREE.MathUtils.damp(this.flightPitch, targetPitch, 6.5, delta);
    if (this.model) {
      this.model.rotation.x = this.flightPitch;
      this.model.position.y = THREE.MathUtils.damp(this.model.position.y, this.drinking ? -0.08 - sip * 0.045 : 0, 7, delta);
      this.model.position.z = THREE.MathUtils.damp(this.model.position.z, this.drinking ? -0.12 - sip * 0.035 : 0, 7, delta);
    }
    this.legMeshes.forEach((leg) => { leg.visible = !moving; });
  }

  private playOnce(name: string, nextLoop: string): void {
    const action = this.actions.get(name);
    if (!action) return;
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.reset();
    this.fadeTo(action, 0.16);
    action.play();
    this.transitionRemaining = action.getClip().duration;
    this.nextLoop = nextLoop;
  }

  private playLoop(name: string, fadeDuration = 0.2): void {
    const action = this.actions.get(name);
    if (!action) return;
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.reset();
    this.fadeTo(action, fadeDuration);
    action.play();
    this.transitionRemaining = 0;
    this.nextLoop = null;
  }

  private fadeTo(action: THREE.AnimationAction, duration: number): void {
    if (this.currentAction && this.currentAction !== action) this.currentAction.fadeOut(duration);
    action.fadeIn(duration);
    this.currentAction = action;
  }

  private assertRequiredClips(): void {
    const missing = Object.values(CLIPS).filter((name) => !this.actions.has(name));
    if (missing.length > 0) throw new Error(`The crow model is missing animation clips: ${missing.join(', ')}`);
  }

  private stabilizeFlightWingRoots(clip: THREE.AnimationClip): void {
    const wingRoots = ['Wing_L_Upper', 'Wing_R_Upper'];

    for (const jointName of wingRoots) {
      const joint = this.model?.getObjectByName(jointName);
      const positionTrack = clip.tracks.find((track) => track.name === `${jointName}.position`);
      if (!joint || !positionTrack) continue;

      // Fly_Loop contains accidental location keys that pull the wings away
      // from their shoulders. Lock the roots to the rig's bind position while
      // retaining the authored quaternion tracks that produce the wing flap.
      for (let offset = 0; offset < positionTrack.values.length; offset += 3) {
        positionTrack.values[offset] = joint.position.x;
        positionTrack.values[offset + 1] = joint.position.y;
        positionTrack.values[offset + 2] = joint.position.z;
      }
    }
  }

  private rebuildFlightWingCycle(flightClip: THREE.AnimationClip, takeoffClip: THREE.AnimationClip): void {
    const wingJoints = [
      'Wing_L_Upper',
      'Wing_L_Lower',
      'Wing_L_Tip',
      'Wing_R_Upper',
      'Wing_R_Lower',
      'Wing_R_Tip',
    ];

    for (const jointName of wingJoints) {
      const trackName = `${jointName}.quaternion`;
      const sourceTrack = takeoffClip.tracks.find((track) => track.name === trackName);
      const targetIndex = flightClip.tracks.findIndex((track) => track.name === trackName);
      if (!sourceTrack || targetIndex < 0) continue;

      // The latter three quarters of Takeoff contain its complete articulated
      // stroke. Re-time that section to one second and prepend its final pose,
      // making the transition from Takeoff and the loop seam exactly continuous.
      const firstStrokeKey = sourceTrack.times.findIndex((time) => time >= takeoffClip.duration * 0.25);
      const lastStrokeKey = sourceTrack.times.length - 1;
      if (firstStrokeKey < 0 || lastStrokeKey <= firstStrokeKey) continue;

      const times: number[] = [0];
      const values: number[] = Array.from(sourceTrack.values.slice(lastStrokeKey * 4, lastStrokeKey * 4 + 4));
      const sourceStart = sourceTrack.times[firstStrokeKey];
      const sourceDuration = sourceTrack.times[lastStrokeKey] - sourceStart;

      for (let key = firstStrokeKey; key <= lastStrokeKey; key += 1) {
        const progress = (sourceTrack.times[key] - sourceStart) / sourceDuration;
        times.push(0.18 + progress * 0.82);
        values.push(...sourceTrack.values.slice(key * 4, key * 4 + 4));
      }

      flightClip.tracks[targetIndex] = new THREE.QuaternionKeyframeTrack(trackName, times, values);
    }
  }
}
