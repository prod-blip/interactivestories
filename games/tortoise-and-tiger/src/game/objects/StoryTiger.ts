import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const TIGER_ANIMATIONS = {
  calmIdle: 'Tiger_Calm_Idle',
  disappointed: 'Tiger_Disappointed_Head_Drop',
  bite: 'Tiger_Mouth_Open_Bite',
  sniff: 'Tiger_Neck_Bend_Sniff',
  walk: 'Tiger_Simple_Walk',
} as const;

const TIGER_TARGET_HEIGHT = 2.62;

export type TigerDiagnostics = {
  file: string;
  meshes: number;
  materials: number;
  textures: number;
  triangles: number;
  animations: string[];
  rigJoints: string[];
};

export class StoryTiger {
  readonly group = new THREE.Group();
  private mixer: THREE.AnimationMixer | undefined;
  private action: THREE.AnimationAction | undefined;
  private model: THREE.Object3D | undefined;
  private contactShadow: THREE.Mesh | undefined;
  private readonly clips = new Map<string, THREE.AnimationClip>();
  private currentAnimation = '';
  private readonly pawChains: THREE.Bone[][] = [];
  private readonly pawEffectors: THREE.Bone[] = [];
  private activePawIndex = -1;
  private readonly jointPosition = new THREE.Vector3();
  private readonly effectorPosition = new THREE.Vector3();
  private readonly effectorDirection = new THREE.Vector3();
  private readonly targetDirection = new THREE.Vector3();
  private readonly worldRotation = new THREE.Quaternion();
  private readonly parentWorldRotation = new THREE.Quaternion();
  private readonly localRotation = new THREE.Quaternion();
  private readonly desiredJointRotation = new THREE.Quaternion();
  private readonly bonePosition = new THREE.Vector3();
  private readonly throwNeckBones: { bone: THREE.Bone; weight: number }[] = [];
  private throwPoseAmount = 0;
  private appliedThrowPoseAmount = 0;
  diagnostics: TigerDiagnostics | undefined;

  constructor() {
    this.group.name = 'HungryTiger';
    this.group.visible = false;
  }

  async load(url: string): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(url);
    this.model = gltf.scene;
    this.model.name = 'TigerModel';

    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    let meshes = 0;
    let triangles = 0;
    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      meshes += 1;
      // The animated tiger is too dense to render into the directional-light
      // shadow map every frame. A lightweight contact shadow below grounds it
      // without submitting the full skinned mesh to a second render pass.
      child.castShadow = false;
      child.receiveShadow = true;
      triangles += child.geometry.index
        ? child.geometry.index.count / 3
        : child.geometry.getAttribute('position').count / 3;
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach((material) => {
        materials.add(material);
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) textures.add(value);
        });
      });
    });

    this.model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.model);
    const height = Math.max(bounds.getSize(new THREE.Vector3()).y, 0.001);
    this.model.scale.setScalar(TIGER_TARGET_HEIGHT / height);
    this.model.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(this.model);
    const center = scaledBounds.getCenter(new THREE.Vector3());
    this.model.position.x -= center.x;
    this.model.position.z -= center.z;
    this.model.position.y -= scaledBounds.min.y;
    this.group.add(this.model);

    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 24),
      new THREE.MeshBasicMaterial({
        color: 0x294b32,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    );
    contactShadow.name = 'TigerContactShadow';
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.scale.set(1.05, 2.15, 1);
    this.group.add(contactShadow);
    this.contactShadow = contactShadow;

    this.mixer = new THREE.AnimationMixer(this.model);
    gltf.animations.forEach((clip) => this.clips.set(clip.name, clip));
    for (const side of ['L', 'R']) {
      const shoulder = this.model.getObjectByName(`shoulder${side}`);
      const thigh = this.model.getObjectByName(`front_thigh${side}`);
      const shin = this.model.getObjectByName(`front_shin${side}`);
      const toe = this.model.getObjectByName(`front_toe${side}`);
      if (
        shoulder instanceof THREE.Bone
        && thigh instanceof THREE.Bone
        && shin instanceof THREE.Bone
        && toe instanceof THREE.Bone
      ) {
        this.pawChains.push([shin, thigh, shoulder]);
        this.pawEffectors.push(toe);
      }
    }
    [
      ['spine009', 0.22],
      ['spine010', 0.33],
      ['spine011', 0.45],
    ].forEach(([name, weight]) => {
      const bone = this.model?.getObjectByName(name as string);
      if (bone instanceof THREE.Bone) {
        this.throwNeckBones.push({ bone, weight: weight as number });
      }
    });
    this.playAnimation(TIGER_ANIMATIONS.calmIdle, 0, 0.8);

    const rigJoints: string[] = [];
    this.model.traverse((child) => {
      if (child instanceof THREE.Bone) rigJoints.push(child.name);
    });
    this.diagnostics = {
      file: url,
      meshes,
      materials: materials.size,
      textures: textures.size,
      triangles: Math.round(triangles),
      animations: gltf.animations.map((clip) => clip.name),
      rigJoints,
    };
  }

  playAnimation(name: string, fadeDuration = 0.35, speed = 1): boolean {
    return this.startAnimation(name, fadeDuration, speed, false, false);
  }

  playAnimationOnce(name: string, fadeDuration = 0.2, speed = 1, holdFinalPose = true): boolean {
    return this.startAnimation(name, fadeDuration, speed, true, holdFinalPose);
  }

  setCurrentAnimationProgress(progress: number): void {
    if (!this.action) return;
    this.action.time = this.action.getClip().duration * THREE.MathUtils.clamp(progress, 0, 0.999);
    this.action.paused = true;
    this.mixer?.update(0);
  }

  private startAnimation(
    name: string,
    fadeDuration: number,
    speed: number,
    playOnce: boolean,
    holdFinalPose: boolean,
  ): boolean {
    if (!this.mixer) return false;
    const clip = this.clips.get(name);
    if (!clip) {
      console.warn(`Tiger animation not found: ${name}`);
      return false;
    }
    if (this.currentAnimation === name && this.action) {
      if (playOnce) this.action.reset();
      if (speed < 0) this.action.time = clip.duration;
      this.action.paused = false;
      this.action.clampWhenFinished = playOnce && holdFinalPose;
      this.action.setLoop(playOnce ? THREE.LoopOnce : THREE.LoopRepeat, playOnce ? 1 : Infinity);
      this.action.setEffectiveTimeScale(speed);
      this.action.play();
      return true;
    }
    const next = this.mixer.clipAction(clip);
    next.reset().setLoop(playOnce ? THREE.LoopOnce : THREE.LoopRepeat, playOnce ? 1 : Infinity);
    if (speed < 0) next.time = clip.duration;
    next.clampWhenFinished = playOnce && holdFinalPose;
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.setEffectiveTimeScale(speed);
    if (fadeDuration > 0) next.fadeIn(fadeDuration);
    next.play();
    if (this.action && this.action !== next) {
      if (fadeDuration > 0) this.action.fadeOut(fadeDuration);
      else this.action.stop();
    }
    this.action = next;
    this.currentAnimation = name;
    return true;
  }

  update(delta: number): void {
    if (!this.group.visible) return;
    // Scene continuity uses slightly different tiger Y offsets. Keep the
    // contact shadow on the riverbank instead of letting it move below ground.
    if (this.contactShadow) this.contactShadow.position.y = -this.group.position.y + 0.015;
    this.applyThrowPose(-this.appliedThrowPoseAmount);
    this.mixer?.update(delta);
    this.applyThrowPose(this.throwPoseAmount);
    this.appliedThrowPoseAmount = this.throwPoseAmount;
  }

  setThrowPose(amount: number): void {
    this.throwPoseAmount = THREE.MathUtils.clamp(amount, -1, 1);
  }

  getThrowPose(): number {
    return this.throwPoseAmount;
  }

  private applyThrowPose(amount: number): void {
    if (Math.abs(amount) < 0.00001) return;
    const maximumBend = 0.16;
    this.throwNeckBones.forEach(({ bone, weight }) => {
      bone.rotateX(amount * maximumBend * weight);
    });
  }

  getCurrentAnimation(): string {
    return this.currentAnimation;
  }

  getBoneWorldPosition(name: string, target: THREE.Vector3): boolean {
    if (!this.model) return false;
    const bone = this.model.getObjectByName(name);
    if (!bone) return false;
    this.group.updateMatrixWorld(true);
    bone.getWorldPosition(target);
    return true;
  }

  getBoneDistanceTo(name: string, targetWorld: THREE.Vector3): number | undefined {
    if (!this.getBoneWorldPosition(name, this.bonePosition)) return undefined;
    return this.bonePosition.distanceTo(targetWorld);
  }

  poseFrontPawAt(targetWorld: THREE.Vector3, amount: number): number | undefined {
    if (!this.model || this.pawEffectors.length === 0 || amount <= 0) {
      this.activePawIndex = -1;
      return undefined;
    }
    this.group.updateMatrixWorld(true);
    if (this.activePawIndex < 0) {
      let closestDistance = Infinity;
      this.pawEffectors.forEach((effector, index) => {
        effector.getWorldPosition(this.effectorPosition);
        const distance = this.effectorPosition.distanceToSquared(targetWorld);
        if (distance < closestDistance) {
          closestDistance = distance;
          this.activePawIndex = index;
        }
      });
    }

    const chain = this.pawChains[this.activePawIndex];
    const effector = this.pawEffectors[this.activePawIndex];
    if (!chain || !effector) return undefined;
    const influence = THREE.MathUtils.smoothstep(amount, 0, 1);

    for (let iteration = 0; iteration < 4; iteration += 1) {
      for (const joint of chain) {
        this.group.updateMatrixWorld(true);
        joint.getWorldPosition(this.jointPosition);
        effector.getWorldPosition(this.effectorPosition);
        this.effectorDirection.copy(this.effectorPosition).sub(this.jointPosition);
        this.targetDirection.copy(targetWorld).sub(this.jointPosition);
        if (this.effectorDirection.lengthSq() < 0.000001 || this.targetDirection.lengthSq() < 0.000001) continue;
        this.effectorDirection.normalize();
        this.targetDirection.normalize();
        this.worldRotation.setFromUnitVectors(this.effectorDirection, this.targetDirection);
        joint.parent?.getWorldQuaternion(this.parentWorldRotation);
        this.localRotation
          .copy(this.parentWorldRotation)
          .invert()
          .multiply(this.worldRotation)
          .multiply(this.parentWorldRotation);
        this.desiredJointRotation.copy(this.localRotation).multiply(joint.quaternion);
        joint.quaternion.slerp(this.desiredJointRotation, influence);
      }
    }
    this.group.updateMatrixWorld(true);
    effector.getWorldPosition(this.effectorPosition);
    return this.effectorPosition.distanceTo(targetWorld);
  }

  clearPawTarget(): void {
    this.activePawIndex = -1;
  }

  dispose(): void {
    this.mixer?.stopAllAction();
    this.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    });
    this.group.clear();
    this.clips.clear();
    this.pawChains.length = 0;
    this.pawEffectors.length = 0;
    this.activePawIndex = -1;
    this.contactShadow = undefined;
  }
}
