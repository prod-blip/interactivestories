import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type CharacterOptions = {
  url: string;
  targetHeight: number;
  animation: string;
};

export class StoryCharacter {
  readonly group = new THREE.Group();
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private animations: THREE.AnimationClip[] = [];
  private currentAction: THREE.AnimationAction | null = null;
  private currentAnimation = '';
  private closedEyes: THREE.Group | null = null;
  private readonly boneRotationOffsets = new Map<string, {
    bone: THREE.Object3D;
    baseQuaternion: THREE.Quaternion;
    rotation: THREE.Euler;
  }>();
  private readonly offsetQuaternion = new THREE.Quaternion();
  private readonly materialStates = new Map<THREE.Material, {
    opacity: number;
    transparent: boolean;
    depthWrite: boolean;
  }>();

  constructor(name: string) {
    this.group.name = name;
  }

  async load(options: CharacterOptions): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(options.url);
    this.model = gltf.scene;
    this.model.name = `${this.group.name}Model`;
    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (this.materialStates.has(material)) return;
        this.materialStates.set(material, {
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        });
      });
    });

    this.model.updateMatrixWorld(true);
    const initialBounds = new THREE.Box3().setFromObject(this.model);
    const initialHeight = Math.max(initialBounds.getSize(new THREE.Vector3()).y, 0.001);
    this.model.scale.setScalar(options.targetHeight / initialHeight);
    this.model.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(this.model);
    this.model.position.y -= scaledBounds.min.y;
    this.group.add(this.model);

    this.mixer = new THREE.AnimationMixer(this.model);
    this.animations = gltf.animations;
    this.playAnimation(options.animation, 0);
  }

  playAnimation(name: string, fadeDuration = 0.3): void {
    if (!this.mixer || this.currentAnimation === name) return;
    const clip = THREE.AnimationClip.findByName(this.animations, name);
    if (!clip) {
      console.warn(`${this.group.name} animation not found: ${name}`);
      return;
    }

    const nextAction = this.mixer.clipAction(clip);
    nextAction.reset();
    nextAction.paused = false;
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    nextAction.setLoop(THREE.LoopRepeat, Infinity);
    if (fadeDuration > 0) nextAction.fadeIn(fadeDuration);
    nextAction.play();
    if (this.currentAction && this.currentAction !== nextAction) {
      if (fadeDuration > 0) this.currentAction.fadeOut(fadeDuration);
      else this.currentAction.stop();
    }
    this.currentAction = nextAction;
    this.currentAnimation = name;
  }

  playOnce(name: string, fadeDuration = 0.3, reverse = false): void {
    if (!this.mixer) return;
    const clip = THREE.AnimationClip.findByName(this.animations, name);
    if (!clip) {
      console.warn(`${this.group.name} animation not found: ${name}`);
      return;
    }

    const nextAction = this.mixer.clipAction(clip);
    nextAction.reset();
    nextAction.paused = false;
    nextAction.enabled = true;
    nextAction.clampWhenFinished = true;
    nextAction.setLoop(THREE.LoopOnce, 1);
    nextAction.setEffectiveWeight(1);
    nextAction.setEffectiveTimeScale(reverse ? -1 : 1);
    if (reverse) nextAction.time = clip.duration;
    if (fadeDuration > 0) nextAction.fadeIn(fadeDuration);
    nextAction.play();
    if (this.currentAction && this.currentAction !== nextAction) {
      if (fadeDuration > 0) this.currentAction.fadeOut(fadeDuration);
      else this.currentAction.stop();
    }
    this.currentAction = nextAction;
    this.currentAnimation = `${name}:${reverse ? 'reverse' : 'once'}`;
  }

  setAnimationSpeed(speed: number): void {
    this.currentAction?.setEffectiveTimeScale(Math.max(0.05, speed));
  }

  pauseAnimation(): void {
    if (this.currentAction) this.currentAction.paused = true;
  }

  poseAnimation(name: string, normalizedTime = 0): void {
    if (!this.mixer) return;
    const clip = THREE.AnimationClip.findByName(this.animations, name);
    if (!clip) {
      console.warn(`${this.group.name} animation not found: ${name}`);
      return;
    }

    this.currentAction?.stop();
    const poseAction = this.mixer.clipAction(clip);
    poseAction.reset();
    poseAction.enabled = true;
    poseAction.setEffectiveWeight(1);
    poseAction.setEffectiveTimeScale(1);
    poseAction.setLoop(THREE.LoopOnce, 1);
    poseAction.clampWhenFinished = true;
    poseAction.time = clip.duration * THREE.MathUtils.clamp(normalizedTime, 0, 1);
    poseAction.play();
    this.mixer.update(0);
    poseAction.paused = true;
    this.currentAction = poseAction;
    this.currentAnimation = `${name}:pose`;
  }

  setMirrored(mirrored: boolean): void {
    if (!this.model) return;
    this.model.scale.x = Math.abs(this.model.scale.x) * (mirrored ? -1 : 1);
    this.model.updateMatrixWorld(true);
  }

  setEyesClosed(closed: boolean): void {
    if (!this.model) return;
    if (!this.closedEyes) this.closedEyes = this.createClosedEyes();
    if (this.closedEyes) this.closedEyes.visible = closed;
  }

  setBoneRotationOffset(name: string, x: number, y: number, z: number): void {
    let state = this.boneRotationOffsets.get(name);
    if (!state) {
      const bone = this.model?.getObjectByName(name);
      if (!bone) return;
      state = {
        bone,
        baseQuaternion: bone.quaternion.clone(),
        rotation: new THREE.Euler(),
      };
      this.boneRotationOffsets.set(name, state);
    }
    state.rotation.set(x, y, z);
  }

  clearBoneRotationOffsets(): void {
    this.boneRotationOffsets.clear();
  }

  update(delta: number): void {
    this.mixer?.update(delta);
    this.boneRotationOffsets.forEach(({ bone, baseQuaternion, rotation }) => {
      this.offsetQuaternion.setFromEuler(rotation);
      bone.quaternion.copy(baseQuaternion).multiply(this.offsetQuaternion);
    });
  }

  setOpacity(opacity: number): void {
    const factor = THREE.MathUtils.clamp(opacity, 0, 1);
    this.materialStates.forEach((state, material) => {
      const transparent = state.transparent || factor < 0.999;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.opacity = state.opacity * factor;
      material.depthWrite = factor < 0.999 ? false : state.depthWrite;
    });
  }

  dispose(): void {
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.currentAction = null;
    this.currentAnimation = '';
    this.closedEyes = null;
    this.animations = [];
    this.boneRotationOffsets.clear();
    this.materialStates.clear();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      geometries.add(child.geometry);
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.group.clear();
    this.model = null;
  }

  private createClosedEyes(): THREE.Group | null {
    const head = this.model?.getObjectByName('Head');
    if (!head) return null;

    const eyelids = new THREE.Group();
    eyelids.name = `${this.group.name}ClosedEyes`;
    eyelids.visible = false;

    const furSource = [...this.materialStates.keys()].find((material) =>
      material.name.includes('Rabbit Fur - Honey'));
    const eyeSource = [...this.materialStates.keys()].find((material) =>
      material.name.includes('Rabbit Eyes'));
    const lidMaterial = furSource?.clone() ?? new THREE.MeshStandardMaterial({
      color: 0x753818,
      roughness: 0.95,
    });
    const lashMaterial = eyeSource?.clone() ?? new THREE.MeshStandardMaterial({
      color: 0x17100d,
      roughness: 0.88,
    });
    lidMaterial.name = 'Rabbit Sleeping Eyelids';
    lashMaterial.name = 'Rabbit Sleeping Eye Lines';

    for (const x of [-0.29, 0.29]) {
      const lid = new THREE.Mesh(new THREE.CircleGeometry(0.205, 24), lidMaterial);
      lid.name = x < 0 ? 'RabbitClosedLid.L' : 'RabbitClosedLid.R';
      lid.position.set(x, 0.525, 0.966);
      lid.scale.y = 0.72;
      lid.renderOrder = 4;

      const lash = new THREE.Mesh(
        new THREE.TorusGeometry(0.142, 0.026, 8, 20, Math.PI),
        lashMaterial,
      );
      lash.name = x < 0 ? 'RabbitClosedEyeLine.L' : 'RabbitClosedEyeLine.R';
      lash.position.set(x, 0.505, 0.979);
      lash.scale.y = 0.64;
      lash.renderOrder = 5;
      eyelids.add(lid, lash);
    }

    head.add(eyelids);
    return eyelids;
  }
}
