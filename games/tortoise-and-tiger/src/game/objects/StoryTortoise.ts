import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type TortoiseDiagnostics = {
  file: string;
  meshes: number;
  materials: number;
  textures: number;
  triangles: number;
  animations: string[];
  rigJoints: string[];
};

export const TORTOISE_ANIMATIONS = {
  celebrate: 'Turtle_Happy_Escape_Celebration',
  headShake: 'Turtle_Head_Shake',
  idle: 'Turtle_Idle_Breathing',
  peek: 'Turtle_Peek_From_Shell',
  scared: 'Turtle_Scared_Breathing',
  tuck: 'Turtle_Tuck_Into_Shell',
  walk: 'Turtle_Walk',
} as const;

export type TortoiseAnimation = typeof TORTOISE_ANIMATIONS[keyof typeof TORTOISE_ANIMATIONS];

export class StoryTortoise {
  readonly group = new THREE.Group();
  private mixer: THREE.AnimationMixer | undefined;
  private action: THREE.AnimationAction | undefined;
  private model: THREE.Object3D | undefined;
  private contactShadow: THREE.Mesh | undefined;
  private jawBone: THREE.Bone | undefined;
  private neckBaseBone: THREE.Bone | undefined;
  private readonly retractBones: THREE.Bone[] = [];
  private readonly retractBoneScales = new Map<THREE.Bone, THREE.Vector3>();
  private readonly retractMaterials = new Set<THREE.Material>();
  private fullyHidden = false;
  private peekOnly = false;
  private readonly calmJawRotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -0.38,
  );
  private readonly smileJawRotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -0.44,
  );
  private thinkingYaw = 0;
  private appliedThinkingYaw = 0;
  private smiling = false;
  private readonly clips = new Map<string, THREE.AnimationClip>();
  private currentAnimation = '';
  diagnostics: TortoiseDiagnostics | undefined;

  constructor() {
    this.group.name = 'CleverTortoise';
  }

  async load(url: string): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(url);
    this.model = gltf.scene;
    this.model.name = 'TortoiseModel';

    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    let meshes = 0;
    let triangles = 0;
    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      meshes += 1;
      // This hero is dense enough that rendering it into the shadow map would
      // nearly double the scene's triangle cost. A contact shadow grounds it.
      child.castShadow = false;
      child.receiveShadow = true;
      const geometry = child.geometry;
      triangles += geometry.index ? geometry.index.count / 3 : geometry.getAttribute('position').count / 3;
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach((material) => {
        materials.add(material);
        if (material.name.includes('Skin_') || material.name.includes('Eye_')) {
          this.retractMaterials.add(material);
        }
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) textures.add(value);
        });
      });
    });

    this.model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.model);
    const height = Math.max(bounds.getSize(new THREE.Vector3()).y, 0.001);
    this.model.scale.setScalar(1.55 / height);
    this.model.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(this.model);
    this.model.position.y -= scaledBounds.min.y;
    this.group.add(this.model);

    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.72, 24),
      new THREE.MeshBasicMaterial({
        color: 0x2b5638,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
    );
    contactShadow.name = 'TortoiseContactShadow';
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.195, 0);
    contactShadow.scale.set(1.45, 0.85, 1);
    this.group.add(contactShadow);
    this.contactShadow = contactShadow;

    this.mixer = new THREE.AnimationMixer(this.model);
    gltf.animations.forEach((clip) => this.clips.set(clip.name, clip));
    this.jawBone = this.model.getObjectByName('jaw') as THREE.Bone | undefined;
    this.neckBaseBone = this.model.getObjectByName('neck_base') as THREE.Bone | undefined;
    for (const name of ['neck_base', 'front_legL', 'front_legR', 'rear_legL', 'rear_legR', 'tail']) {
      const bone = this.model.getObjectByName(name);
      if (bone instanceof THREE.Bone) {
        this.retractBones.push(bone);
        this.retractBoneScales.set(bone, bone.scale.clone());
      }
    }
    this.playAnimation(TORTOISE_ANIMATIONS.walk, 0, 0.58);

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

  playAnimation(name: TortoiseAnimation | string, fadeDuration = 0.28, speed = 1): boolean {
    return this.startAnimation(name, fadeDuration, speed, false, false);
  }

  playAnimationOnce(
    name: TortoiseAnimation | string,
    fadeDuration = 0.18,
    speed = 1,
    holdFinalPose = true,
  ): boolean {
    return this.startAnimation(name, fadeDuration, speed, true, holdFinalPose);
  }

  setCurrentAnimationProgress(progress: number): void {
    if (!this.action) return;
    // Keep just inside the final keyframe. Sampling exactly at clip.duration
    // can wrap some exported GLB tracks back to their opening pose.
    this.action.time = this.action.getClip().duration * THREE.MathUtils.clamp(progress, 0, 0.999);
    this.action.paused = true;
    this.mixer?.update(0);
  }

  private startAnimation(
    name: TortoiseAnimation | string,
    fadeDuration: number,
    speed: number,
    playOnce: boolean,
    holdFinalPose: boolean,
  ): boolean {
    if (!this.mixer) return false;
    const clip = this.clips.get(name);
    if (!clip) {
      console.warn(`Tortoise animation not found: ${name}`);
      return false;
    }
    if (this.currentAnimation === name && this.action) {
      if (playOnce) this.action.reset();
      this.action.paused = false;
      this.action.clampWhenFinished = playOnce && holdFinalPose;
      this.action.setLoop(playOnce ? THREE.LoopOnce : THREE.LoopRepeat, playOnce ? 1 : Infinity);
      this.action.setEffectiveTimeScale(speed);
      this.action.play();
      return true;
    }

    const nextAction = this.mixer.clipAction(clip);
    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveWeight(1);
    nextAction.setEffectiveTimeScale(speed);
    nextAction.clampWhenFinished = playOnce && holdFinalPose;
    nextAction.setLoop(playOnce ? THREE.LoopOnce : THREE.LoopRepeat, playOnce ? 1 : Infinity);
    if (fadeDuration > 0) nextAction.fadeIn(fadeDuration);
    nextAction.play();
    if (this.action && this.action !== nextAction) {
      if (fadeDuration > 0) this.action.fadeOut(fadeDuration);
      else this.action.stop();
    }
    this.action = nextAction;
    this.currentAnimation = name;
    return true;
  }

  getCurrentAnimation(): string {
    return this.currentAnimation;
  }

  setFullyHidden(hidden: boolean): void {
    this.fullyHidden = hidden;
    this.retractMaterials.forEach((material) => {
      material.visible = !hidden;
    });
    if (!hidden) {
      this.retractBones.forEach((bone) => {
        const scale = this.retractBoneScales.get(bone);
        if (scale) bone.scale.copy(scale);
      });
    }
  }

  setThinkingPose(yaw: number, smiling: boolean): void {
    this.thinkingYaw = THREE.MathUtils.clamp(yaw, -0.32, 0.32);
    this.smiling = smiling;
  }

  setPeekOnly(enabled: boolean): void {
    this.peekOnly = enabled;
    if (!enabled) {
      this.retractBones.forEach((bone) => {
        const scale = this.retractBoneScales.get(bone);
        if (scale) bone.scale.copy(scale);
      });
    }
  }

  setGrounded(grounded: boolean): void {
    if (this.contactShadow) this.contactShadow.visible = grounded;
  }

  update(delta: number): void {
    if (this.neckBaseBone && this.appliedThinkingYaw !== 0) {
      this.neckBaseBone.rotateY(-this.appliedThinkingYaw);
    }
    this.mixer?.update(delta);
    // The walk and head-shake clips hold the jaw in the GLB's wide-open rest
    // pose. Reuse the friendly closed-mouth angle authored into the breathing
    // idle so locomotion keeps the same calm storybook expression.
    if (
      this.jawBone
      && (this.currentAnimation === TORTOISE_ANIMATIONS.walk
        || this.currentAnimation === TORTOISE_ANIMATIONS.idle
        || this.currentAnimation === TORTOISE_ANIMATIONS.headShake
        || this.currentAnimation === TORTOISE_ANIMATIONS.peek)
    ) {
      this.jawBone.quaternion.copy(this.smiling ? this.smileJawRotation : this.calmJawRotation);
    }
    this.appliedThinkingYaw = this.thinkingYaw;
    if (this.neckBaseBone && this.appliedThinkingYaw !== 0) {
      this.neckBaseBone.rotateY(this.appliedThinkingYaw);
    }
    if (this.fullyHidden) {
      // The authored tuck clip stops with a few green tips just outside the
      // shell. Collapse only the appendage chains after animation sampling so
      // the completed gameplay state reads as fully protected.
      this.retractBones.forEach((bone) => bone.scale.setScalar(0.001));
    } else if (this.peekOnly) {
      this.retractBones.forEach((bone) => {
        if (bone !== this.neckBaseBone) bone.scale.setScalar(0.001);
      });
    }
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
    this.currentAnimation = '';
    this.retractBones.length = 0;
    this.retractBoneScales.clear();
    this.retractMaterials.clear();
    this.fullyHidden = false;
    this.peekOnly = false;
    this.model = undefined;
    this.contactShadow = undefined;
    this.jawBone = undefined;
    this.neckBaseBone = undefined;
    this.thinkingYaw = 0;
    this.appliedThinkingYaw = 0;
    this.smiling = false;
    this.mixer = undefined;
    this.action = undefined;
  }
}
