import * as THREE from 'three';
import { AudioDirector } from './AudioDirector';
import { InfiniteForest } from './InfiniteForest';
import { Input } from './Input';
import {
  FINAL_GAMEPLAY_END_DISTANCE,
  FINAL_RACE_CHECKPOINTS,
  FINISH_DISTANCE,
  GAMEPLAY_DISTANCE,
  RaceClearing,
  RACE_START_Z,
  SECOND_GAMEPLAY_CHECKPOINTS,
  SECOND_GAMEPLAY_END_DISTANCE,
  TORTOISE_CHECKPOINTS,
} from './RaceClearing';
import { StoryCharacter } from './StoryCharacter';

const MAX_PIXEL_RATIO = 1.75;
const RABBIT_HOME = new THREE.Vector3(-2.35, 0, -10);
const TORTOISE_HOME = new THREE.Vector3(2.35, 0, -10);
const NAP_LANDING_OFFSET_X = 0.32;
const RABBIT_FACING = THREE.MathUtils.degToRad(65);
const TORTOISE_FACING = THREE.MathUtils.degToRad(115);
const TORTOISE_LATERAL_LIMIT = 0.92;
const TORTOISE_LATERAL_SPEED = 1.55;
const TORTOISE_TRAIL_Y = -0.09;
const FINAL_RACE_START_DISTANCE = 80;
const FINAL_RABBIT_START_GAP = 25;
const FINAL_RABBIT_START_DISTANCE = FINAL_RACE_START_DISTANCE - FINAL_RABBIT_START_GAP;
const FINAL_RABBIT_MIN_GAP = 2;
const FINAL_RABBIT_FINISH_GAP = 2.25;
const FINAL_RACE_LENGTH = FINAL_GAMEPLAY_END_DISTANCE - FINAL_RACE_START_DISTANCE;
const FINAL_TORTOISE_SPEED = 2.55;
const FINAL_RABBIT_SPEED = 1.9;

type CameraTransition = {
  elapsed: number;
  duration: number;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromLook: THREE.Vector3;
  toLook: THREE.Vector3;
};

type StorySequence =
  | 'rabbit'
  | 'tortoise'
  | 'laugh'
  | 'race'
  | 'rabbitFarAhead'
  | 'nap'
  | 'race2'
  | 'rabbitWake'
  | 'rabbitConfidentRun'
  | 'finalRace'
  | 'tortoiseWin'
  | 'endingTableau';

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(54, 1, 0.1, 190);
  private readonly timer = new THREE.Timer();
  private readonly audio = new AudioDirector();
  private readonly forest = new InfiniteForest();
  private readonly raceClearing = new RaceClearing();
  private readonly input = new Input();
  private readonly sky = createSky();
  private readonly clouds = createClouds();
  private readonly birds = createBirds();
  private readonly butterflies = createButterflies();
  private readonly rabbit = new StoryCharacter('Rabbit');
  private readonly tortoise = new StoryCharacter('Tortoise');
  private readonly sun = new THREE.DirectionalLight(0xffe3a1, 3.6);
  private readonly lookTarget = new THREE.Vector3();
  private readonly checkpointPoint = new THREE.Vector3();
  private animationId = 0;
  private running = false;
  private disposed = false;
  private worldX = 0;
  private worldZ = 4;
  private elapsed = 0;
  private openingActive = false;
  private openingElapsed = 0;
  private readonly openingDuration = 7.5;
  private readonly openingCameraStart = new THREE.Vector3(15, 12.5, 18);
  private readonly openingCameraEnd = new THREE.Vector3(0, 5.7, 1.5);
  private readonly openingLookStart = new THREE.Vector3(-2, 1.7, -17);
  private readonly openingLookEnd = new THREE.Vector3(0, 1.15, -10);
  private readonly openingLook = new THREE.Vector3();
  private openingCompleteHandler: (() => void) | null = null;
  private cameraTransition: CameraTransition | null = null;
  private readonly cameraLook = new THREE.Vector3(0, 1.15, -10);
  private storySequence: StorySequence | null = null;
  private storySequenceElapsed = 0;
  private storySequenceStage = 0;
  private storySequenceCompleteHandler: (() => void) | null = null;
  private gameplayDistance = 0;
  private rabbitChaseDistance = 61;
  private rabbitDisappointmentElapsed = 0;
  private checkpointIndex = 0;
  private tortoiseLateralOffset = 0.72;
  private checkpointHandler: ((index: number) => void) | null = null;
  private raceGuideHandler: ((angle: number, distance: number, label: string) => void) | null = null;
  private passedRabbitHandler: (() => void) | null = null;
  private tortoiseMoving = false;
  private reducedMotion = false;

  constructor(parent: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'An endless sunny forest with rounded trees, rocks, flowers, mushrooms, and patches of long grass');
    parent.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x74cdf6);
    this.scene.fog = new THREE.Fog(0xa8dfcb, 52, 108);
    const hemisphere = new THREE.HemisphereLight(0xdff6ff, 0x6d8b3c, 2.25);
    this.sun.position.set(-38, 65, 28);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 150;
    this.sun.shadow.camera.left = -36;
    this.sun.shadow.camera.right = 36;
    this.sun.shadow.camera.top = 42;
    this.sun.shadow.camera.bottom = -24;
    this.sun.shadow.bias = -0.00008;
    this.sun.shadow.normalBias = 0.035;
    this.scene.add(
      this.sky,
      this.forest.group,
      this.raceClearing.group,
      this.clouds,
      this.birds,
      this.butterflies,
      this.rabbit.group,
      this.tortoise.group,
      hemisphere,
      this.sun,
    );
    this.rabbit.group.position.copy(RABBIT_HOME);
    this.rabbit.group.rotation.y = RABBIT_FACING;
    this.tortoise.group.position.copy(TORTOISE_HOME);
    this.tortoise.group.rotation.y = TORTOISE_FACING;
    this.timer.connect(document);
    this.positionCamera(true);
  }

  async prepare(onProgress: (progress: number) => void): Promise<void> {
    onProgress(0.18);
    this.resize();
    this.renderer.render(this.scene, this.camera);
    await nextFrame();
    onProgress(0.28);
    const modelBase = `${import.meta.env.BASE_URL}models/`;
    await Promise.all([
      this.rabbit.load({
        url: `${modelBase}Rabbit.glb`,
        targetHeight: 3.25,
        animation: 'Rabbit_Resting_Pose_Breathe',
      }),
      this.tortoise.load({
        url: `${modelBase}Tortoise.glb`,
        targetHeight: 2.05,
        animation: 'Tortoise_Look_At_Rabbit',
      }),
    ]);
    onProgress(0.58);
    await this.renderer.compileAsync(this.scene, this.camera);
    onProgress(0.86);
    await nextFrame();
    this.renderer.render(this.scene, this.camera);
    onProgress(1);
  }

  start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.timer.reset();
    this.tick();
  }

  pause(): void {
    this.running = false;
    cancelAnimationFrame(this.animationId);
    void this.audio.pause();
  }

  resume(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.timer.reset();
    void this.audio.resume();
    this.tick();
  }

  beginOpening(onComplete: () => void): void {
    this.openingElapsed = 0;
    this.openingActive = true;
    this.openingCompleteHandler = onComplete;
    this.camera.position.copy(this.openingCameraStart);
    this.camera.lookAt(this.openingLookStart);
    this.cameraLook.copy(this.openingLookStart);
  }

  beginRabbitIntroduction(onComplete: () => void): void {
    this.resetRabbitTransform();
    this.audio.startBraggingFlourishes();
    this.storySequence = 'rabbit';
    this.storySequenceElapsed = 0;
    this.storySequenceStage = 0;
    this.storySequenceCompleteHandler = onComplete;
    this.rabbit.playAnimation('Rabbit_Boasting', 0.35);
    this.startCameraTransition(
      new THREE.Vector3(-3.1, 3.05, -5.15),
      new THREE.Vector3(-2.35, 1.55, -10),
      2.2,
    );
  }

  beginTortoiseIntroduction(onComplete: () => void): void {
    this.resetRabbitTransform();
    this.rabbit.playAnimation('Rabbit_Resting_Pose_Breathe', 0.4);
    this.tortoise.playAnimation('Tortoise_Idle', 0.45);
    this.storySequence = 'tortoise';
    this.storySequenceElapsed = 0;
    this.storySequenceStage = 0;
    this.storySequenceCompleteHandler = onComplete;
    this.startCameraTransition(
      new THREE.Vector3(3.05, 2.7, -5.3),
      new THREE.Vector3(2.35, 1.15, -10),
      2.4,
    );
  }

  beginRabbitLaugh(onComplete: () => void): void {
    this.resetRabbitTransform();
    this.tortoise.playAnimation('Tortoise_Idle', 0.35);
    this.rabbit.playAnimation('Boast1', 0.35);
    this.storySequence = 'laugh';
    this.storySequenceElapsed = 0;
    this.storySequenceStage = 0;
    this.storySequenceCompleteHandler = onComplete;
    this.startCameraTransition(
      new THREE.Vector3(-3.1, 3.05, -5.15),
      new THREE.Vector3(-2.35, 1.55, -10),
      1.9,
    );
  }

  endOpeningConversationAudio(): void {
    this.audio.stopBraggingFlourishes();
  }

  enterRaceClearing(): void {
    this.storySequence = null;
    this.storySequenceCompleteHandler = null;
    this.cameraTransition = null;
    this.forest.group.visible = false;
    this.raceClearing.show();
    this.raceClearing.setStartCelebration(false);
    this.raceClearing.setFinishVisible(false);
    this.raceClearing.resetNapBed();
    this.rabbit.group.visible = true;
    this.rabbit.setOpacity(1);
    this.rabbit.group.position.set(-1.05, 0, RACE_START_Z + 0.15);
    this.rabbit.group.rotation.set(0, Math.PI, 0);
    this.tortoise.group.position.set(1.05, TORTOISE_TRAIL_Y, RACE_START_Z + 0.15);
    this.tortoise.group.rotation.set(0, 0, 0);
    this.rabbit.playAnimation('Rabbit_Resting_Pose_Breathe', 0.35);
    this.tortoise.playAnimation('Tortoise_Determined', 0.35);
    this.camera.position.set(0, 7.1, -22.5);
    this.cameraLook.set(0, 1.1, -51);
    this.camera.lookAt(this.cameraLook);
  }

  startRace(onCheckpoint: (index: number) => void, onComplete: () => void): void {
    this.raceClearing.setStartCelebration(true);
    this.storySequence = 'race';
    this.storySequenceElapsed = 0;
    this.storySequenceStage = 0;
    this.storySequenceCompleteHandler = onComplete;
    this.checkpointHandler = onCheckpoint;
    this.gameplayDistance = 0;
    this.checkpointIndex = 0;
    this.tortoiseLateralOffset = 0.72;
    this.tortoiseMoving = false;
    this.rabbit.group.visible = true;
    this.rabbit.setOpacity(1);
    this.rabbit.playAnimation('Rabbit_Running', 0.18);
    this.tortoise.playAnimation('Tortoise_Determined', 0.28);
  }

  beginRabbitFarAhead(onComplete: () => void): void {
    const napPosition = this.raceClearing.napPosition();
    this.raceClearing.resetNapBed();
    this.storySequence = 'rabbitFarAhead';
    this.storySequenceElapsed = 0;
    this.storySequenceStage = 0;
    this.storySequenceCompleteHandler = onComplete;
    this.rabbit.group.visible = true;
    this.rabbit.setOpacity(1);
    this.rabbit.group.position.copy(napPosition);
    this.rabbit.group.position.y = this.raceClearing.napBedSurfaceHeight();
    this.rabbit.group.rotation.set(0, 0, 0);
    this.rabbit.setMirrored(false);
    this.rabbit.setEyesClosed(false);
    this.rabbit.playAnimation('Rabbit_Boasting', 0.35);
    this.cameraTransition = null;
    this.camera.position.set(napPosition.x + 0.7, 3.25, napPosition.z + 7.1);
    this.cameraLook.set(napPosition.x, 1.45, napPosition.z);
    this.camera.lookAt(this.cameraLook);
  }

  beginRabbitNap(onComplete?: () => void): void {
    this.storySequence = 'nap';
    this.storySequenceElapsed = 0;
    this.storySequenceStage = 0;
    this.storySequenceCompleteHandler = onComplete ?? null;
    this.raceClearing.setNapBedLoad(0);
    this.rabbit.setEyesClosed(false);
    this.rabbit.setMirrored(true);
    this.rabbit.playOnce('Rabbit_Curl_Up_Sleep', 0.35);
  }

  startRaceSectionTwo(
    onCheckpoint: (index: number) => void,
    onPassedRabbit: () => void,
    onComplete: () => void,
  ): void {
    this.storySequence = 'race2';
    this.storySequenceElapsed = 0;
    this.storySequenceStage = 0;
    this.storySequenceCompleteHandler = onComplete;
    this.checkpointHandler = onCheckpoint;
    this.passedRabbitHandler = onPassedRabbit;
    this.gameplayDistance = Math.max(this.gameplayDistance, GAMEPLAY_DISTANCE);
    this.checkpointIndex = 0;
    this.tortoiseMoving = false;
    this.rabbit.group.visible = true;
    this.rabbit.setOpacity(1);
    this.raceClearing.setNapBedLoad(1);
    this.tortoise.playAnimation('Tortoise_Determined', 0.25);
  }

  beginRabbitWake(onComplete: () => void): void {
    const napPosition = this.raceClearing.napPosition();
    this.audio.playRabbitStartled();
    this.storySequence = 'rabbitWake';
    this.storySequenceElapsed = 0;
    this.storySequenceStage = 0;
    this.storySequenceCompleteHandler = onComplete;
    this.cameraTransition = null;
    this.rabbit.group.visible = true;
    this.tortoise.group.visible = false;
    this.rabbit.setOpacity(1);
    this.rabbit.setEyesClosed(true);
    this.rabbit.group.position.copy(napPosition);
    this.rabbit.group.position.x += NAP_LANDING_OFFSET_X;
    this.rabbit.group.position.y = this.raceClearing.napBedSurfaceHeight();
    this.rabbit.group.rotation.set(0, 0, 0);
    this.rabbit.playOnce('Rabbit_Wake', 0.32);
    this.rabbit.setAnimationSpeed(0.82);
    this.camera.position.set(napPosition.x + 0.85, 3.15, napPosition.z + 7.3);
    this.cameraLook.set(napPosition.x, 1.35, napPosition.z);
    this.camera.lookAt(this.cameraLook);
  }

  beginRabbitConfidentRun(onComplete: () => void): void {
    this.storySequence = 'rabbitConfidentRun';
    this.storySequenceElapsed = 0;
    this.storySequenceStage = 0;
    this.storySequenceCompleteHandler = onComplete;
    this.rabbitChaseDistance = 61;
    this.raceClearing.setFinishVisible(false);
    this.rabbit.setEyesClosed(false);
    this.rabbit.setMirrored(false);
    this.rabbit.playAnimation('Rabbit_Running', 0.25);
    this.rabbit.setAnimationSpeed(0.92);
  }

  startFinalRace(onCheckpoint: (index: number) => void, onComplete: () => void): void {
    this.audio.playFinalChaseCue();
    this.storySequence = 'finalRace';
    this.storySequenceElapsed = 0;
    this.storySequenceStage = 0;
    this.storySequenceCompleteHandler = onComplete;
    this.checkpointHandler = onCheckpoint;
    this.checkpointIndex = 0;
    this.tortoiseMoving = false;
    this.gameplayDistance = FINAL_RACE_START_DISTANCE;
    this.rabbitChaseDistance = FINAL_RABBIT_START_DISTANCE;
    this.tortoise.group.visible = true;
    this.rabbit.group.visible = true;
    this.rabbit.setOpacity(1);
    this.raceClearing.setFinishCelebration(false);
    this.raceClearing.setFinishVisible(true);
    this.rabbit.playAnimation('Rabbit_Running', 0.12);
    this.rabbit.clearBoneRotationOffsets();
    this.rabbit.setAnimationSpeed(0.82);
    this.tortoise.playAnimation('Tortoise_Determined', 0.2);

    const rabbitZ = RACE_START_Z - this.rabbitChaseDistance;
    const tortoiseZ = RACE_START_Z - this.gameplayDistance;
    this.rabbit.group.position.set(
      this.raceClearing.centerXAtWorldZ(rabbitZ) - 0.58,
      0,
      rabbitZ,
    );
    this.rabbit.group.rotation.set(0, this.raceClearing.headingAtWorldZ(rabbitZ), 0);
    this.raceClearing.pointOnTrail(
      tortoiseZ,
      this.tortoiseLateralOffset,
      this.tortoise.group.position,
    );
    this.tortoise.group.position.y = TORTOISE_TRAIL_Y;
    this.tortoise.group.rotation.y = this.raceClearing.headingAtWorldZ(tortoiseZ) + Math.PI;

    const finishZ = RACE_START_Z - FINISH_DISTANCE;
    const finishX = this.raceClearing.centerXAtWorldZ(finishZ);
    this.camera.position.set(finishX + 8.6, 6.7, finishZ - 4.6);
    this.cameraLook.set(finishX, 1.15, finishZ + 10.5);
    this.camera.lookAt(this.cameraLook);
  }

  beginTortoiseWin(onComplete: () => void): void {
    this.storySequence = 'tortoiseWin';
    this.storySequenceElapsed = 0;
    this.storySequenceStage = 0;
    this.storySequenceCompleteHandler = onComplete;
    this.checkpointHandler = null;
    this.tortoiseMoving = false;
    this.rabbitDisappointmentElapsed = 0;
    this.raceClearing.setFinishCelebration(true);
    this.audio.stopFinalChaseCue(0.9);
    this.tortoise.playAnimation('Tortoise_Walk', 0.22);
    this.tortoise.setAnimationSpeed(0.72);
    this.rabbit.playAnimation('Rabbit_Running', 0.18);
    this.rabbit.setAnimationSpeed(0.78);
  }

  beginEndingTableau(onComplete: () => void): void {
    this.storySequence = 'endingTableau';
    this.storySequenceElapsed = 0;
    this.storySequenceStage = 0;
    this.storySequenceCompleteHandler = onComplete;
    this.raceClearing.setFinishCelebration(true);
    this.tortoise.playAnimation('Tortoise_Celebrate', 0.3);
    this.tortoise.setAnimationSpeed(0.92);
    this.rabbit.poseAnimation('Rabbit_Resting_Idle', 0.3);
  }

  enableAudio(): void {
    void this.audio.start().catch((error: unknown) => {
      console.warn('Unable to start forest audio.', error);
    });
  }

  restart(): void {
    this.worldX = 0;
    this.worldZ = 4;
    this.storySequence = null;
    this.checkpointHandler = null;
    this.passedRabbitHandler = null;
    this.gameplayDistance = 0;
    this.tortoiseLateralOffset = 0.72;
    this.rabbitChaseDistance = 61;
    this.audio.stopSnoring();
    this.audio.stopBraggingFlourishes();
    this.audio.stopFinalChaseCue();
    this.audio.stopVictoryCue();
    this.cameraTransition = null;
    this.raceClearing.resetNapBed();
    this.raceClearing.setFinishCelebration(false);
    this.raceClearing.setFinishVisible(false);
    this.raceClearing.group.visible = false;
    this.forest.group.visible = true;
    this.rabbit.group.visible = true;
    this.rabbit.setOpacity(1);
    this.rabbit.setMirrored(false);
    this.rabbit.setEyesClosed(false);
    this.resetRabbitTransform();
    this.tortoise.group.position.copy(TORTOISE_HOME);
    this.tortoise.group.rotation.set(0, TORTOISE_FACING, 0);
    this.forest.update(this.worldX, this.worldZ, true);
    this.positionCamera(true);
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
  }

  setRaceGuideHandler(handler: (angle: number, distance: number, label: string) => void): void {
    this.raceGuideHandler = handler;
  }

  dispose(): void {
    this.disposed = true;
    this.pause();
    this.input.dispose();
    this.audio.dispose();
    this.forest.dispose();
    this.raceClearing.dispose();
    disposeObject(this.sky);
    disposeObject(this.clouds);
    disposeObject(this.birds);
    disposeObject(this.butterflies);
    this.rabbit.dispose();
    this.tortoise.dispose();
    this.timer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private readonly tick = (timestamp?: number) => {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(this.tick);
    this.timer.update(timestamp);
    const delta = Math.min(this.timer.getDelta(), 0.05);
    this.elapsed += delta;
    this.update(delta);
    this.resize();
    this.renderer.render(this.scene, this.camera);
  };

  private update(delta: number): void {
    const ambientDelta = this.reducedMotion ? 0 : delta;
    const ambientTime = this.reducedMotion ? 0 : this.elapsed;
    if (this.openingActive) this.updateOpening(delta);
    else this.updateCameraTransition(delta);
    this.updateStorySequence(delta);
    if (this.forest.group.visible) {
      this.forest.update(this.camera.position.x, this.camera.position.z);
      this.forest.animate(ambientDelta);
    }
    this.raceClearing.animate(delta);
    this.rabbit.update(delta);
    this.tortoise.update(delta);

    this.sky.position.copy(this.camera.position);
    this.clouds.position.set(this.camera.position.x * 0.3, 0, this.camera.position.z - 55);
    this.clouds.children.forEach((cloud, index) => {
      cloud.position.x += ambientDelta * (0.13 + index * 0.012);
      if (cloud.position.x > 48) cloud.position.x = -48;
    });
    this.birds.position.set(this.camera.position.x, 0, this.camera.position.z - 42);
    this.birds.rotation.y = Math.sin(ambientTime * 0.08) * 0.15;
    this.birds.children.forEach((bird, index) => {
      bird.position.y += Math.sin(ambientTime * 2.3 + index) * ambientDelta * 0.08;
      bird.rotation.z = Math.sin(ambientTime * 4.5 + index) * 0.12;
    });
    this.butterflies.position.set(this.camera.position.x, 0, this.camera.position.z - 12);
    this.butterflies.children.forEach((butterfly, index) => {
      butterfly.position.y = 1.1 + Math.sin(ambientTime * 2.6 + index * 1.7) * 0.45;
      butterfly.rotation.y += ambientDelta * (0.35 + index * 0.1);
    });

    this.sun.position.set(this.camera.position.x - 38, 65, this.camera.position.z + 28);
    this.sun.target.position.set(this.camera.position.x, 0, this.camera.position.z - 20);
    if (!this.sun.target.parent) this.scene.add(this.sun.target);
  }

  private updateOpening(delta: number): void {
    this.openingElapsed += delta;
    const openingDuration = this.reducedMotion ? 0.9 : this.openingDuration;
    const progress = THREE.MathUtils.clamp(this.openingElapsed / openingDuration, 0, 1);
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    this.camera.position.lerpVectors(this.openingCameraStart, this.openingCameraEnd, eased);
    this.openingLook.lerpVectors(this.openingLookStart, this.openingLookEnd, eased);
    this.cameraLook.copy(this.openingLook);
    this.camera.lookAt(this.openingLook);
    if (progress >= 1) {
      this.openingActive = false;
      const handler = this.openingCompleteHandler;
      this.openingCompleteHandler = null;
      handler?.();
    }
  }

  private startCameraTransition(toPosition: THREE.Vector3, toLook: THREE.Vector3, duration: number): void {
    this.cameraTransition = {
      elapsed: 0,
      duration: this.reducedMotion ? 0.08 : duration,
      fromPosition: this.camera.position.clone(),
      toPosition,
      fromLook: this.cameraLook.clone(),
      toLook,
    };
  }

  private updateCameraTransition(delta: number): void {
    const transition = this.cameraTransition;
    if (!transition) return;
    transition.elapsed += delta;
    const progress = THREE.MathUtils.clamp(transition.elapsed / transition.duration, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    this.camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
    this.cameraLook.lerpVectors(transition.fromLook, transition.toLook, eased);
    this.camera.lookAt(this.cameraLook);
    if (progress >= 1) this.cameraTransition = null;
  }

  private updateStorySequence(delta: number): void {
    if (!this.storySequence) return;
    this.storySequenceElapsed += delta;
    if (this.storySequence === 'rabbit') this.updateRabbitIntroduction();
    else if (this.storySequence === 'tortoise') this.updateTortoiseIntroduction();
    else if (this.storySequence === 'laugh') this.updateRabbitLaugh();
    else if (this.storySequence === 'race') this.updateRace(delta);
    else if (this.storySequence === 'race2') this.updateRaceSectionTwo(delta);
    else if (this.storySequence === 'rabbitFarAhead') this.updateRabbitFarAhead();
    else if (this.storySequence === 'nap') this.updateRabbitNap();
    else if (this.storySequence === 'rabbitWake') this.updateRabbitWake();
    else if (this.storySequence === 'rabbitConfidentRun') this.updateRabbitConfidentRun(delta);
    else if (this.storySequence === 'finalRace') this.updateFinalRace(delta);
    else if (this.storySequence === 'tortoiseWin') this.updateTortoiseWin(delta);
    else this.updateEndingTableau(delta);
  }

  private updateRabbitIntroduction(): void {
    const elapsed = this.storySequenceElapsed;
    if (elapsed >= 1.7 && this.storySequenceStage === 0) {
      this.storySequenceStage = 1;
      this.rabbit.playAnimation('Rabbit_Running', 0.25);
    }

    if (elapsed >= 1.7 && elapsed < 4.9) {
      const progress = (elapsed - 1.7) / 3.2;
      const angle = progress * Math.PI * 2;
      this.rabbit.group.position.set(
        RABBIT_HOME.x + Math.sin(angle) * 0.72,
        Math.max(0, Math.sin(progress * Math.PI * 8)) * 0.1,
        RABBIT_HOME.z + (Math.cos(angle) - 1) * 0.46,
      );
      this.rabbit.group.rotation.y = Math.atan2(Math.cos(angle), -Math.sin(angle));
    }

    if (elapsed >= 4.9 && this.storySequenceStage === 1) {
      this.storySequenceStage = 2;
      this.resetRabbitTransform();
      this.rabbit.playAnimation('Rabbit_Boasting', 0.28);
    }
    if (elapsed >= 6.7) this.finishStorySequence();
  }

  private updateTortoiseIntroduction(): void {
    if (this.storySequenceElapsed >= 3.8) this.finishStorySequence();
  }

  private updateRabbitLaugh(): void {
    const elapsed = this.storySequenceElapsed;
    const laughter = Math.max(0, Math.sin((elapsed - 0.7) * Math.PI * 2.6));
    this.rabbit.group.position.y = laughter * 0.055;
    this.rabbit.group.rotation.x = -laughter * 0.075;
    this.rabbit.group.rotation.z = Math.sin(elapsed * Math.PI * 2.6) * 0.025;
    if (elapsed >= 5.2) {
      this.resetRabbitTransform();
      this.finishStorySequence();
    }
  }

  private updateRace(delta: number): void {
    const elapsed = this.storySequenceElapsed;
    const rabbitDistance = Math.min(44, elapsed * 9.2);
    const movement = this.input.read();
    const movingForward = movement.forward > 0;
    const moving = movingForward || movement.sideways !== 0;
    if (movingForward) this.gameplayDistance = Math.min(GAMEPLAY_DISTANCE, this.gameplayDistance + delta * 2.2);
    this.updateTortoiseLateralMovement(movement.sideways, delta);
    if (moving !== this.tortoiseMoving) {
      this.tortoiseMoving = moving;
      this.tortoise.playAnimation(moving ? 'Tortoise_Walk' : 'Tortoise_Determined', 0.22);
    }
    const tortoiseDistance = this.gameplayDistance;
    const rabbitZ = RACE_START_Z - rabbitDistance;
    const tortoiseZ = RACE_START_Z - tortoiseDistance;
    this.rabbit.group.position.set(
      this.raceClearing.centerXAtWorldZ(rabbitZ) - 0.72,
      0,
      rabbitZ,
    );
    this.raceClearing.pointOnTrail(tortoiseZ, this.tortoiseLateralOffset, this.tortoise.group.position);
    this.tortoise.group.position.y = TORTOISE_TRAIL_Y;
    this.rabbit.group.rotation.y = this.raceClearing.headingAtWorldZ(rabbitZ);
    this.tortoise.group.rotation.y = this.raceClearing.headingAtWorldZ(tortoiseZ)
      + Math.PI - movement.sideways * 0.14;
    const rabbitFade = 1 - THREE.MathUtils.smoothstep(rabbitDistance, 24, 35);
    this.rabbit.setOpacity(rabbitFade);
    if (rabbitFade <= 0.001) this.rabbit.group.visible = false;

    while (
      this.checkpointIndex < TORTOISE_CHECKPOINTS.length
      && tortoiseDistance >= TORTOISE_CHECKPOINTS[this.checkpointIndex]!
    ) {
      this.checkpointHandler?.(this.checkpointIndex);
      this.checkpointIndex += 1;
    }

    const aheadZ = tortoiseZ - 10.5;
    const desiredCamera = new THREE.Vector3(this.tortoise.group.position.x, 4.15, tortoiseZ + 7.4);
    const desiredLook = new THREE.Vector3(this.raceClearing.centerXAtWorldZ(aheadZ), 1.05, aheadZ);
    const smoothing = 1 - Math.exp(-delta * 3.2);
    this.camera.position.lerp(desiredCamera, smoothing);
    this.cameraLook.lerp(desiredLook, smoothing);
    this.camera.lookAt(this.cameraLook);
    this.updateRaceGuide(GAMEPLAY_DISTANCE, 'Trail checkpoint');

    if (tortoiseDistance >= GAMEPLAY_DISTANCE) {
      this.tortoise.playAnimation('Tortoise_Determined', 0.3);
      this.checkpointHandler = null;
      this.finishStorySequence();
    }
  }

  private updateRabbitFarAhead(): void {
    this.rabbit.group.position.y = this.raceClearing.napBedSurfaceHeight();
    if (this.storySequenceElapsed >= 3.2) this.finishStorySequence();
  }

  private updateRabbitNap(): void {
    const napPosition = this.raceClearing.napPosition();
    const landingProgress = THREE.MathUtils.smoothstep(this.storySequenceElapsed, 1.25, 3.45);
    const contactLoad = THREE.MathUtils.smoothstep(this.storySequenceElapsed, 2.05, 3.75);
    this.raceClearing.setNapBedLoad(contactLoad);
    this.rabbit.group.position.x = napPosition.x + landingProgress * NAP_LANDING_OFFSET_X;
    this.rabbit.group.position.z = napPosition.z;
    this.rabbit.group.position.y = this.raceClearing.napBedSurfaceHeight();
    this.rabbit.setEyesClosed(this.storySequenceElapsed >= 3.1);
    if (this.storySequenceElapsed >= 4.25 && this.storySequenceStage === 0) {
      this.storySequenceStage = 1;
      this.audio.startSnoring();
    }
    if (this.storySequenceElapsed >= 5.8) this.finishStorySequence();
  }

  private updateRaceSectionTwo(delta: number): void {
    const movement = this.input.read();
    const movingForward = movement.forward > 0;
    const moving = movingForward || movement.sideways !== 0;
    if (movingForward) {
      this.gameplayDistance = Math.min(
        SECOND_GAMEPLAY_END_DISTANCE,
        this.gameplayDistance + delta * 2.2,
      );
    }
    this.updateTortoiseLateralMovement(movement.sideways, delta);
    if (moving !== this.tortoiseMoving) {
      this.tortoiseMoving = moving;
      this.tortoise.playAnimation(moving ? 'Tortoise_Walk' : 'Tortoise_Determined', 0.22);
    }

    const tortoiseDistance = this.gameplayDistance;
    const tortoiseZ = RACE_START_Z - tortoiseDistance;
    this.raceClearing.pointOnTrail(tortoiseZ, this.tortoiseLateralOffset, this.tortoise.group.position);
    this.tortoise.group.position.y = TORTOISE_TRAIL_Y;
    this.tortoise.group.rotation.y = this.raceClearing.headingAtWorldZ(tortoiseZ)
      + Math.PI - movement.sideways * 0.14;
    this.raceClearing.setNapBedLoad(1);
    this.rabbit.group.position.y = this.raceClearing.napBedSurfaceHeight();

    while (
      this.checkpointIndex < SECOND_GAMEPLAY_CHECKPOINTS.length
      && tortoiseDistance >= SECOND_GAMEPLAY_CHECKPOINTS[this.checkpointIndex]!
    ) {
      this.checkpointHandler?.(this.checkpointIndex);
      this.checkpointIndex += 1;
    }

    if (tortoiseDistance >= 63 && this.storySequenceStage === 0) {
      this.storySequenceStage = 1;
      this.audio.stopSnoring();
      this.audio.playDistantCheering();
      const handler = this.passedRabbitHandler;
      this.passedRabbitHandler = null;
      handler?.();
    }

    const aheadZ = tortoiseZ - 11.5;
    const desiredCamera = new THREE.Vector3(this.tortoise.group.position.x, 4.15, tortoiseZ + 7.4);
    const desiredLook = new THREE.Vector3(this.raceClearing.centerXAtWorldZ(aheadZ), 1.05, aheadZ);
    const cameraSmoothing = 1 - Math.exp(-delta * 2.8);
    this.camera.position.lerp(desiredCamera, cameraSmoothing);
    this.cameraLook.lerp(desiredLook, cameraSmoothing);
    this.camera.lookAt(this.cameraLook);
    this.updateRaceGuide(SECOND_GAMEPLAY_END_DISTANCE, 'Trail checkpoint');

    if (tortoiseDistance >= SECOND_GAMEPLAY_END_DISTANCE) {
      this.tortoise.playAnimation('Tortoise_Determined', 0.3);
      this.checkpointHandler = null;
      this.passedRabbitHandler = null;
      this.finishStorySequence();
    }
  }

  private updateRabbitWake(): void {
    const napPosition = this.raceClearing.napPosition();
    const wakeProgress = THREE.MathUtils.smoothstep(this.storySequenceElapsed, 0.25, 2.2);
    this.raceClearing.setNapBedLoad(1 - wakeProgress);
    this.rabbit.group.position.y = this.raceClearing.napBedSurfaceHeight();
    this.rabbit.group.position.x = napPosition.x + NAP_LANDING_OFFSET_X;
    this.rabbit.group.position.z = napPosition.z;
    this.rabbit.setEyesClosed(this.storySequenceElapsed < 0.72);

    if (this.storySequenceElapsed >= 2.25 && this.storySequenceStage === 0) {
      this.storySequenceStage = 1;
      this.rabbit.playAnimation('Rabbit_Resting_Pose_Breathe', 0.38);
      this.rabbit.setAnimationSpeed(1);
    }
    if (this.storySequenceElapsed >= 3.15) this.finishStorySequence();
  }

  private updateRabbitConfidentRun(delta: number): void {
    const napPosition = this.raceClearing.napPosition();
    const entryProgress = THREE.MathUtils.smoothstep(this.storySequenceElapsed, 0, 0.95);
    if (entryProgress < 1) {
      this.rabbitChaseDistance = THREE.MathUtils.lerp(61, 61.8, entryProgress);
    } else {
      this.rabbitChaseDistance = Math.min(68.4, this.rabbitChaseDistance + delta * 2.65);
    }

    const rabbitZ = RACE_START_Z - this.rabbitChaseDistance;
    const trailX = this.raceClearing.centerXAtWorldZ(rabbitZ) - 0.62;
    this.rabbit.group.position.set(
      THREE.MathUtils.lerp(napPosition.x + NAP_LANDING_OFFSET_X, trailX, entryProgress),
      THREE.MathUtils.lerp(this.raceClearing.napBedSurfaceHeight(), 0, entryProgress),
      rabbitZ,
    );
    const heading = this.raceClearing.headingAtWorldZ(rabbitZ);
    this.rabbit.group.rotation.set(0, THREE.MathUtils.lerp(0, heading, entryProgress), 0);

    const tortoiseZ = RACE_START_Z - SECOND_GAMEPLAY_END_DISTANCE;
    const desiredCamera = new THREE.Vector3(this.rabbit.group.position.x + 0.65, 3.45, rabbitZ + 6.2);
    const desiredLook = new THREE.Vector3(this.raceClearing.centerXAtWorldZ(tortoiseZ), 1.1, tortoiseZ);
    const smoothing = 1 - Math.exp(-delta * 3.1);
    this.camera.position.lerp(desiredCamera, smoothing);
    this.cameraLook.lerp(desiredLook, smoothing);
    this.camera.lookAt(this.cameraLook);

    if (this.rabbitChaseDistance >= 68.4) {
      this.rabbit.playAnimation('Rabbit_Resting_Idle', 0.28);
      this.rabbit.setAnimationSpeed(1);
      this.finishStorySequence();
    }
  }

  private updateFinalRace(delta: number): void {
    const movement = this.input.read();
    const movingForward = movement.forward > 0;
    const moving = movingForward || movement.sideways !== 0;
    if (movingForward) {
      this.gameplayDistance = Math.min(
        FINAL_GAMEPLAY_END_DISTANCE,
        this.gameplayDistance + delta * FINAL_TORTOISE_SPEED,
      );
    }
    const previousRabbitDistance = this.rabbitChaseDistance;
    const finalRaceProgress = THREE.MathUtils.clamp(
      (this.gameplayDistance - FINAL_RACE_START_DISTANCE) / FINAL_RACE_LENGTH,
      0,
      1,
    );
    const closingProgress = finalRaceProgress * finalRaceProgress * (3 - 2 * finalRaceProgress);
    const desiredGap = THREE.MathUtils.lerp(
      FINAL_RABBIT_START_GAP,
      FINAL_RABBIT_FINISH_GAP,
      closingProgress,
    );
    const catchUpTarget = this.gameplayDistance - desiredGap;
    this.rabbitChaseDistance = Math.min(
      this.gameplayDistance - FINAL_RABBIT_MIN_GAP,
      Math.max(
        this.rabbitChaseDistance + delta * FINAL_RABBIT_SPEED,
        catchUpTarget,
      ),
    );
    const rabbitAdvancing = this.rabbitChaseDistance > previousRabbitDistance + 0.0001;
    if (rabbitAdvancing) {
      const actualRabbitSpeed = (this.rabbitChaseDistance - previousRabbitDistance) / delta;
      this.rabbit.setAnimationSpeed(THREE.MathUtils.clamp(
        actualRabbitSpeed / FINAL_TORTOISE_SPEED,
        0.82,
        1.45,
      ));
    }
    this.updateTortoiseLateralMovement(movement.sideways, delta);
    if (moving !== this.tortoiseMoving) {
      this.tortoiseMoving = moving;
      this.tortoise.playAnimation(moving ? 'Tortoise_Walk' : 'Tortoise_Determined', 0.2);
    }

    const rabbitZ = RACE_START_Z - this.rabbitChaseDistance;
    const tortoiseZ = RACE_START_Z - this.gameplayDistance;
    this.rabbit.group.position.set(
      this.raceClearing.centerXAtWorldZ(rabbitZ) - 0.58,
      rabbitAdvancing
        ? Math.max(0, Math.sin(this.storySequenceElapsed * 9.5)) * 0.1
        : 0,
      rabbitZ,
    );
    this.rabbit.group.rotation.y = this.raceClearing.headingAtWorldZ(rabbitZ);
    this.rabbit.group.rotation.z = Math.sin(this.storySequenceElapsed * 12) * 0.025;
    this.raceClearing.pointOnTrail(tortoiseZ, this.tortoiseLateralOffset, this.tortoise.group.position);
    this.tortoise.group.position.y = TORTOISE_TRAIL_Y;
    this.tortoise.group.rotation.y = this.raceClearing.headingAtWorldZ(tortoiseZ)
      + Math.PI - movement.sideways * 0.14;

    while (
      this.checkpointIndex < FINAL_RACE_CHECKPOINTS.length
      && this.gameplayDistance >= FINAL_RACE_CHECKPOINTS[this.checkpointIndex]!
    ) {
      this.checkpointHandler?.(this.checkpointIndex);
      this.checkpointIndex += 1;
    }

    const finishZ = RACE_START_Z - FINISH_DISTANCE;
    const finishX = this.raceClearing.centerXAtWorldZ(finishZ);
    const desiredCamera = new THREE.Vector3(
      finishX + 8.6,
      6.7,
      finishZ - 4.6,
    );
    const desiredLook = new THREE.Vector3(
      finishX,
      1.15,
      finishZ + 10.5,
    );
    const smoothing = 1 - Math.exp(-delta * 2.4);
    this.camera.position.lerp(desiredCamera, smoothing);
    this.cameraLook.lerp(desiredLook, smoothing);
    this.camera.lookAt(this.cameraLook);
    this.updateRaceGuide(FINAL_GAMEPLAY_END_DISTANCE, 'Finish line');

    if (this.gameplayDistance >= FINAL_GAMEPLAY_END_DISTANCE) {
      this.tortoise.playAnimation('Tortoise_Determined', 0.28);
      this.tortoise.setAnimationSpeed(1);
      this.checkpointHandler = null;
      this.finishStorySequence();
    }
  }

  private updateRaceGuide(
    targetDistance: number,
    label: string,
  ): void {
    if (!this.raceGuideHandler) return;
    const targetZ = RACE_START_Z - targetDistance;
    this.raceClearing.pointOnTrail(targetZ, 0, this.checkpointPoint);
    const dx = this.checkpointPoint.x - this.tortoise.group.position.x;
    const dz = this.checkpointPoint.z - this.tortoise.group.position.z;
    const worldAngle = Math.atan2(dx, -dz);
    const cameraAngle = Math.atan2(
      this.cameraLook.x - this.camera.position.x,
      -(this.cameraLook.z - this.camera.position.z),
    );
    const relativeAngle = Math.atan2(
      Math.sin(worldAngle - cameraAngle),
      Math.cos(worldAngle - cameraAngle),
    );
    this.raceGuideHandler(
      relativeAngle,
      this.tortoise.group.position.distanceTo(this.checkpointPoint),
      label,
    );
  }

  private updateTortoiseLateralMovement(sideways: number, delta: number): void {
    this.tortoiseLateralOffset = THREE.MathUtils.clamp(
      this.tortoiseLateralOffset + sideways * TORTOISE_LATERAL_SPEED * delta,
      -TORTOISE_LATERAL_LIMIT,
      TORTOISE_LATERAL_LIMIT,
    );
  }

  private updateTortoiseWin(delta: number): void {
    const crossingProgress = THREE.MathUtils.smoothstep(this.storySequenceElapsed, 0.15, 3.25);
    this.gameplayDistance = THREE.MathUtils.lerp(
      FINAL_GAMEPLAY_END_DISTANCE,
      FINISH_DISTANCE + 1.65,
      crossingProgress,
    );
    const tortoiseHasCrossed = this.gameplayDistance >= FINISH_DISTANCE;
    if (!tortoiseHasCrossed) {
      this.rabbitChaseDistance = Math.min(
        this.gameplayDistance - FINAL_RABBIT_MIN_GAP,
        this.rabbitChaseDistance + delta * 0.78,
      );
    } else {
      this.rabbitDisappointmentElapsed += delta;
      if (this.storySequenceStage === 0) {
        this.storySequenceStage = 1;
        this.audio.playTortoiseVictoryCue();
        this.audio.playVictoryCelebration();
        this.rabbit.clearBoneRotationOffsets();
        this.rabbit.poseAnimation('Rabbit_Resting_Idle', 0.3);
        this.rabbit.group.rotation.z = 0;
      }
      this.applyRabbitDisappointment(this.rabbitDisappointmentElapsed);
    }

    const tortoiseZ = RACE_START_Z - this.gameplayDistance;
    const rabbitZ = RACE_START_Z - this.rabbitChaseDistance;
    this.raceClearing.pointOnTrail(tortoiseZ, this.tortoiseLateralOffset, this.tortoise.group.position);
    this.tortoise.group.position.y = TORTOISE_TRAIL_Y;
    this.tortoise.group.rotation.y = this.raceClearing.headingAtWorldZ(tortoiseZ) + Math.PI;
    this.rabbit.group.position.set(
      this.raceClearing.centerXAtWorldZ(rabbitZ) - 0.58,
      0,
      rabbitZ,
    );
    this.rabbit.group.rotation.y = this.raceClearing.headingAtWorldZ(rabbitZ);
    if (!tortoiseHasCrossed) {
      this.rabbit.group.rotation.z = Math.sin(this.storySequenceElapsed * 11) * 0.02;
    }

    const finishZ = RACE_START_Z - FINISH_DISTANCE;
    const finishX = this.raceClearing.centerXAtWorldZ(finishZ);
    const resultFocus = THREE.MathUtils.smoothstep(this.rabbitDisappointmentElapsed, 0, 1.1);
    const desiredCamera = new THREE.Vector3(
      THREE.MathUtils.lerp(finishX + 7.3, finishX + 6.4, resultFocus),
      THREE.MathUtils.lerp(4.8, 3.9, resultFocus),
      THREE.MathUtils.lerp(finishZ - 5.2, finishZ - 2.7, resultFocus),
    );
    const desiredLook = new THREE.Vector3(
      finishX,
      THREE.MathUtils.lerp(1.15, 1.0, resultFocus),
      THREE.MathUtils.lerp(finishZ + 1.5, finishZ + 3.0, resultFocus),
    );
    const smoothing = 1 - Math.exp(-delta * 3.4);
    this.camera.position.lerp(desiredCamera, smoothing);
    this.cameraLook.lerp(desiredLook, smoothing);
    this.camera.lookAt(this.cameraLook);

    if (this.storySequenceElapsed >= 3.05 && this.storySequenceStage < 2) {
      this.storySequenceStage = 2;
      this.tortoise.playAnimation('Tortoise_Celebrate', 0.35);
      this.tortoise.setAnimationSpeed(1);
    }
    if (this.storySequenceElapsed >= 4.35) this.finishStorySequence();
  }

  private updateEndingTableau(delta: number): void {
    const finishZ = RACE_START_Z - FINISH_DISTANCE;
    const finishX = this.raceClearing.centerXAtWorldZ(finishZ);
    const rabbitZ = RACE_START_Z - this.rabbitChaseDistance;
    this.rabbit.group.position.set(
      this.raceClearing.centerXAtWorldZ(rabbitZ) - 0.6,
      0,
      rabbitZ,
    );
    this.rabbit.group.rotation.y = this.raceClearing.headingAtWorldZ(rabbitZ);

    this.rabbitDisappointmentElapsed += delta;
    this.applyRabbitDisappointment(this.rabbitDisappointmentElapsed);

    const zoomProgress = THREE.MathUtils.smoothstep(this.storySequenceElapsed, 0, 5.6);
    const wideCamera = new THREE.Vector3(finishX + 13.8, 9.2, finishZ + 15.5);
    const wideLook = new THREE.Vector3(finishX, 1.3, finishZ + 0.4);
    const frameSmoothing = 1 - Math.exp(-delta * (1.2 + zoomProgress * 0.7));
    this.camera.position.lerp(wideCamera, frameSmoothing);
    this.cameraLook.lerp(wideLook, frameSmoothing);
    this.camera.lookAt(this.cameraLook);

    if (this.storySequenceElapsed >= 5.8) this.finishStorySequence();
  }

  private applyRabbitDisappointment(elapsed: number): void {
    const shakeStrength = THREE.MathUtils.smoothstep(elapsed, 0.28, 0.82);
    const headShake = Math.sin(Math.max(0, elapsed - 0.28) * Math.PI * 1.7)
      * THREE.MathUtils.degToRad(10)
      * shakeStrength;
    this.rabbit.group.rotation.x = 0;
    this.rabbit.group.rotation.z = 0;
    this.rabbit.setBoneRotationOffset('Neck', 0, headShake * 0.28, 0);
    this.rabbit.setBoneRotationOffset('Head', 0, headShake, 0);
  }

  private finishStorySequence(): void {
    this.storySequence = null;
    const handler = this.storySequenceCompleteHandler;
    this.storySequenceCompleteHandler = null;
    handler?.();
  }

  private resetRabbitTransform(): void {
    this.rabbit.group.position.copy(RABBIT_HOME);
    this.rabbit.group.rotation.set(0, RABBIT_FACING, 0);
  }

  private positionCamera(immediate: boolean, delta = 1): void {
    const desiredX = this.worldX;
    const desiredY = 4.7 + Math.sin((this.worldX + this.worldZ) * 0.025) * 0.15;
    const smoothing = immediate ? 1 : 1 - Math.exp(-delta * 5.5);
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, desiredX, smoothing);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, desiredY, smoothing);
    this.camera.position.z = this.worldZ;
    const targetZ = this.worldZ - 19;
    this.lookTarget.set(this.worldX, 2.1, targetZ);
    this.cameraLook.copy(this.lookTarget);
    this.camera.lookAt(this.lookTarget);
  }

  private resize(): void {
    const width = this.renderer.domElement.parentElement?.clientWidth ?? window.innerWidth;
    const height = this.renderer.domElement.parentElement?.clientHeight ?? window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    const bufferWidth = Math.floor(width * pixelRatio);
    const bufferHeight = Math.floor(height * pixelRatio);
    if (this.renderer.domElement.width !== bufferWidth || this.renderer.domElement.height !== bufferHeight) {
      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / Math.max(1, height);
      this.camera.fov = width < height ? 62 : 54;
      this.camera.updateProjectionMatrix();
    }
  }
}

function createSky(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(175, 32, 18);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x36aef0) },
      horizonColor: { value: new THREE.Color(0xdaf5f1) },
    },
    vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 topColor; uniform vec3 horizonColor; varying float vY; void main(){ float h = smoothstep(-0.1, 0.7, vY); gl_FragColor = vec4(mix(horizonColor, topColor, h), 1.0); }',
  });
  return new THREE.Mesh(geometry, material);
}

function createClouds(): THREE.Group {
  const clouds = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1, 14, 10);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9, depthWrite: false });
  const locations = [[-34, 19, -20], [27, 23, -48], [-5, 26, -78], [42, 18, -92]];
  locations.forEach(([x, y, z], cloudIndex) => {
    const cloud = new THREE.Group();
    for (let i = 0; i < 6; i += 1) {
      const puff = new THREE.Mesh(geometry, material);
      puff.position.set((i - 2.5) * 1.6, Math.sin(i * 1.7) * 0.7, (i % 2) * 0.5);
      puff.scale.set(2.5 + (i % 3), 1.8 + (i % 2), 1.8);
      cloud.add(puff);
    }
    cloud.position.set(x, y, z + cloudIndex * 3);
    clouds.add(cloud);
  });
  return clouds;
}

function createBirds(): THREE.Group {
  const flock = new THREE.Group();
  const colors = [0x197eb8, 0xd87922, 0x194e78];
  for (let i = 0; i < 5; i += 1) {
    const bird = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide });
    const wingGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.4, 0.25, 0), new THREE.Vector3(0.35, -0.12, 0),
    ]);
    wingGeometry.setIndex([0, 1, 2]);
    const left = new THREE.Mesh(wingGeometry, material);
    const right = left.clone();
    right.scale.x = -1;
    bird.add(left, right);
    bird.position.set((i - 2) * 7.5, 16 + (i % 2) * 3, -i * 8);
    bird.scale.setScalar(0.55 + i * 0.08);
    flock.add(bird);
  }
  return flock;
}

function createButterflies(): THREE.Group {
  const group = new THREE.Group();
  const geometry = new THREE.CircleGeometry(0.16, 10, 0, Math.PI);
  [0x2588ff, 0xff7a27, 0x9e58e8].forEach((color, index) => {
    const butterfly = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const left = new THREE.Mesh(geometry, material);
    left.rotation.y = -0.8;
    const right = left.clone();
    right.scale.x = -1;
    right.rotation.y = 0.8;
    butterfly.add(left, right);
    butterfly.position.set((index - 1) * 8 + 3, 1, -index * 7);
    group.add(butterfly);
  });
  return group;
}

function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    geometries.add(child.geometry);
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    childMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
