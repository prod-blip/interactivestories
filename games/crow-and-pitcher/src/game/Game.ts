import type { StoryViewport } from '@moonlit/story-runtime';
import * as THREE from 'three';
import { storyScenes } from '../story/script';
import { AudioDirector } from './audio/AudioDirector';
import { Crow, type MovementBounds } from './characters/Crow';
import { InputController } from './input';
import { Pebble } from './objects/Pebble';
import { Pitcher } from './objects/Pitcher';
import { resizeRenderer } from './responsive';
import { GardenScene } from './scenes/GardenScene';
import type { StoryPhase } from './types';
import { Hud } from './ui/Hud';
import { GARDEN_WALL_POSITION, PITCHER_POSITION, SUMMER_SUN_DIRECTION } from './worldLayout';

type CameraMode = 'title' | 'cinematic' | 'flight' | 'arrival' | 'pitcher-front' | 'pitcher-inside' | 'thinking' | 'pebbles' | 'drinking' | 'ending';

type ScriptedCrowMotion = {
  start: THREE.Vector3;
  target: THREE.Vector3;
  elapsed: number;
  duration: number;
  landAtEnd: boolean;
  resolve: () => void;
};

const RIM_PERCH_OFFSET = new THREE.Vector3(0, 0, -0.4);
const CROW_COLLISION_RADIUS = 0.48;
const PITCHER_COLLISION_RADIUS = 1.05 * 0.82 + CROW_COLLISION_RADIUS;
const SHADOW_EXTENT = 50;
const SHADOW_MAP_SIZE = 4096;
const SHADOW_CENTER = new THREE.Vector3(0, 1.5, 0);
const WALL_COLLISION_BOUNDS = {
  minX: GARDEN_WALL_POSITION.x - 8.5 - CROW_COLLISION_RADIUS,
  maxX: GARDEN_WALL_POSITION.x + 8.5 + CROW_COLLISION_RADIUS,
  minZ: GARDEN_WALL_POSITION.z - 0.48 - CROW_COLLISION_RADIUS,
  maxZ: GARDEN_WALL_POSITION.z + 0.48 + CROW_COLLISION_RADIUS,
};
const CLEARING_RADIUS = 8.2;
const CLEARING_BOUNDS: MovementBounds = {
  minX: PITCHER_POSITION.x - CLEARING_RADIUS,
  maxX: PITCHER_POSITION.x + CLEARING_RADIUS,
  minZ: PITCHER_POSITION.z - CLEARING_RADIUS,
  maxZ: PITCHER_POSITION.z + CLEARING_RADIUS,
};

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 130);
  private readonly sunLight = new THREE.DirectionalLight(0xffdfaa, 3.2);
  private readonly sunTarget = new THREE.Object3D();
  private readonly clock = new THREE.Clock();
  private readonly garden = new GardenScene();
  private readonly crow = new Crow();
  private readonly pitcher = new Pitcher(PITCHER_POSITION);
  private readonly pebbles = [
    new Pebble(new THREE.Vector3(-2.7, 0.12, -13.8), 0x9c9487),
    new Pebble(new THREE.Vector3(5.7, 0.12, -14.8), 0x827d76),
    new Pebble(new THREE.Vector3(6.1, 0.12, -20.1), 0xa29a8d),
    new Pebble(new THREE.Vector3(-3.8, 0.12, -20.7), 0x8f897f),
  ];
  private readonly marker = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.57, 32),
    new THREE.MeshBasicMaterial({ color: 0xbeb087, transparent: true, opacity: 0.62, side: THREE.DoubleSide }),
  );
  private readonly guidanceTrail = new THREE.Group();
  private readonly input: InputController;
  private readonly hud: Hud;
  private readonly audio = new AudioDirector();
  private readonly drinkingTarget = new THREE.Vector3();
  private readonly crowPositionBeforeMove = new THREE.Vector3();
  private animationId = 0;
  private started = false;
  private running = false;
  private disposed = false;
  private controlsEnabled = false;
  private reducedMotion = false;
  private phase: StoryPhase = 'title';
  private cameraMode: CameraMode = 'title';
  private carriedPebble: Pebble | null = null;
  private droppedCount = 0;
  private completionHandler: (() => void) | null = null;
  private elapsed = 0;
  private phaseElapsed = 0;
  private lastPitcherDistance = Infinity;
  private wrongWayTime = 0;
  private thoughtElapsed = 0;
  private thoughtIndex = 0;
  private boundaryHintCooldown = 0;
  private scriptedCrowMotion: ScriptedCrowMotion | null = null;
  private waitingForRimTakeoff = false;
  private successHovering = false;
  private successDrinking = false;

  constructor(parent: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'A calm summer storybook landscape with fields, an old tree, a garden wall, a cart, and a clay pitcher');
    parent.appendChild(this.renderer.domElement);
    this.input = new InputController(parent);
    this.hud = new Hud(parent);

    this.scene.background = new THREE.Color(0xc1d3d5);
    // Preserve the distant landscape's color. The previous fog reached full
    // opacity before the camera's far plane and turned scenery pale grey.
    this.scene.fog = new THREE.Fog(0xa9bfba, 82, 155);
    this.scene.add(this.garden.group, this.crow.group, this.pitcher.group, this.marker, this.guidanceTrail);
    this.crow.group.position.set(0, 0, 22);
    this.pebbles.forEach((pebble) => {
      pebble.group.visible = false;
      this.scene.add(pebble.group);
    });
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.07;
    this.marker.visible = false;
    this.createGuidanceTrail();
    this.softenWorldPalette();

    const hemisphere = new THREE.HemisphereLight(0xe5eff0, 0x927758, 2.4);
    this.sunLight.castShadow = true;
    this.sunLight.target = this.sunTarget;
    this.sunLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.left = -SHADOW_EXTENT;
    this.sunLight.shadow.camera.right = SHADOW_EXTENT;
    this.sunLight.shadow.camera.top = SHADOW_EXTENT;
    this.sunLight.shadow.camera.bottom = -SHADOW_EXTENT;
    this.sunLight.shadow.camera.far = 180;
    this.sunLight.shadow.bias = -0.00004;
    this.sunLight.shadow.normalBias = 0.025;
    // Keep the light and its projection fixed in world space. Moving this
    // camera with the crow made every shadow edge jump between shadow texels.
    this.sunTarget.position.copy(SHADOW_CENTER);
    this.sunLight.position.copy(SHADOW_CENTER).addScaledVector(SUMMER_SUN_DIRECTION, 90);
    this.scene.add(hemisphere, this.sunTarget, this.sunLight);

    this.camera.position.set(0, 14, 39);
    this.camera.lookAt(0, 1.5, 12);
    this.hud.setObjective('A quiet story is about to begin', 'The Crow and the Pitcher');
    this.hud.setObjectiveVisible(false);
    this.hud.updateCompass(0, -1, false);
  }

  async prepare(onProgress: (progress: number, stage: string) => void): Promise<void> {
    onProgress(0.12, 'Softening the summer light');
    resizeRenderer(this.renderer, this.camera);
    this.renderer.render(this.scene, this.camera);
    onProgress(0.3, 'Calling the little crow');
    await this.crow.load(`${import.meta.env.BASE_URL}models/crow.glb`);
    onProgress(0.58, 'Preparing the old garden wall');
    await this.renderer.compileAsync(this.scene, this.camera);
    onProgress(0.86, 'Placing four smooth pebbles');
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    this.renderer.render(this.scene, this.camera);
    onProgress(1, 'Ready');
  }

  start(): void {
    if (this.started) {
      this.resume();
      return;
    }
    this.started = true;
    this.running = true;
    this.clock.start();
    this.tick();
  }

  beginStory(): void {
    if (this.phase !== 'title') return;
    void this.playCinematicOpening();
    void this.audio.start().catch((error: unknown) => console.warn('Unable to start story audio.', error));
  }

  pause(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.animationId);
    this.clock.stop();
    void this.audio.pause();
  }

  resume(): void {
    if (!this.started || this.running || this.disposed) return;
    this.running = true;
    this.clock.start();
    void this.audio.resume();
    this.tick();
  }

  restart(): void {
    window.location.reload();
  }

  setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
  }

  onViewportChange(viewport: StoryViewport): void {
    this.reducedMotion = viewport.reducedMotion;
    this.crow.setReducedMotion(viewport.reducedMotion);
    this.audio.setReducedMotion(viewport.reducedMotion);
    document.documentElement.dataset.storyOrientation = viewport.orientation;
  }

  setCompletionHandler(handler: () => void): void {
    this.completionHandler = handler;
  }

  dispose(): void {
    this.disposed = true;
    this.running = false;
    this.scriptedCrowMotion?.resolve();
    this.scriptedCrowMotion = null;
    cancelAnimationFrame(this.animationId);
    this.input.dispose();
    this.hud.dispose();
    this.audio.dispose();
    this.garden.dispose();
    this.crow.dispose();
    this.pitcher.dispose();
    this.pebbles.forEach((pebble) => {
      pebble.group.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      });
    });
    this.guidanceTrail.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    });
    this.marker.geometry.dispose();
    (this.marker.material as THREE.Material).dispose();
    this.renderer.dispose();
  }

  private readonly tick = () => {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(this.tick);
    const delta = Math.min(0.05, this.clock.getDelta());
    resizeRenderer(this.renderer, this.camera);
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private update(delta: number): void {
    this.elapsed += delta;
    this.phaseElapsed += delta;
    this.boundaryHintCooldown = Math.max(0, this.boundaryHintCooldown - delta);
    this.pitcher.update(delta);
    this.pebbles.forEach((pebble) => pebble.update(delta, this.reducedMotion));

    if (this.scriptedCrowMotion) {
      this.updateScriptedCrowMotion(delta);
    } else switch (this.phase) {
      case 'title':
        this.crow.updateCinematicFlight(delta);
        this.crow.group.position.x = Math.sin(this.elapsed * 0.22) * 2.4;
        break;
      case 'cinematic-flight':
        this.crow.updateCinematicFlight(delta);
        this.crow.group.position.x = Math.sin(this.elapsed * 0.34) * 2.4;
        this.crow.group.position.z = Math.max(8, this.crow.group.position.z - delta * 0.62);
        break;
      case 'flight-tutorial':
      case 'find-pitcher':
        this.updateOpenFlight(delta);
        break;
      case 'collecting':
      case 'carrying':
        if (this.waitingForRimTakeoff && this.hasDirectionalInput()) {
          this.waitingForRimTakeoff = false;
          this.crow.syncFlightHeightToPosition();
          this.cameraMode = 'flight';
        }
        if (this.waitingForRimTakeoff) {
          this.crow.updatePose(delta, false);
        } else {
          this.crowPositionBeforeMove.copy(this.crow.group.position);
          this.crow.update(delta, this.input.state, this.controlsEnabled, CLEARING_BOUNDS);
          this.resolvePlayerCollisions(this.crowPositionBeforeMove);
          this.gentlyContainCrow(delta);
        }
        this.updatePebbleGameplay();
        break;
      case 'drinking-scene':
        this.crow.updatePose(delta, this.successHovering);
        if (this.successDrinking) {
          this.pitcher.getWaterSurfaceWorldPosition(this.drinkingTarget);
          this.drinkingTarget.y -= 0.015;
          this.crow.alignBeakTo(this.drinkingTarget);
        }
        break;
      case 'ending-flight':
      case 'moral-screen':
        this.crow.updateDeparture(delta);
        break;
      case 'free-explore':
        this.crowPositionBeforeMove.copy(this.crow.group.position);
        this.crow.updateOpenFlight(delta, this.input.state, this.controlsEnabled);
        this.resolvePlayerCollisions(this.crowPositionBeforeMove);
        break;
      default:
        this.crow.updatePose(delta, false);
    }
    this.audio.setFlying(this.crow.isFlying);
    this.audio.setDrinking(this.successDrinking);
    this.garden.update(this.crow.group.position, delta, this.reducedMotion);
    this.updateGuidance();
    this.updateCamera(delta);
  }

  private async playCinematicOpening(): Promise<void> {
    this.setPhase('cinematic-flight');
    this.cameraMode = 'cinematic';
    this.controlsEnabled = false;
    this.input.setEnabled(false);
    this.hud.setObjectiveVisible(false);
    this.hud.updateCompass(0, -1, false);
    await this.hud.playOpeningNarration(storyScenes.cinematicOpening);
    if (this.disposed) return;

    this.crow.group.rotation.y = 0;
    this.setPhase('flight-tutorial');
    this.cameraMode = 'flight';
    this.controlsEnabled = true;
    this.input.setEnabled(true);
    this.input.setActionLabel('Boost');
    this.input.setActionVisible(true);
    this.hud.setObjectiveVisible(true);
    this.hud.setObjective('Guide the crow towards the garden wall', 'Find the pitcher');
    this.hud.showObjective('Guide the crow towards the garden wall');
    this.hud.showHint('Follow the compass.');
  }

  private updateOpenFlight(delta: number): void {
    const moved = this.hasFlightInput();
    this.crowPositionBeforeMove.copy(this.crow.group.position);
    this.crow.updateOpenFlight(delta, this.input.state, this.controlsEnabled);
    this.resolvePlayerCollisions(this.crowPositionBeforeMove);
    if (this.phase === 'flight-tutorial' && moved) {
      this.setPhase('find-pitcher');
    }

    const distance = this.crow.group.position.distanceTo(this.pitcher.interactionPosition);
    if (distance < 3.1) {
      void this.enterPitcherDiscovery();
      return;
    }
    const gettingFarther = distance > this.lastPitcherDistance + 0.015;
    this.wrongWayTime = gettingFarther ? this.wrongWayTime + delta : Math.max(0, this.wrongWayTime - delta * 0.7);
    this.lastPitcherDistance = distance;
    this.thoughtElapsed += delta;

    if (this.thoughtElapsed > 6.5 && this.thoughtIndex < storyScenes.flightThoughts.length) {
      const thought = storyScenes.flightThoughts[this.thoughtIndex];
      this.hud.showThought('Crow', thought, 4200);
      this.thoughtIndex += 1;
      this.thoughtElapsed = 0;
    }
    if (this.wrongWayTime > 10 && this.wrongWayTime - delta <= 10) {
      this.hud.showThought('Crow', 'I think I should look near the garden wall.');
      this.hud.showHint('The compass is glowing a little brighter.');
    }
    if (this.phaseElapsed > 2.5) {
      const nudgeStrength = this.wrongWayTime > 10 ? 0.72 : 0.12;
      this.crow.nudgeFlightToward(this.pitcher.interactionPosition, delta, nudgeStrength);
    }
  }

  private async enterPitcherDiscovery(): Promise<void> {
    if (this.phase !== 'find-pitcher' && this.phase !== 'flight-tutorial') return;
    this.setPhase('pitcher-discovery');
    this.controlsEnabled = false;
    this.input.setEnabled(false);
    this.input.setActionVisible(false);
    this.hud.updateCompass(0, -1, false);
    this.marker.visible = false;
    this.guidanceTrail.visible = false;
    this.cameraMode = 'arrival';
    this.hud.showObjective('The crow found an old clay pitcher');

    const groundRestPosition = PITCHER_POSITION.clone().add(new THREE.Vector3(0, 0, 2.4));
    this.crow.setLookingDown(false);
    await this.moveCrowTo(groundRestPosition, 0.9);
    if (this.disposed) return;
    this.crow.faceToward(PITCHER_POSITION);
    await this.hud.playDialogue(storyScenes.pitcherArrival);
    if (this.disposed) return;

    // Perch on the far edge, opposite the camera, so the crow's face and the
    // pitcher opening share the same readable view.
    const rimPerchPosition = PITCHER_POSITION.clone()
      .add(RIM_PERCH_OFFSET)
      .setY(this.pitcher.rimHeight + 0.02);
    this.cameraMode = 'pitcher-inside';
    await this.moveCrowTo(rimPerchPosition, 1.15);
    if (this.disposed) return;
    this.crow.faceToward(PITCHER_POSITION);
    this.crow.setLookingDown(true);
    this.cameraMode = 'pitcher-inside';
    await this.hud.playDialogue(storyScenes.waterTooLow);

    this.crow.setLookingDown(false);
    this.crow.faceToward(PITCHER_POSITION);
    // The crow remains seated on the rim while he pauses to think.
    this.cameraMode = 'thinking';
    await this.hud.playDialogue(storyScenes.thinking);
    if (this.disposed) return;

    this.setPhase('pebble-discovery');
    this.pebbles.forEach((pebble) => {
      pebble.group.visible = true;
      pebble.setHighlighted(true);
    });
    this.cameraMode = 'pebbles';
    this.hud.showThought('Crow', storyScenes.pebbleDiscovery[0].text, 3600);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 1200));
    if (this.disposed) return;
    this.startPebbleGameplay();
  }

  private moveCrowTo(target: THREE.Vector3, duration: number, landAtEnd = true): Promise<void> {
    return new Promise((resolve) => {
      this.crow.faceToward(target);
      this.scriptedCrowMotion = {
        start: this.crow.group.position.clone(),
        target: target.clone(),
        elapsed: 0,
        duration: this.reducedMotion ? duration * 0.55 : duration,
        landAtEnd,
        resolve,
      };
    });
  }

  private updateScriptedCrowMotion(delta: number): void {
    const motion = this.scriptedCrowMotion;
    if (!motion) return;
    motion.elapsed += delta;
    const progress = THREE.MathUtils.clamp(motion.elapsed / motion.duration, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    this.crow.group.position.lerpVectors(motion.start, motion.target, eased);
    this.crow.updatePose(delta, true);
    if (progress < 1) return;

    this.scriptedCrowMotion = null;
    if (motion.landAtEnd) this.crow.updatePose(0, false);
    motion.resolve();
  }

  private startPebbleGameplay(): void {
    this.setPhase('collecting');
    this.waitingForRimTakeoff = true;
    this.controlsEnabled = true;
    this.input.setEnabled(true);
    this.input.setActionVisible(false);
    this.hud.setObjective('Find and collect the four pebbles', 'The crow has a plan');
    this.hud.showObjective('Collect the four smooth pebbles');
    this.hud.showHint('Fly close to a pebble and the crow will pick it up.');
    this.hud.setCounter(0, this.pebbles.length);
    this.highlightAvailablePebbles();
  }

  private updatePebbleGameplay(): void {
    if (this.phase === 'collecting') {
      const pebble = this.closestAvailablePebble();
      if (!pebble || pebble.group.position.distanceTo(this.crow.group.position) > 0.92) return;
      pebble.collected = true;
      pebble.setHighlighted(false);
      this.carriedPebble = pebble;
      this.crow.carry(pebble.group);
      this.setPhase('carrying');
      this.audio.playPickup();
      this.hud.setObjective('Return to the pitcher', 'Pebble in the crow’s beak');
      this.hud.showHint('Carry the pebble back to the pitcher.');
      this.hud.setCounter(this.droppedCount, this.pebbles.length, true);
      return;
    }

    if (!this.carriedPebble || this.crow.group.position.distanceTo(this.pitcher.interactionPosition) > 1.5) return;
    const pebbleMesh = this.crow.releaseCarried();
    this.droppedCount += 1;
    if (pebbleMesh) this.pitcher.addPebble(pebbleMesh, this.droppedCount, this.pebbles.length);
    this.audio.playDrop(this.droppedCount);
    this.carriedPebble = null;
    this.hud.setCounter(this.droppedCount, this.pebbles.length);

    if (this.droppedCount === 1) this.hud.showThought('Crow', 'The water moved!');
    if (this.droppedCount === 2) this.hud.showThought('Crow', 'It is rising!');
    if (this.droppedCount === 3) this.hud.showThought('Narrator', 'One pebble at a time, the water rose higher.');
    if (this.droppedCount >= this.pebbles.length) {
      void this.playSuccessAndEnding();
      return;
    }

    this.setPhase('collecting');
    this.hud.setObjective(`Find pebble ${this.droppedCount + 1} of ${this.pebbles.length}`, 'One pebble at a time');
    this.highlightAvailablePebbles();
  }

  private async playSuccessAndEnding(): Promise<void> {
    this.setPhase('drinking-scene');
    this.controlsEnabled = false;
    this.input.setEnabled(false);
    this.marker.visible = false;
    this.hud.hideCounter();
    this.hud.updateCompass(0, -1, false);
    this.crow.group.position.copy(PITCHER_POSITION)
      .add(RIM_PERCH_OFFSET)
      .setY(this.pitcher.rimHeight + 0.02);
    this.crow.faceToward(PITCHER_POSITION);
    this.crow.setLookingDown(false);
    this.crow.setDrinking(false);
    this.successHovering = false;
    this.successDrinking = false;
    this.cameraMode = 'pitcher-inside';
    this.pitcher.startRipple();
    await this.hud.playDialogue(storyScenes.success.slice(0, 2));

    this.cameraMode = 'drinking';
    this.successHovering = true;
    const drinkingHoverPosition = PITCHER_POSITION.clone()
      .add(new THREE.Vector3(0, 0, -0.16))
      .setY(this.pitcher.rimHeight + 0.12);
    await this.moveCrowTo(drinkingHoverPosition, 0.72, false);
    if (this.disposed) return;
    this.crow.faceToward(PITCHER_POSITION);
    await this.hud.playDialogue(storyScenes.success.slice(2), (_line, index) => {
      const drinking = index === 0;
      this.successDrinking = drinking;
      this.crow.setDrinking(drinking);
      if (drinking) this.pitcher.startRipple();
    });
    if (this.disposed) return;

    this.crow.setDrinking(false);
    this.successDrinking = false;
    this.crow.setLookingDown(false);
    this.cameraMode = 'ending';
    await this.hud.playDialogue(storyScenes.ending.slice(0, 1));
    this.setPhase('ending-flight');
    this.audio.playEnding();
    await this.hud.playDialogue(storyScenes.ending.slice(1));
    if (this.disposed) return;

    this.setPhase('moral-screen');
    this.controlsEnabled = false;
    this.completionHandler?.();
    this.hud.showEnding(storyScenes.moral, storyScenes.moralExplanation, {
      onRestart: () => this.restart(),
      onExplore: () => this.startFreeExplore(),
      onMenu: () => this.goToMainMenu(),
    });
  }

  private startFreeExplore(): void {
    this.hud.hideEnding();
    this.setPhase('free-explore');
    this.cameraMode = 'flight';
    this.controlsEnabled = true;
    this.crow.group.position.copy(this.pitcher.interactionPosition).add(new THREE.Vector3(0, 1.75, 1));
    this.input.setEnabled(true);
    this.input.setActionLabel('Boost');
    this.input.setActionVisible(true);
    this.hud.setObjective('Explore the quiet countryside', 'Free explore');
    this.hud.showObjective('Fly wherever you would like.');
    this.hud.updateCompass(0, -1, false);
  }

  private updateGuidance(): void {
    const flightPhase = this.phase === 'flight-tutorial' || this.phase === 'find-pitcher';
    const pebblePhase = this.phase === 'collecting' || this.phase === 'carrying';
    if (!flightPhase && !pebblePhase) return;
    const target = flightPhase
      ? this.pitcher.interactionPosition
      : this.phase === 'carrying'
        ? this.pitcher.interactionPosition
        : this.closestAvailablePebble()?.group.position;
    if (!target) return;

    const dx = target.x - this.crow.group.position.x;
    const dz = target.z - this.crow.group.position.z;
    const distance = Math.hypot(dx, dz);
    const showDistance = flightPhase && this.phaseElapsed < 6 ? -1 : distance;
    const assisted = flightPhase && this.wrongWayTime > 10;
    this.hud.updateCompass(Math.atan2(dx, -dz), showDistance, true, assisted);
    // Every remaining pebble owns a visible ring. Keep the former single
    // target marker hidden so no pebble appears mandatory.
    this.marker.visible = false;
    this.marker.position.set(target.x, 0.07, target.z);
    const pulse = this.reducedMotion ? 1 : 1 + Math.sin(this.elapsed * 2.4) * 0.08;
    this.marker.scale.setScalar(pulse);
    this.updateGuidanceTrail(target, assisted);
  }

  private updateGuidanceTrail(target: THREE.Vector3, visible: boolean): void {
    this.guidanceTrail.visible = visible;
    if (!visible) return;
    const start = this.crow.group.position;
    this.guidanceTrail.children.forEach((particle, index) => {
      const progress = (index + 1) / (this.guidanceTrail.children.length + 2);
      particle.position.lerpVectors(start, target, Math.min(0.38, progress * 0.45));
      particle.position.y = 1.1 + Math.sin(this.elapsed * 1.5 + index) * 0.12;
    });
  }

  private highlightAvailablePebbles(): void {
    const available = this.pebbles.filter((pebble) => !pebble.collected);
    available.forEach((pebble) => pebble.setHighlighted(true, available.length === 1));
  }

  private closestAvailablePebble(): Pebble | null {
    let closest: Pebble | null = null;
    let closestDistance = Infinity;
    for (const pebble of this.pebbles) {
      if (pebble.collected) continue;
      const distance = pebble.group.position.distanceToSquared(this.crow.group.position);
      if (distance < closestDistance) {
        closest = pebble;
        closestDistance = distance;
      }
    }
    return closest;
  }

  private gentlyContainCrow(delta: number): void {
    const offset = this.crow.group.position.clone().sub(PITCHER_POSITION).setY(0);
    if (offset.length() <= CLEARING_RADIUS - 0.25) return;
    const safePosition = PITCHER_POSITION.clone().add(offset.setLength(CLEARING_RADIUS - 0.7));
    this.crow.group.position.lerp(safePosition, 1 - Math.exp(-delta * 2.8));
    this.crow.turnToward(PITCHER_POSITION, delta);
    if (this.phaseElapsed > 2 && this.boundaryHintCooldown === 0) {
      this.hud.showHint('The pebbles are back near the pitcher.');
      this.boundaryHintCooldown = 6;
    }
  }

  private resolvePlayerCollisions(previousPosition: THREE.Vector3): void {
    this.resolveWallCollision(previousPosition);
    this.resolvePitcherCollision(previousPosition);
  }

  private resolvePitcherCollision(previousPosition: THREE.Vector3): void {
    const position = this.crow.group.position;
    const dx = position.x - PITCHER_POSITION.x;
    const dz = position.z - PITCHER_POSITION.z;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared >= PITCHER_COLLISION_RADIUS * PITCHER_COLLISION_RADIUS) return;

    let normalX = dx;
    let normalZ = dz;
    const distance = Math.sqrt(distanceSquared);
    if (distance < 0.0001) {
      normalX = previousPosition.x - PITCHER_POSITION.x;
      normalZ = previousPosition.z - PITCHER_POSITION.z;
      const previousDistance = Math.hypot(normalX, normalZ) || 1;
      normalX /= previousDistance;
      normalZ /= previousDistance;
    } else {
      normalX /= distance;
      normalZ /= distance;
    }
    position.x = PITCHER_POSITION.x + normalX * PITCHER_COLLISION_RADIUS;
    position.z = PITCHER_POSITION.z + normalZ * PITCHER_COLLISION_RADIUS;
  }

  private resolveWallCollision(previousPosition: THREE.Vector3): void {
    const position = this.crow.group.position;
    const bounds = WALL_COLLISION_BOUNDS;
    if (position.x <= bounds.minX || position.x >= bounds.maxX || position.z <= bounds.minZ || position.z >= bounds.maxZ) return;

    if (previousPosition.z <= bounds.minZ) {
      position.z = bounds.minZ;
      return;
    }
    if (previousPosition.z >= bounds.maxZ) {
      position.z = bounds.maxZ;
      return;
    }
    if (previousPosition.x <= bounds.minX) {
      position.x = bounds.minX;
      return;
    }
    if (previousPosition.x >= bounds.maxX) {
      position.x = bounds.maxX;
      return;
    }

    const distances = [
      { axis: 'x' as const, value: bounds.minX, depth: position.x - bounds.minX },
      { axis: 'x' as const, value: bounds.maxX, depth: bounds.maxX - position.x },
      { axis: 'z' as const, value: bounds.minZ, depth: position.z - bounds.minZ },
      { axis: 'z' as const, value: bounds.maxZ, depth: bounds.maxZ - position.z },
    ];
    const nearest = distances.reduce((closest, candidate) => candidate.depth < closest.depth ? candidate : closest);
    position[nearest.axis] = nearest.value;
  }

  private updateCamera(delta: number): void {
    const portrait = innerHeight > innerWidth;
    const desired = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    switch (this.cameraMode) {
      case 'title':
        desired.copy(this.crow.group.position).add(new THREE.Vector3(0, portrait ? 15 : 12.5, portrait ? 19 : 17));
        lookAt.copy(this.crow.group.position).add(new THREE.Vector3(0, 0, 0));
        break;
      case 'cinematic':
        desired.copy(this.crow.group.position).add(new THREE.Vector3(portrait ? 7 : 11, 0.8, 0.5));
        lookAt.copy(this.crow.group.position).add(new THREE.Vector3(0, 0, 0));
        break;
      case 'arrival':
        desired.copy(PITCHER_POSITION).add(new THREE.Vector3(7, 5.5, 10));
        lookAt.copy(PITCHER_POSITION).setY(1.5);
        break;
      case 'pitcher-front':
        desired.copy(PITCHER_POSITION).add(new THREE.Vector3(5.5, 3.9, 6.7));
        lookAt.copy(PITCHER_POSITION).setY(1.7);
        break;
      case 'pitcher-inside':
        desired.copy(PITCHER_POSITION).add(new THREE.Vector3(portrait ? 0.55 : 0.8, portrait ? 8.55 : 8.05, portrait ? 2.05 : 2.2));
        lookAt.copy(PITCHER_POSITION).setY(1.32);
        break;
      case 'thinking':
        desired.copy(PITCHER_POSITION).add(
          new THREE.Vector3(portrait ? 0.35 : 0.7, portrait ? 4.45 : 3.9, portrait ? 6.2 : 5.4),
        );
        lookAt.copy(this.crow.group.position).add(new THREE.Vector3(0, 0.78, 0));
        break;
      case 'pebbles':
        desired.copy(PITCHER_POSITION).add(new THREE.Vector3(0, 11.8, 12.2));
        lookAt.copy(PITCHER_POSITION).setY(0.4);
        break;
      case 'drinking':
        desired.copy(PITCHER_POSITION).add(new THREE.Vector3(portrait ? 3.1 : 3.8, portrait ? 4.9 : 4.55, portrait ? 5.5 : 5.05));
        lookAt.copy(PITCHER_POSITION).setY(2.2);
        break;
      case 'ending':
        desired.copy(this.crow.group.position).add(new THREE.Vector3(0, 5.5, 10.5));
        lookAt.copy(this.crow.group.position).add(new THREE.Vector3(0, 1.2, -6));
        break;
      case 'flight':
        desired.copy(this.crow.group.position).add(
          new THREE.Vector3(0, portrait ? 5.2 : 8.2, portrait ? 8 : 10.2),
        );
        lookAt.copy(this.crow.group.position).add(
          new THREE.Vector3(0, 0.25, portrait ? -2.5 : -3.2),
        );
        break;
      default:
        desired.copy(this.crow.group.position).add(new THREE.Vector3(0, portrait ? 4.2 : 3.2, portrait ? 6.4 : 5.6));
        lookAt.copy(this.crow.group.position).add(new THREE.Vector3(0, 0.2, portrait ? -1.8 : -2.4));
    }
    const response = this.cameraMode === 'pitcher-inside' ? 1.7 : 2.6;
    this.camera.position.lerp(desired, 1 - Math.exp(-delta * response));
    this.camera.lookAt(lookAt);
  }

  private createGuidanceTrail(): void {
    for (let index = 0; index < 8; index += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.055 + index * 0.004, 7, 5),
        new THREE.MeshBasicMaterial({ color: 0xc8b987, transparent: true, opacity: 0.34 + index * 0.035 }),
      );
      this.guidanceTrail.add(particle);
    }
    this.guidanceTrail.visible = false;
  }

  private softenWorldPalette(): void {
    const materials = new Set<THREE.Material>();
    this.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
      meshMaterials.forEach((material) => materials.add(material));
    });
    materials.forEach((material) => {
      if (!('color' in material) || !(material.color instanceof THREE.Color)) return;
      const hsl = { h: 0, s: 0, l: 0 };
      material.color.getHSL(hsl);
      const saturationScale = typeof material.userData.paletteSaturationScale === 'number'
        ? material.userData.paletteSaturationScale
        : 0.48;
      material.color.setHSL(hsl.h, hsl.s * saturationScale, THREE.MathUtils.lerp(hsl.l, 0.53, 0.08));
    });
  }

  private hasFlightInput(): boolean {
    const state = this.input.state;
    return state.left || state.right || state.up || state.down || state.action || state.wheelBoost > 0 || Math.abs(state.moveX) > 0.08 || Math.abs(state.moveY) > 0.08;
  }

  private hasDirectionalInput(): boolean {
    const state = this.input.state;
    return state.left || state.right || state.up || state.down || Math.abs(state.moveX) > 0.08 || Math.abs(state.moveY) > 0.08;
  }

  private setPhase(phase: StoryPhase): void {
    this.phase = phase;
    this.phaseElapsed = 0;
  }

  private goToMainMenu(): void {
    try {
      window.parent.location.assign('/');
    } catch {
      window.location.assign('/');
    }
  }
}
