import type { StoryViewport } from '@moonlit/story-runtime';
import * as THREE from 'three';
import { AudioDirector } from './audio/AudioDirector';
import { Input } from './input';
import { EndingBirdFlock } from './objects/EndingBirdFlock';
import { ForestRiverWorld } from './objects/ForestRiverWorld';
import { IdeaSparkle } from './objects/IdeaSparkle';
import { RiverSplash } from './objects/RiverSplash';
import { RiverEscapeCourse, type RiverObstacle } from './objects/RiverEscapeCourse';
import { RiverStoryBubbles } from './objects/RiverStoryBubbles';
import { SafeRiverReach } from './objects/SafeRiverReach';
import { SceneThreeFoliage } from './objects/SceneThreeFoliage';
import { StoryButterfly } from './objects/StoryButterfly';
import { StoryTiger, TIGER_ANIMATIONS } from './objects/StoryTiger';
import { StoryTortoise, TORTOISE_ANIMATIONS } from './objects/StoryTortoise';
import { TortoiseSwimWake } from './objects/TortoiseSwimWake';
import { applyResponsiveViewport } from './responsive';
import { RiverCompassUI } from './ui/RiverCompassUI';
import { ShellHideUI } from './ui/ShellHideUI';
import { StoryPopupUI } from './ui/StoryPopupUI';

export type LoadingReporter = (progress: number, stage: string) => void;
export type StorySceneId =
  | 'scene-1'
  | 'scene-2'
  | 'scene-3'
  | 'scene-4'
  | 'scene-5'
  | 'scene-5b'
  | 'scene-6'
  | 'scene-7'
  | 'scene-8'
  | 'scene-9'
  | 'scene-10'
  | 'scene-11'
  | 'scene-13'
  | 'scene-14';

export type GameOptions = {
  initialScene?: StorySceneId;
  initialCheckpoint?: string;
  storyMode?: boolean;
  onComplete?: () => void;
};

type DiagnosticWindow = Window & typeof globalThis & {
  __THREE_GAME_DIAGNOSTICS__?: {
    renderer: THREE.WebGLInfo;
    scene: () => Record<string, unknown>;
  };
  __THREE_GAME_TEST_HOOKS__?: {
    setState: (name: string) => void;
    setPausedForScreenshot: (paused: boolean) => void;
    setReducedMotion: (enabled: boolean) => void;
    hideDebugUi: (_hidden: boolean) => void;
    seed: (_seed: number) => void;
    advanceStory: () => void;
    advanceTime: (seconds: number) => void;
  };
};

type SceneTwoMotionBeat = 'approach' | 'butterfly-pause' | 'second-walk';
type SceneTwoPopupStage = 'waiting' | 'narrator' | 'between-popups' | 'dialogue' | 'complete';
type SceneThreeStage =
  | 'peace'
  | 'approach'
  | 'tail'
  | 'paw'
  | 'stripes'
  | 'face'
  | 'hungry'
  | 'sniff-close'
  | 'sniff-dialogue'
  | 'pov'
  | 'reaction'
  | 'lunch'
  | 'complete';
type SceneFourStage =
  | 'emerging'
  | 'tiger-greeting'
  | 'tortoise-reply'
  | 'circling'
  | 'tiger-snack'
  | 'worried'
  | 'shell-look'
  | 'complete';
type SceneFiveStage =
  | 'objective'
  | 'tucking'
  | 'surprised'
  | 'shell-tap'
  | 'sniffing'
  | 'changing-side'
  | 'second-tap'
  | 'retreating'
  | 'disappointed'
  | 'complete';
type SceneFiveBStage =
  | 'approaching'
  | 'pushing'
  | 'biting'
  | 'narrator'
  | 'annoyed'
  | 'tiger-complaint'
  | 'peeking'
  | 'tortoise-reply'
  | 'scratching'
  | 'tiger-question'
  | 'thinking'
  | 'complete';
type SceneSixStage =
  | 'narrator'
  | 'tortoise-way'
  | 'tiger-interest'
  | 'tortoise-sun'
  | 'pause'
  | 'tortoise-river'
  | 'tiger-thinks'
  | 'complete';
type SceneSevenStage =
  | 'tiger-proud'
  | 'tortoise-flatter'
  | 'holding-laugh'
  | 'narrator'
  | 'pickup-camera'
  | 'pickup'
  | 'pickup-reveal'
  | 'complete';
type SceneEightStage =
  | 'walking'
  | 'tiger-soft'
  | 'tiger-proud'
  | 'tortoise-close'
  | 'arriving'
  | 'complete';
type SceneNineStage =
  | 'tiger-arrival'
  | 'tortoise-deep'
  | 'tiger-question'
  | 'tortoise-explain'
  | 'tiger-agrees'
  | 'complete';
type SceneTenStage =
  | 'settling'
  | 'backswing'
  | 'forward-swing'
  | 'flight'
  | 'splash'
  | 'waiting'
  | 'complete';
type SceneElevenStage =
  | 'silence'
  | 'tiger-wonders'
  | 'bubble-one'
  | 'bubble-two'
  | 'reveal'
  | 'tortoise-thanks'
  | 'tiger-freezes'
  | 'tiger-question'
  | 'tortoise-explains'
  | 'objective'
  | 'swimming'
  | 'safe-objective'
  | 'safe-swimming'
  | 'safe-arrival'
  | 'safe-narrator'
  | 'complete';
type SceneThirteenStage =
  | 'climbing'
  | 'water-shake'
  | 'tiger-accuses'
  | 'tortoise-strength'
  | 'brain-pause'
  | 'tortoise-brain'
  | 'tiger-confused'
  | 'tiger-reflects'
  | 'tortoise-chuckles'
  | 'complete';
type SceneFourteenStage = 'establishing' | 'narrator' | 'complete';

const SCENE_ONE_OPENING_DURATION = 10.5;
const SCENE_ONE_NARRATOR_AT = 10.15;
const SCENE_ONE_TORTOISE_SPEED = 0.31;

const SCENE_TWO_START_Z = 8.8;
const SCENE_TWO_TORTOISE_SPEED = 0.26;
const SCENE_TWO_PAUSE_AT = 3.8;
const SCENE_TWO_RESUME_AT = 7;
const SCENE_TWO_NARRATOR_AT = 11.2;
const SCENE_TWO_DIALOGUE_DELAY = 0.42;
const SCENE_TWO_NARRATION = 'The tortoise was not very big...\n\nand he was certainly not very fast.\n\nBut he was always thinking.';
const SCENE_TWO_DIALOGUE = 'What a lovely day for a walk!';
const SCENE_THREE_TORTOISE_START_Z = 8.8;
const SCENE_THREE_TORTOISE_SPEED = 0.08;
const SCENE_THREE_GROWL_AT = 2.45;
const SCENE_THREE_APPROACH_AT = 3.15;
const SCENE_THREE_TAIL_AT = 7;
const SCENE_THREE_PAW_AT = 8.55;
const SCENE_THREE_STRIPES_AT = 10.1;
const SCENE_THREE_FACE_AT = 11.65;
const SCENE_THREE_HUNGRY_AT = 13.2;
const SCENE_THREE_TIGER_ANIMATION_SPEED = 0.8;
const SCENE_THREE_HUNGRY = 'Ohhh... I am so hungry!';
const SCENE_THREE_SNIFF = 'Sniff... sniff...\n\nWhat\'s that?';
const SCENE_THREE_LUNCH = 'Aha!\n\nLunch!';
const SCENE_FOUR_APPROACH_DURATION = 5.2;
const SCENE_FOUR_TORTOISE_WALK_DURATION = 0.9;
const SCENE_FOUR_CIRCLE_DURATION = 5.4;
const SCENE_FOUR_TIGER_GROUND_Y = 0;
const SCENE_FOUR_NARRATION = 'Suddenly, a hungry tiger stepped out of the bushes.';
const SCENE_FOUR_TIGER_GREETING = 'Well, well, well...\n\nWhat have we here?';
const SCENE_FOUR_TORTOISE_REPLY = 'Oh...\n\nHello, Tiger.';
const SCENE_FOUR_TIGER_SNACK = 'You look like just the snack I was looking for!';
const SCENE_FIVE_REQUIRED_TAPS = 6;
const SCENE_FIVE_TUCK_DURATION = 2.35;
const SCENE_FIVE_SURPRISE_DURATION = 0.9;
const SCENE_FIVE_SHELL_TAP_DURATION = 1.45;
const SCENE_FIVE_SNIFF_DURATION = 3.15;
const SCENE_FIVE_CHANGE_SIDE_DURATION = 1.8;
const SCENE_FIVE_SECOND_TAP_DURATION = 1.15;
const SCENE_FIVE_RETREAT_DURATION = 2;
const SCENE_FIVE_RETREAT_DISTANCE = 1.35;
const SCENE_FIVE_DISAPPOINTED_DURATION = 3.9;
const SCENE_FIVE_TORTOISE_Z = 7.28;
const SCENE_FIVE_OBJECTIVE = 'Quick! Hide inside your shell!';
const SCENE_FIVE_B_APPROACH_DURATION = 2.3;
const SCENE_FIVE_B_PUSH_DURATION = 1.8;
const SCENE_FIVE_B_BITE_DURATION = 3.15;
const SCENE_FIVE_B_ANNOYED_DURATION = 0.9;
const SCENE_FIVE_B_PEEK_DURATION = 2.4;
const SCENE_FIVE_B_SCRATCH_DURATION = 1.7;
const SCENE_FIVE_B_REST_DISTANCE = 3.55;
const SCENE_FIVE_B_THINK_DURATION = 3.2;
const SCENE_FIVE_B_NARRATION = 'The tiger tried to bite the tortoise...\n\nbut the tortoise\'s shell was much too hard.';
const SCENE_FIVE_B_TIGER_COMPLAINT = 'What kind of tortoise are you?!\n\nYou\'re as hard as a rock!';
const SCENE_FIVE_B_TORTOISE_REPLY = 'Yes...\n\nMy shell can be rather troublesome.';
const SCENE_FIVE_B_TIGER_QUESTION = 'How am I supposed to eat you if I can\'t even bite you?';
const SCENE_SIX_PAUSE_DURATION = 0.85;
const SCENE_SIX_THINK_DURATION = 3.5;
const SCENE_SIX_NARRATION = 'Then the clever tortoise had an idea.';
const SCENE_SIX_TORTOISE_WAY = 'Hmm...\n\nThere may be one way.';
const SCENE_SIX_TIGER_INTEREST = 'One way?\n\nTell me!';
const SCENE_SIX_TORTOISE_SUN = 'My shell is hard because I\'ve been out in the sun.';
const SCENE_SIX_TORTOISE_RIVER = 'But if you soak me in the river...\n\nperhaps I\'ll become nice and soft.';
const SCENE_SEVEN_LAUGH_DURATION = 1.4;
const SCENE_SEVEN_CAMERA_SETUP_DURATION = 1.35;
const SCENE_SEVEN_PICKUP_DURATION = 3.6;
const SCENE_SEVEN_REVEAL_DURATION = 1.35;
const SCENE_SEVEN_TIGER_PROUD = 'Ha!\n\nWhat a wonderful idea!';
const SCENE_SEVEN_TORTOISE_FLATTER = 'Oh yes.\n\nVery clever of you.';
const SCENE_SEVEN_NARRATION = 'The tiger was so hungry that he did not stop to think.';
const SCENE_EIGHT_DURATION = 10.4;
const SCENE_EIGHT_TIGER_SOFT_AT = 0.9;
const SCENE_EIGHT_TIGER_PROUD_AT = 3.45;
const SCENE_EIGHT_TORTOISE_CLOSE_AT = 6.05;
const SCENE_EIGHT_ARRIVING_AT = 8.65;
const SCENE_EIGHT_TORTOISE_PEEK_PROGRESS = 0.78;
const SCENE_EIGHT_TORTOISE_PEEK_SPEED = 1.02;
const SCENE_EIGHT_TIGER_SOFT = 'Soon you\'ll be nice and soft!';
const SCENE_EIGHT_TIGER_PROUD = 'What a clever tiger I am!';
const SCENE_EIGHT_TORTOISE_CLOSE = 'Just a little closer...';
const SCENE_NINE_TIGER_ARRIVAL = 'Here we are!\n\nInto the water you go.';
const SCENE_NINE_TORTOISE_DEEP = 'Make sure you throw me right into the deep water.';
const SCENE_NINE_TIGER_QUESTION = 'The deep water?';
const SCENE_NINE_TORTOISE_EXPLAIN = 'Oh yes.\n\nThat\'s the only way to make my shell really soft.';
const SCENE_NINE_TIGER_AGREES = 'Then deep water it is!';
const SCENE_TEN_SETTLE_DURATION = 0.85;
const SCENE_TEN_BACKSWING_DURATION = 1.25;
const SCENE_TEN_FORWARD_SWING_DURATION = 1.05;
const SCENE_TEN_FLIGHT_DURATION = 2.55;
const SCENE_TEN_SPLASH_DURATION = 1.35;
const SCENE_TEN_WAIT_DURATION = 3.2;
const SCENE_ELEVEN_SILENCE_DURATION = 1.15;
const SCENE_ELEVEN_BUBBLE_DURATION = 1.35;
const SCENE_ELEVEN_REVEAL_DURATION = 0.72;
const SCENE_ELEVEN_FREEZE_DURATION = 0.58;
const SCENE_ELEVEN_OBJECTIVE_DURATION = 1.8;
const SCENE_ELEVEN_SPEECH_DURATION = 2.55;
const SCENE_ELEVEN_MIN_SWIM_SPEED = 0.85;
const SCENE_ELEVEN_FORWARD_BOOST = 2.45;
const SCENE_ELEVEN_STEER_SPEED = 3.15;
const SCENE_ELEVEN_TIGER_CHASE_SPEED = 4.15;
const SCENE_ELEVEN_TIGER_BANK_LEAD = 2.8;
const SCENE_ELEVEN_SWIM_Y = -0.29;
const SCENE_ELEVEN_SAFE_OBJECTIVE_DURATION = 1.8;
const SCENE_ELEVEN_SAFE_ARRIVAL_DURATION = 0.8;
const SCENE_ELEVEN_TIGER_LOOK_BACK_DURATION = 2.85;
const SCENE_ELEVEN_TIGER_WONDERS = 'Hmm...\n\nIs he soft yet?';
const SCENE_ELEVEN_TORTOISE_THANKS = 'Thank you, Tiger!';
const SCENE_ELEVEN_TIGER_QUESTION = 'Thank me?';
const SCENE_ELEVEN_TORTOISE_ESCAPE = 'You just helped me escape!';
const SCENE_ELEVEN_OBJECTIVE = 'Swim away from the tiger!';
const SCENE_ELEVEN_SPEECH = [
  'This is my home!',
  'You can\'t catch me here!',
  'Keep swimming!',
  'Almost there!',
] as const;
const SCENE_ELEVEN_SPEECH_PROGRESS = [0.12, 0.36, 0.61, 0.84] as const;
const SCENE_ELEVEN_SAFE_OBJECTIVE = 'Reach the safe riverbank!';
const SCENE_ELEVEN_TIGER_SAFE_SPEECH = [
  'Come back here, you tricky tortoise!',
  'How can he swim so fast?',
  'Oh no... my lunch is getting away!',
] as const;
const SCENE_ELEVEN_TIGER_SAFE_PROGRESS = [0.08, 0.38, 0.68] as const;
const SCENE_ELEVEN_SAFE_NARRATION = 'Safe at last, the clever tortoise reached the peaceful riverbank, while the hungry tiger was left far behind.';
const SCENE_THIRTEEN_CLIMB_DURATION = 2.45;
const SCENE_THIRTEEN_SHAKE_DURATION = 1.55;
const SCENE_THIRTEEN_BRAIN_PAUSE_DURATION = 0.72;
const SCENE_THIRTEEN_CONFUSED_DURATION = 1.15;
const SCENE_THIRTEEN_CHUCKLE_DURATION = 1.85;
const SCENE_THIRTEEN_TIGER_ACCUSES = 'You tricked me!';
const SCENE_THIRTEEN_TORTOISE_STRENGTH = 'I couldn\'t beat you with strength...';
const SCENE_THIRTEEN_TORTOISE_BRAIN = 'So I used my brain instead!';
const SCENE_THIRTEEN_TIGER_REFLECTS = 'Hmm...\n\nPerhaps I should have thought about that.';
const SCENE_FOURTEEN_NARRATOR_DELAY = 1.35;
const SCENE_FOURTEEN_PULL_DURATION = 11.5;
const SCENE_FOURTEEN_NARRATION = 'And so the little tortoise escaped the mighty tiger...\n\nnot because he was stronger,\n\nbut because he stopped, thought carefully and used his clever mind.';
const STORY_SCENE_ORDER: readonly StorySceneId[] = [
  'scene-1',
  'scene-2',
  'scene-3',
  'scene-4',
  'scene-5',
  'scene-5b',
  'scene-6',
  'scene-7',
  'scene-8',
  'scene-9',
  'scene-10',
  'scene-11',
  'scene-13',
  'scene-14',
];
const STORY_TRANSITION_HOLD = 0.55;
const STORY_CAMERA_BLEND_DURATION = 1.35;

function lerpAngle(current: number, target: number, amount: number): number {
  const difference = THREE.MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) - Math.PI;
  return current + difference * amount;
}

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(43, 1, 0.1, 150);
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  private readonly audio = new AudioDirector();
  private readonly input: Input;
  private readonly world = new ForestRiverWorld();
  private readonly tortoise = new StoryTortoise();
  private readonly tiger = new StoryTiger();
  private readonly butterfly = new StoryButterfly();
  private readonly sceneThreeFoliage = new SceneThreeFoliage();
  private readonly ideaSparkle = new IdeaSparkle();
  private readonly riverSplash = new RiverSplash();
  private readonly riverStoryBubbles = new RiverStoryBubbles();
  private readonly riverEscapeCourse = new RiverEscapeCourse(this.world);
  private readonly safeRiverReach = new SafeRiverReach(this.world);
  private readonly tortoiseSwimWake = new TortoiseSwimWake();
  private readonly endingBirdFlock = new EndingBirdFlock();
  private readonly ui: StoryPopupUI;
  private readonly shellUi: ShellHideUI;
  private readonly riverCompass: RiverCompassUI;
  private readonly sun = new THREE.DirectionalLight(0xffe5ad, 2.72);
  private readonly cameraPositionCurve: THREE.CatmullRomCurve3;
  private readonly cameraTargetCurve: THREE.CatmullRomCurve3;
  private readonly cameraTarget = new THREE.Vector3();
  private readonly desiredCameraPosition = new THREE.Vector3();
  private readonly desiredCameraTarget = new THREE.Vector3();
  private readonly cameraAway = new THREE.Vector3();
  private readonly sceneFourPathDirection = new THREE.Vector3();
  private readonly sceneFourCameraSide = new THREE.Vector3();
  private readonly sceneFourTigerStart = new THREE.Vector3();
  private readonly sceneFourTigerNear = new THREE.Vector3();
  private readonly sceneFourMidpoint = new THREE.Vector3();
  private readonly sceneFiveTigerStart = new THREE.Vector3();
  private readonly sceneFiveSecondTapStart = new THREE.Vector3();
  private readonly sceneFiveTigerRetreatStart = new THREE.Vector3();
  private readonly sceneFiveTigerDirection = new THREE.Vector3();
  private readonly sceneFiveMidpoint = new THREE.Vector3();
  private readonly sceneFiveShellContact = new THREE.Vector3();
  private readonly sceneFiveBApproachStart = new THREE.Vector3();
  private readonly sceneFiveBAttackPosition = new THREE.Vector3();
  private readonly sceneFiveBBiteStart = new THREE.Vector3();
  private readonly sceneFiveBTigerToShell = new THREE.Vector3();
  private readonly sceneSixRiverDirection = new THREE.Vector3();
  private readonly sceneSevenTigerPickupStart = new THREE.Vector3();
  private readonly sceneSevenTigerPickupEnd = new THREE.Vector3();
  private readonly sceneSevenTortoisePickupStart = new THREE.Vector3();
  private readonly sceneSevenTortoisePickupEnd = new THREE.Vector3();
  private readonly sceneSevenPickupDirection = new THREE.Vector3();
  private readonly sceneEightTigerStart = new THREE.Vector3();
  private readonly sceneEightTigerEnd = new THREE.Vector3();
  private readonly sceneEightDirection = new THREE.Vector3();
  private readonly sceneEightCameraSide = new THREE.Vector3();
  private readonly sceneEightCarryAnchor = new THREE.Vector3();
  private readonly sceneTenThrowDirection = new THREE.Vector3();
  private readonly sceneTenCameraSide = new THREE.Vector3();
  private readonly sceneTenThrowStart = new THREE.Vector3();
  private readonly sceneTenBackswing = new THREE.Vector3();
  private readonly sceneTenRelease = new THREE.Vector3();
  private readonly sceneTenSplashPoint = new THREE.Vector3();
  private readonly sceneTenArcPoint = new THREE.Vector3();
  private readonly sceneElevenRevealPoint = new THREE.Vector3();
  private readonly sceneElevenBubblePoint = new THREE.Vector3();
  private readonly sceneElevenTigerTarget = new THREE.Vector3();
  private readonly sceneElevenTigerDirection = new THREE.Vector3();
  private readonly sceneElevenTigerCameraSide = new THREE.Vector3();
  private readonly sceneElevenSafeZone = new THREE.Vector3();
  private readonly sceneThirteenSwimStart = new THREE.Vector3();
  private readonly sceneThirteenRock = new THREE.Vector3();
  private readonly sceneThirteenTigerPosition = new THREE.Vector3();
  private readonly sceneThirteenAcrossRiver = new THREE.Vector3();
  private readonly sceneThirteenCameraSide = new THREE.Vector3();
  private readonly sceneThirteenMidpoint = new THREE.Vector3();
  private readonly sceneTwoButterflyOrigin = new THREE.Vector3();
  private activeScene: StorySceneId;
  private readonly storyMode: boolean;
  private readonly initialCheckpoint: string | undefined;
  private readonly onComplete: (() => void) | undefined;
  private pendingStoryScene: StorySceneId | undefined;
  private pendingStoryDelay = 0;
  private storyTransitionFrom: StorySceneId | undefined;
  private storyCameraBlendElapsed = STORY_CAMERA_BLEND_DURATION;
  private readonly storyCameraBlendFromPosition = new THREE.Vector3();
  private readonly storyCameraBlendFromTarget = new THREE.Vector3();
  private readonly storyCameraDestinationPosition = new THREE.Vector3();
  private readonly storyCameraDestinationTarget = new THREE.Vector3();
  private readonly storySceneHistory: StorySceneId[] = [];
  private storyTransitionCount = 0;
  private storyComplete = false;
  private sceneTwoStartZ = SCENE_TWO_START_Z;
  private sceneThreeStartZ = SCENE_THREE_TORTOISE_START_Z;
  private sceneFourTortoiseStartZ = 7.28;
  private sceneFiveTortoiseZ = SCENE_FIVE_TORTOISE_Z;
  private initialCheckpointApplied = false;
  private animationFrame: number | undefined;
  private lastFrameTime = 0;
  private elapsed = 0;
  private sceneElapsed = 0;
  private running = false;
  private disposed = false;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private sceneOneNarratorShown = false;
  private sceneTwoMotionBeat: SceneTwoMotionBeat = 'approach';
  private sceneTwoPopupStage: SceneTwoPopupStage = 'waiting';
  private sceneTwoDialogueDelay = 0;
  private sceneThreeStage: SceneThreeStage = 'peace';
  private sceneThreeStageElapsed = 0;
  private sceneThreeGrowlPlayed = false;
  private readonly tigerHome = new THREE.Vector3();
  private sceneFourStage: SceneFourStage = 'emerging';
  private sceneFourStageElapsed = 0;
  private sceneFourNarratorShown = false;
  private sceneFourNarratorDismissed = false;
  private sceneFourApproachComplete = false;
  private sceneFiveStage: SceneFiveStage = 'objective';
  private sceneFiveStageElapsed = 0;
  private sceneFiveTapCount = 0;
  private sceneFivePawContactDistance: number | undefined;
  private sceneFiveBStage: SceneFiveBStage = 'approaching';
  private sceneFiveBStageElapsed = 0;
  private sceneFiveBBiteDistance: number | undefined;
  private sceneSixStage: SceneSixStage = 'narrator';
  private sceneSixStageElapsed = 0;
  private sceneSixTigerFacingYaw = 0;
  private sceneSixTigerRiverYaw = 0;
  private sceneSevenStage: SceneSevenStage = 'tiger-proud';
  private sceneSevenStageElapsed = 0;
  private sceneSevenTortoiseBaseYaw = 0;
  private sceneEightStage: SceneEightStage = 'walking';
  private sceneEightStageElapsed = 0;
  private sceneNineStage: SceneNineStage = 'tiger-arrival';
  private sceneNineStageElapsed = 0;
  private sceneTenStage: SceneTenStage = 'settling';
  private sceneTenStageElapsed = 0;
  private sceneTenFlightBaseYaw = 0;
  private sceneTenFlightBaseRoll = 0;
  private sceneElevenStage: SceneElevenStage = 'silence';
  private sceneElevenStageElapsed = 0;
  private sceneElevenSwimVelocityX = 0;
  private sceneElevenSlowTimer = 0;
  private sceneElevenSlowFactor = 1;
  private sceneElevenSpeechIndex = 0;
  private sceneElevenSpeechTimer = 0;
  private sceneElevenCollisionCount = 0;
  private sceneElevenLastObstacle: RiverObstacle['kind'] | undefined;
  private sceneElevenSafeSpeechIndex = 0;
  private sceneElevenTigerLookBackTimer = 0;
  private readonly sceneElevenContactCooldowns = new Map<string, number>();
  private sceneThirteenStage: SceneThirteenStage = 'climbing';
  private sceneThirteenStageElapsed = 0;
  private sceneThirteenTortoiseBaseY = 0;
  private sceneThirteenTortoiseBaseRoll = 0;
  private sceneFourteenStage: SceneFourteenStage = 'establishing';
  private sceneFourteenStageElapsed = 0;
  private sceneFourteenElapsed = 0;

  constructor(private readonly root: HTMLElement, options: GameOptions = {}) {
    this.activeScene = options.initialScene ?? 'scene-1';
    this.storyMode = options.storyMode ?? false;
    this.initialCheckpoint = options.initialCheckpoint;
    this.onComplete = options.onComplete;
    this.storySceneHistory.push(this.activeScene);

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0x9fd8d1, 1);
    this.renderer.domElement.className = 'game-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.root.prepend(this.renderer.domElement);

    this.scene.background = new THREE.Color(0xa8ddd5);
    this.scene.fog = new THREE.Fog(0xa4cdb6, 27, 86);

    const hemisphere = new THREE.HemisphereLight(0xbfe5dc, 0x315c3c, 1.78);
    hemisphere.name = 'SkyAndGrassFill';
    this.sun.name = 'WarmMorningSun';
    this.sun.position.set(-16, 28, 15);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -28;
    this.sun.shadow.camera.right = 28;
    this.sun.shadow.camera.top = 28;
    this.sun.shadow.camera.bottom = -28;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.bias = -0.00012;
    this.sun.shadow.normalBias = 0.025;

    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(4.2, 48),
      new THREE.MeshBasicMaterial({ color: 0xfff2b2, fog: false }),
    );
    sunDisc.name = 'StorybookSun';
    sunDisc.position.set(-21, 22, -58);
    sunDisc.lookAt(0, 0, 0);

    this.tortoise.group.position.set(this.world.leftBankPathAt(10), -0.18, 10);
    this.tortoise.group.rotation.y = Math.PI;
    this.scene.add(
      this.world.group,
      this.tortoise.group,
      this.tiger.group,
      this.butterfly.group,
      this.sceneThreeFoliage.group,
      this.ideaSparkle.group,
      this.riverSplash.group,
      this.riverStoryBubbles.group,
      this.riverEscapeCourse.group,
      this.safeRiverReach.group,
      this.tortoiseSwimWake.group,
      this.endingBirdFlock.group,
      this.camera,
      hemisphere,
      this.sun,
      sunDisc,
    );

    this.cameraPositionCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(20, 32, 40),
      new THREE.Vector3(13, 24, 30),
      new THREE.Vector3(6, 15, 22),
      new THREE.Vector3(1, 9.2, 15),
      new THREE.Vector3(this.tortoise.group.position.x + 5.6, 4.55, 4.6),
    ], false, 'catmullrom', 0.42);
    this.cameraTargetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 5),
      new THREE.Vector3(this.world.riverCenterAt(13), 0, 13),
      new THREE.Vector3(this.world.riverCenterAt(7), 0, 7),
      new THREE.Vector3(this.tortoise.group.position.x, 0.5, 8),
      new THREE.Vector3(this.tortoise.group.position.x, 0.55, 8.1),
    ], false, 'catmullrom', 0.42);

    this.input = new Input(this.root, () => void this.audio.unlock());
    this.ui = new StoryPopupUI(this.root, () => void this.audio.unlock());
    this.shellUi = new ShellHideUI(this.root, () => void this.audio.unlock());
    this.riverCompass = new RiverCompassUI(this.root);
    this.resetCurrentScene();
    this.installDiagnostics();
    this.resize();
  }

  async prepare(report: LoadingReporter): Promise<void> {
    report(0.1, 'Following the river into the forest');
    await document.fonts.ready;
    report(0.28, 'Growing trees and river flowers');
    const modelBase = `${import.meta.env.BASE_URL}models/`;
    await Promise.all([
      this.tortoise.load(`${modelBase}Tortoise.glb`),
      this.tiger.load(`${modelBase}TigerLowPoly.glb`),
    ]);
    this.resetCurrentScene();
    report(0.68, 'Waking butterflies and little fish');
    // `compileAsync` can remain pending (or fail preparation entirely) on
    // browsers whose parallel shader compiler does not report every custom
    // material as ready. A real first render uses Three's compatible blocking
    // path and keeps shader warm-up from becoming a loader failure.
    this.renderer.render(this.scene, this.camera);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    report(1, this.activeScene === 'scene-14'
      ? 'The story ending is ready'
      : this.activeScene === 'scene-13'
      ? 'The tortoise has reached safety'
      : this.activeScene === 'scene-11'
      ? 'The river escape is ready'
      : this.activeScene === 'scene-10'
      ? 'The river is ready for the tiger\'s throw'
      : this.activeScene === 'scene-9'
      ? 'The tiger has reached the riverbank'
      : this.activeScene === 'scene-8'
      ? 'The tiger is carrying the tortoise to the river'
      : this.activeScene === 'scene-7'
      ? 'The tiger is ready to carry out his plan'
      : this.activeScene === 'scene-6'
      ? 'The tortoise has an idea'
      : this.activeScene === 'scene-5b'
      ? 'The tiger is ready to try the shell again'
      : this.activeScene === 'scene-5'
      ? 'The shell challenge is ready'
      : this.activeScene === 'scene-4'
      ? 'The tiger is ready to step into the story'
      : this.activeScene === 'scene-3'
        ? 'Something is stirring in the bushes'
      : this.activeScene === 'scene-2'
        ? 'The tortoise is ready for his walk'
        : 'The river story is ready');
  }

  start(): void {
    if (this.disposed || this.running) return;
    if (!this.initialCheckpointApplied && this.initialCheckpoint) {
      this.initialCheckpointApplied = true;
      this.setTestState(`${this.activeScene}:${this.initialCheckpoint}`);
    }
    this.running = true;
    this.lastFrameTime = performance.now();
    this.audio.start();
    this.render();
  }

  pause(): void {
    this.running = false;
    if (this.animationFrame !== undefined) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = undefined;
    this.audio.pause();
  }

  resume(): void {
    if (this.disposed || this.running) return;
    this.audio.resume();
    this.running = true;
    this.lastFrameTime = performance.now();
    this.render();
  }

  restart(): void {
    if (this.storyMode) {
      this.activeScene = 'scene-1';
      this.pendingStoryScene = undefined;
      this.storyTransitionFrom = undefined;
      this.storyCameraBlendElapsed = STORY_CAMERA_BLEND_DURATION;
      this.storySceneHistory.length = 0;
      this.storySceneHistory.push(this.activeScene);
      this.storyTransitionCount = 0;
      this.storyComplete = false;
      this.sceneTwoStartZ = SCENE_TWO_START_Z;
      this.sceneThreeStartZ = SCENE_THREE_TORTOISE_START_Z;
      this.sceneFourTortoiseStartZ = 7.28;
      this.sceneFiveTortoiseZ = SCENE_FIVE_TORTOISE_Z;
    }
    this.resetCurrentScene();
    if (!this.running) this.resume();
  }

  setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
  }

  enableAudio(): void {
    void this.audio.unlock();
  }

  onViewportChange(_viewport: StoryViewport): void {
    this.resize();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pause();
    this.input.dispose();
    this.ui.dispose();
    this.shellUi.dispose();
    this.riverCompass.dispose();
    this.audio.dispose();
    this.tortoise.dispose();
    this.tiger.dispose();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
      object.geometry.dispose();
      const material = object.material;
      const materials = Array.isArray(material) ? material : [material];
      materials.forEach((item) => item.dispose());
    });
    delete (window as DiagnosticWindow).__THREE_GAME_DIAGNOSTICS__;
    delete (window as DiagnosticWindow).__THREE_GAME_TEST_HOOKS__;
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private resetCurrentScene(resetStoryElapsed = true): void {
    if (resetStoryElapsed) this.elapsed = 0;
    this.sceneElapsed = 0;
    this.ui.reset();
    this.shellUi.reset();
    this.riverCompass.setVisible(false);
    this.tortoise.setThinkingPose(0, false);
    this.tortoise.setPeekOnly(false);
    this.tortoise.setFullyHidden(false);
    this.tortoise.setGrounded(true);
    this.tortoise.group.visible = true;
    this.tiger.setThrowPose(0);
    this.input.setMovementEnabled(false);
    this.ideaSparkle.setVisible(false);
    this.riverSplash.reset();
    this.riverStoryBubbles.reset();
    this.tortoiseSwimWake.reset();
    this.endingBirdFlock.setVisible(false);
    this.riverEscapeCourse.setVisible(false);
    this.safeRiverReach.setVisible(false);
    this.world.setGameplayRiverDecorVisible(true);
    if (this.activeScene === 'scene-14') this.resetSceneFourteen();
    else if (this.activeScene === 'scene-13') this.resetSceneThirteen();
    else if (this.activeScene === 'scene-11') this.resetSceneEleven();
    else if (this.activeScene === 'scene-10') this.resetSceneTen();
    else if (this.activeScene === 'scene-9') this.resetSceneNine();
    else if (this.activeScene === 'scene-8') this.resetSceneEight();
    else if (this.activeScene === 'scene-7') this.resetSceneSeven();
    else if (this.activeScene === 'scene-6') this.resetSceneSix();
    else if (this.activeScene === 'scene-5b') this.resetSceneFiveB();
    else if (this.activeScene === 'scene-5') this.resetSceneFive();
    else if (this.activeScene === 'scene-4') this.resetSceneFour();
    else if (this.activeScene === 'scene-3') this.resetSceneThree();
    else if (this.activeScene === 'scene-2') this.resetSceneTwo();
    else this.resetSceneOne();
  }

  private resetSceneOne(): void {
    this.sceneOneNarratorShown = false;
    this.butterfly.setVisible(false);
    this.tiger.group.visible = false;
    this.sceneThreeFoliage.setVisible(false);
    this.world.setBushesVisible(true);
    this.tortoise.group.position.set(this.world.leftBankPathAt(10), -0.18, 10);
    this.tortoise.group.rotation.y = Math.PI;
    this.tortoise.playAnimation(TORTOISE_ANIMATIONS.walk, 0, 0.58);
    this.camera.position.copy(this.cameraPositionCurve.getPoint(0));
    this.camera.lookAt(this.cameraTargetCurve.getPoint(0));
  }

  private resetSceneTwo(): void {
    this.sceneElapsed = 0;
    this.sceneTwoMotionBeat = 'approach';
    this.sceneTwoPopupStage = 'waiting';
    this.sceneTwoDialogueDelay = 0;
    this.tiger.group.visible = false;
    this.sceneThreeFoliage.setVisible(false);
    this.world.setBushesVisible(true);
    this.positionSceneTwoTortoiseAt(0);
    const pauseZ = this.sceneTwoStartZ - SCENE_TWO_TORTOISE_SPEED * SCENE_TWO_PAUSE_AT;
    this.sceneTwoButterflyOrigin.set(
      this.world.leftBankPathAt(pauseZ) - 0.55,
      1.52,
      pauseZ - 1.9,
    );
    this.butterfly.setOrigin(this.sceneTwoButterflyOrigin);
    this.butterfly.reset();
    this.butterfly.setVisible(true);
    this.tortoise.playAnimation(TORTOISE_ANIMATIONS.walk, 0, 0.56);
    this.updateSceneTwoCamera(0, true);
  }

  private resetSceneThree(): void {
    this.sceneElapsed = 0;
    this.sceneThreeStage = 'peace';
    this.sceneThreeStageElapsed = 0;
    this.sceneThreeGrowlPlayed = false;
    this.butterfly.setVisible(false);
    this.positionSceneThreeTortoiseAt(0);
    this.tortoise.playAnimation(TORTOISE_ANIMATIONS.walk, 0, 0.52);

    const tigerZ = -3.5;
    this.tigerHome.set(this.world.leftBankPathAt(tigerZ) - 7.1, -0.36, tigerZ);
    this.tiger.group.position.copy(this.tigerHome);
    this.tiger.group.rotation.set(0, 0, 0);
    this.tiger.group.scale.setScalar(1);
    this.tiger.group.visible = true;
    this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0, SCENE_THREE_TIGER_ANIMATION_SPEED);

    this.sceneThreeFoliage.setOrigin(this.tigerHome);
    this.sceneThreeFoliage.setVisible(true);
    this.world.setBushesVisible(false);
    this.updateSceneThreeCamera(0, true);
  }

  private resetSceneFour(): void {
    this.sceneElapsed = 0;
    this.sceneFourStage = 'emerging';
    this.sceneFourStageElapsed = 0;
    this.sceneFourNarratorShown = false;
    this.sceneFourNarratorDismissed = false;
    this.sceneFourApproachComplete = false;
    this.butterfly.setVisible(false);

    const tortoiseZ = this.sceneFourTortoiseStartZ;
    this.tortoise.group.position.set(this.world.leftBankPathAt(tortoiseZ), -0.18, tortoiseZ);
    this.tortoise.playAnimation(TORTOISE_ANIMATIONS.walk, 0, 0.48);

    const tigerZ = -3.5;
    this.tigerHome.set(this.world.leftBankPathAt(tigerZ) - 7.1, -0.36, tigerZ);
    this.sceneFourTigerStart.copy(this.tigerHome);
    this.sceneFourTigerStart.y = SCENE_FOUR_TIGER_GROUND_Y;
    this.sceneFourPathDirection
      .copy(this.tortoise.group.position)
      .sub(this.sceneFourTigerStart)
      .setY(0)
      .normalize();
    this.sceneFourTigerNear
      .copy(this.tortoise.group.position)
      .addScaledVector(this.sceneFourPathDirection, -3.15);
    this.sceneFourTigerNear.y = SCENE_FOUR_TIGER_GROUND_Y;
    this.sceneFourCameraSide.set(
      this.sceneFourPathDirection.z,
      0,
      -this.sceneFourPathDirection.x,
    );

    this.tiger.group.position.copy(this.sceneFourTigerStart);
    this.tiger.group.rotation.set(0, this.getTigerYawForDirection(this.sceneFourPathDirection.x, this.sceneFourPathDirection.z), 0);
    this.tiger.group.scale.setScalar(1);
    this.tiger.group.visible = true;
    this.tiger.playAnimation(TIGER_ANIMATIONS.walk, 0, 0.78);

    this.sceneThreeFoliage.setOrigin(this.tigerHome);
    this.sceneThreeFoliage.setVisible(true);
    this.world.setBushesVisible(false);
    this.updateSceneFourCamera(0, true);
  }

  private resetSceneFive(): void {
    this.sceneElapsed = 0;
    this.sceneFiveStage = 'objective';
    this.sceneFiveStageElapsed = 0;
    this.sceneFiveTapCount = 0;
    this.sceneFivePawContactDistance = undefined;
    this.butterfly.setVisible(false);

    this.tortoise.group.position.set(
      this.world.leftBankPathAt(this.sceneFiveTortoiseZ),
      -0.18,
      this.sceneFiveTortoiseZ,
    );
    this.tortoise.playAnimation(TORTOISE_ANIMATIONS.scared, 0, 0.76);

    this.sceneFiveTigerStart.set(
      this.tortoise.group.position.x - 2.25,
      SCENE_FOUR_TIGER_GROUND_Y,
      this.tortoise.group.position.z + 2.35,
    );
    this.tiger.group.position.copy(this.sceneFiveTigerStart);
    this.tiger.group.scale.setScalar(1);
    this.tiger.group.visible = true;
    this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0, 0.8);

    const bushZ = -3.5;
    this.tigerHome.set(this.world.leftBankPathAt(bushZ) - 7.1, -0.36, bushZ);
    this.sceneThreeFoliage.setOrigin(this.tigerHome);
    this.sceneThreeFoliage.setVisible(true);
    this.world.setBushesVisible(false);

    this.sceneFourPathDirection
      .copy(this.tortoise.group.position)
      .sub(this.tigerHome)
      .setY(0)
      .normalize();
    this.sceneFourCameraSide.set(this.sceneFourPathDirection.z, 0, -this.sceneFourPathDirection.x);
    this.faceTigerTowardTortoise();
    this.orientTortoiseForSceneFive();
    this.shellUi.showObjective(SCENE_FIVE_OBJECTIVE);
    this.shellUi.showAction(SCENE_FIVE_REQUIRED_TAPS, this.handleSceneFiveHideTap);
    this.updateSceneFiveCamera(0, true);
  }

  private resetSceneFiveB(): void {
    this.sceneElapsed = 0;
    this.sceneFiveBStage = 'approaching';
    this.sceneFiveBStageElapsed = 0;
    this.sceneFiveBBiteDistance = undefined;
    this.butterfly.setVisible(false);

    this.tortoise.group.position.set(
      this.world.leftBankPathAt(this.sceneFiveTortoiseZ),
      -0.18,
      this.sceneFiveTortoiseZ,
    );
    this.tortoise.playAnimationOnce(TORTOISE_ANIMATIONS.tuck, 0, 1, true);
    this.tortoise.setCurrentAnimationProgress(SCENE_EIGHT_TORTOISE_PEEK_PROGRESS);
    this.tortoise.setFullyHidden(true);

    // Reconstruct Scene 5's exact final tiger transform: the second-tap base,
    // the small zero-reach body offset, then the completed backward retreat.
    this.positionSceneFiveTigerAtSide(1);
    this.sceneFiveTigerDirection
      .copy(this.tortoise.group.position)
      .sub(this.tiger.group.position)
      .setY(0)
      .normalize();
    this.tiger.group.position.addScaledVector(this.sceneFiveTigerDirection, 0.22);
    this.sceneFiveBTigerToShell
      .copy(this.tiger.group.position)
      .sub(this.tortoise.group.position)
      .setY(0)
      .normalize();
    this.tiger.group.position.addScaledVector(
      this.sceneFiveBTigerToShell,
      SCENE_FIVE_RETREAT_DISTANCE,
    );
    this.sceneFiveBApproachStart.copy(this.tiger.group.position);
    this.sceneFiveBAttackPosition
      .copy(this.tortoise.group.position)
      .addScaledVector(this.sceneFiveBTigerToShell, SCENE_FIVE_B_REST_DISTANCE);
    this.sceneFiveBAttackPosition.y = SCENE_FOUR_TIGER_GROUND_Y;

    this.tiger.group.position.copy(this.sceneFiveBApproachStart);
    this.tiger.group.scale.setScalar(1);
    this.tiger.group.visible = true;
    this.tiger.playAnimation(TIGER_ANIMATIONS.walk, 0.36, 0.56);

    const bushZ = -3.5;
    this.tigerHome.set(this.world.leftBankPathAt(bushZ) - 7.1, -0.36, bushZ);
    this.sceneThreeFoliage.setOrigin(this.tigerHome);
    this.sceneThreeFoliage.setVisible(true);
    this.world.setBushesVisible(false);
    this.sceneFourPathDirection
      .copy(this.tortoise.group.position)
      .sub(this.tigerHome)
      .setY(0)
      .normalize();
    this.sceneFourCameraSide.set(this.sceneFourPathDirection.z, 0, -this.sceneFourPathDirection.x);
    this.faceTigerTowardTortoise();
    // The tortoise tucked while facing the tiger's original Scene 5 position.
    // Keep that frozen shell orientation for a seamless Scene 5 -> 5b cut.
    this.orientTortoiseForSceneFive();
    this.updateSceneFiveBCamera(0, true);
  }

  private setupSceneSixContinuityPose(): void {
    this.butterfly.setVisible(false);
    this.tortoise.group.position.set(
      this.world.leftBankPathAt(this.sceneFiveTortoiseZ),
      -0.18,
      this.sceneFiveTortoiseZ,
    );
    this.tortoise.setFullyHidden(false);
    this.tortoise.setPeekOnly(true);
    this.tortoise.setGrounded(true);
    this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.5, 0.72);
    this.orientTortoiseForSceneFive();
    const riverSide = Math.sign(
      this.world.riverCenterAt(this.tortoise.group.position.z) - this.tortoise.group.position.x,
    );
    this.tortoise.setThinkingPose(riverSide * 0.13, true);

    this.positionSceneFiveTigerAtSide(1);
    this.sceneFiveBTigerToShell
      .copy(this.tiger.group.position)
      .sub(this.tortoise.group.position)
      .setY(0)
      .normalize();
    this.sceneFiveBAttackPosition
      .copy(this.tortoise.group.position)
      .addScaledVector(this.sceneFiveBTigerToShell, SCENE_FIVE_B_REST_DISTANCE);
    this.sceneFiveBAttackPosition.y = SCENE_FOUR_TIGER_GROUND_Y;
    this.tiger.group.position.copy(this.sceneFiveBAttackPosition);
    this.tiger.group.scale.setScalar(1);
    this.tiger.group.visible = true;
    this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.48, 0.72);
    this.faceTigerTowardTortoise();

    const bushZ = -3.5;
    this.tigerHome.set(this.world.leftBankPathAt(bushZ) - 7.1, -0.36, bushZ);
    this.sceneThreeFoliage.setOrigin(this.tigerHome);
    this.sceneThreeFoliage.setVisible(true);
    this.world.setBushesVisible(false);
    this.sceneFourPathDirection
      .copy(this.tortoise.group.position)
      .sub(this.tigerHome)
      .setY(0)
      .normalize();
    this.sceneFourCameraSide.set(this.sceneFourPathDirection.z, 0, -this.sceneFourPathDirection.x);

    this.sceneSixRiverDirection.set(
      this.world.riverCenterAt(this.tortoise.group.position.z) - this.tortoise.group.position.x,
      0,
      0,
    ).normalize();
    this.sceneSixTigerFacingYaw = this.tiger.group.rotation.y;
    const riverLookZ = this.tortoise.group.position.z - 1.8;
    this.sceneSixTigerRiverYaw = this.getTigerYawForDirection(
      this.world.riverCenterAt(riverLookZ) - this.tiger.group.position.x,
      riverLookZ - this.tiger.group.position.z,
    );
  }

  private resetSceneSix(): void {
    this.sceneElapsed = 0;
    this.sceneSixStageElapsed = 0;
    this.setupSceneSixContinuityPose();
    this.sceneFiveShellContact.set(
      this.tortoise.group.position.x + 0.04,
      this.tortoise.group.position.y + 2.05,
      this.tortoise.group.position.z - 0.04,
    );
    this.ideaSparkle.setOrigin(this.sceneFiveShellContact);
    this.sceneSixStage = 'complete';
    this.setSceneSixStage('narrator');
    this.updateSceneSixCamera(0, true);
  }

  private resetSceneSeven(): void {
    this.sceneElapsed = 0;
    this.sceneSevenStageElapsed = 0;
    this.setupSceneSixContinuityPose();
    this.ideaSparkle.setVisible(false);
    this.sceneSevenTortoiseBaseYaw = this.tortoise.group.rotation.y;
    this.sceneSevenStage = 'complete';
    this.setSceneSevenStage('tiger-proud');
    this.updateSceneSevenCamera(0, true);
  }

  private setupSceneSevenCompletePose(): void {
    this.setupSceneSixContinuityPose();
    this.ideaSparkle.setVisible(false);
    this.sceneSevenPickupDirection
      .copy(this.tortoise.group.position)
      .sub(this.tiger.group.position)
      .setY(0)
      .normalize();
    this.sceneSevenTigerPickupEnd
      .copy(this.tiger.group.position)
      .addScaledVector(this.sceneSevenPickupDirection, 0.32);
    this.sceneSevenTigerPickupEnd.y = SCENE_FOUR_TIGER_GROUND_Y;
    this.sceneSevenTortoisePickupEnd
      .copy(this.sceneSevenTigerPickupEnd)
      .addScaledVector(this.sceneSevenPickupDirection, 1.88);
    this.sceneSevenTortoisePickupEnd.y = 0.38;
    this.tiger.group.position.copy(this.sceneSevenTigerPickupEnd);
    this.tortoise.group.position.copy(this.sceneSevenTortoisePickupEnd);
    this.tortoise.setFullyHidden(true);
    this.tortoise.setPeekOnly(false);
    this.tortoise.setGrounded(false);
    this.tortoise.playAnimationOnce(TORTOISE_ANIMATIONS.tuck, 0, 0.82, true);
    this.tortoise.setCurrentAnimationProgress(0.999);
    this.tiger.group.visible = true;
    this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0, 0.64);
    this.faceTigerTowardTortoise();
  }

  private configureSceneEightRoute(): void {
    this.sceneEightTigerStart.copy(this.tiger.group.position);
    const riverbankZ = this.sceneEightTigerStart.z - 1.75;
    this.sceneEightTigerEnd.set(
      this.world.leftBankPathAt(riverbankZ) - 0.58,
      SCENE_FOUR_TIGER_GROUND_Y,
      riverbankZ,
    );
    this.sceneEightDirection
      .copy(this.sceneEightTigerEnd)
      .sub(this.sceneEightTigerStart)
      .setY(0)
      .normalize();
    this.sceneEightCameraSide.set(
      this.sceneEightDirection.z,
      0,
      -this.sceneEightDirection.x,
    );
  }

  private updateSceneEightCarryPose(progress: number, swinging = true): void {
    // The GLB's front-foot bone origins sit deep inside the body rather than at
    // the visible paws. Use a stable, model-space carry socket just ahead of
    // the chest so the shell stays between the forelegs without bending the rig.
    const carryDirection = this.activeScene === 'scene-10'
      ? this.sceneTenThrowDirection
      : this.sceneEightDirection;
    this.sceneEightCarryAnchor
      .copy(this.tiger.group.position)
      .addScaledVector(carryDirection, 1.48);
    this.sceneEightCarryAnchor.y = 0.56;

    this.tortoise.group.position.copy(this.sceneEightCarryAnchor);
    const swingStrength = swinging ? THREE.MathUtils.smoothstep(progress, 0.08, 0.22) : 0;
    const swing = Math.sin(this.sceneElapsed * 3.25) * swingStrength;
    this.tortoise.group.position.addScaledVector(this.sceneEightCameraSide, swing * 0.09);
    this.tortoise.group.position.y += Math.abs(swing) * 0.055;
    this.tortoise.group.rotation.y = Math.atan2(carryDirection.x, carryDirection.z) + swing * 0.045;
    this.tortoise.group.rotation.z = swing * 0.075;
  }

  private setupSceneEightEndPose(): void {
    this.setupSceneSevenCompletePose();
    this.configureSceneEightRoute();
    this.tiger.group.position.copy(this.sceneEightTigerEnd);
    this.tiger.group.rotation.y = this.getTigerYawForDirection(
      this.sceneEightDirection.x,
      this.sceneEightDirection.z,
    );
    this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0, 0.66);
    this.tortoise.setFullyHidden(false);
    this.tortoise.setPeekOnly(true);
    this.tortoise.setGrounded(false);
    this.tortoise.playAnimationOnce(TORTOISE_ANIMATIONS.peek, 0, SCENE_EIGHT_TORTOISE_PEEK_SPEED, true);
    this.tortoise.setCurrentAnimationProgress(0.999);
    this.tortoise.setThinkingPose(0.05, true);
    this.updateSceneEightCarryPose(1, false);
  }

  private resetSceneEight(): void {
    this.sceneElapsed = 0;
    this.sceneEightStageElapsed = 0;
    this.setupSceneSevenCompletePose();
    this.configureSceneEightRoute();
    this.sceneEightStage = 'walking';
    this.tiger.playAnimation(TIGER_ANIMATIONS.walk, 0.42, 0.68);
    this.tiger.group.rotation.y = this.getTigerYawForDirection(
      this.sceneEightDirection.x,
      this.sceneEightDirection.z,
    );
    this.updateSceneEightCarryPose(0, false);
    this.updateSceneEightCamera(0, true);
  }

  private resetSceneNine(): void {
    this.sceneElapsed = 0;
    this.sceneNineStageElapsed = 0;
    this.setupSceneEightEndPose();
    this.sceneNineStage = 'complete';
    this.setSceneNineStage('tiger-arrival');
    this.updateSceneNineCamera(0, true);
  }

  private resetSceneTen(): void {
    this.sceneElapsed = 0;
    this.sceneTenStageElapsed = 0;
    this.setupSceneEightEndPose();
    this.ui.reset();
    this.shellUi.reset();
    const splashZ = this.sceneEightTigerEnd.z - 2.15;
    this.sceneTenSplashPoint.set(this.world.riverCenterAt(splashZ), 0.055, splashZ);
    this.sceneTenThrowDirection
      .copy(this.sceneTenSplashPoint)
      .sub(this.tiger.group.position)
      .setY(0)
      .normalize();
    this.sceneTenCameraSide.set(
      this.sceneTenThrowDirection.z,
      0,
      -this.sceneTenThrowDirection.x,
    );
    if (this.sceneTenCameraSide.dot(this.sceneEightCameraSide) < 0) {
      this.sceneTenCameraSide.multiplyScalar(-1);
    }
    this.tiger.group.rotation.y = this.getTigerYawForDirection(
      this.sceneTenThrowDirection.x,
      this.sceneTenThrowDirection.z,
    );
    this.updateSceneEightCarryPose(1, false);
    this.sceneTenThrowStart.copy(this.tortoise.group.position);
    this.sceneTenBackswing
      .copy(this.sceneTenThrowStart)
      .addScaledVector(this.sceneTenThrowDirection, -0.72);
    this.sceneTenBackswing.y += 0.2;
    this.sceneTenRelease
      .copy(this.tiger.group.position)
      .addScaledVector(this.sceneTenThrowDirection, 1.95);
    this.sceneTenRelease.y = 1.32;
    this.sceneTenFlightBaseYaw = this.tortoise.group.rotation.y;
    this.sceneTenFlightBaseRoll = this.tortoise.group.rotation.z;
    this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0, 0.7);
    this.tiger.setThrowPose(0);
    this.tortoise.setThinkingPose(0, false);
    this.sceneTenStage = 'settling';
    this.updateSceneTenCamera(0, true);
  }

  private resetSceneEleven(): void {
    // Rebuild Scene 10's final riverbank composition, then continue from the
    // exact splash and tiger transforms instead of teleporting either actor.
    this.resetSceneTen();
    this.sceneElapsed = 0;
    this.sceneElevenStageElapsed = 0;
    this.sceneElevenSwimVelocityX = 0;
    this.sceneElevenSlowTimer = 0;
    this.sceneElevenSlowFactor = 1;
    this.sceneElevenSpeechIndex = 0;
    this.sceneElevenSafeSpeechIndex = 0;
    this.sceneElevenTigerLookBackTimer = 0;
    this.sceneElevenSpeechTimer = 0;
    this.sceneElevenCollisionCount = 0;
    this.sceneElevenLastObstacle = undefined;
    this.sceneElevenContactCooldowns.clear();
    this.ui.reset();
    this.shellUi.reset();
    this.riverCompass.setVisible(false);
    this.riverSplash.reset();
    this.riverStoryBubbles.reset();
    this.input.setMovementEnabled(false);

    this.tortoise.group.position.copy(this.sceneTenSplashPoint);
    this.tortoise.group.position.y = -0.78;
    this.tortoise.group.visible = false;
    this.tortoise.setGrounded(false);
    this.tortoise.setFullyHidden(false);
    this.tortoise.setPeekOnly(true);
    this.tortoise.setThinkingPose(0, true);
    this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0, 0.78);

    const revealZ = this.sceneTenSplashPoint.z - 5.25;
    this.sceneElevenRevealPoint.set(this.world.riverCenterAt(revealZ), SCENE_ELEVEN_SWIM_Y, revealZ);
    this.riverEscapeCourse.configure(revealZ);
    this.riverEscapeCourse.setVisible(false);
    this.safeRiverReach.configure(this.riverEscapeCourse.getFinishZ());
    // This is distant scenery during the reveal, but keeping it rendered from
    // the start prevents the rocks and far bank from popping in mid-swim.
    this.safeRiverReach.setVisible(true);
    this.safeRiverReach.setSafeZoneGlowVisible(false);
    this.safeRiverReach.getSafeZone(this.sceneElevenSafeZone);

    this.tiger.group.visible = true;
    this.tiger.setThrowPose(0);
    this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0, 0.7);
    this.sceneElevenTigerDirection
      .copy(this.sceneTenSplashPoint)
      .sub(this.tiger.group.position)
      .setY(0)
      .normalize();
    this.tiger.group.rotation.y = this.getTigerYawForDirection(
      this.sceneElevenTigerDirection.x,
      this.sceneElevenTigerDirection.z,
    );

    this.sceneElevenStage = 'complete';
    this.setSceneElevenStage('silence');
    this.updateSceneElevenCamera(0, true);
  }

  private resetSceneThirteen(immediateCamera = true): void {
    // Reconstruct the final safe-bank composition so direct Scene 13 testing
    // starts at the same point reached by the swimming gameplay.
    const previousCameraPosition = immediateCamera ? undefined : this.camera.position.clone();
    const previousCameraTarget = immediateCamera ? undefined : this.cameraTarget.clone();
    this.resetSceneEleven();
    if (previousCameraPosition && previousCameraTarget) {
      this.camera.position.copy(previousCameraPosition);
      this.cameraTarget.copy(previousCameraTarget);
      this.camera.lookAt(this.cameraTarget);
    }
    this.sceneElapsed = 0;
    this.sceneThirteenStageElapsed = 0;
    this.ui.reset();
    this.shellUi.reset();
    this.riverCompass.setVisible(false);
    this.input.setMovementEnabled(false);
    this.riverEscapeCourse.setVisible(false);
    this.safeRiverReach.setVisible(true);
    this.safeRiverReach.setSafeZoneGlowVisible(false);
    this.world.setGameplayRiverDecorVisible(false);
    this.tortoiseSwimWake.reset();
    this.endingBirdFlock.setVisible(false);

    this.safeRiverReach.getSafeZone(this.sceneThirteenSwimStart);
    this.sceneThirteenSwimStart.y = SCENE_ELEVEN_SWIM_Y;
    this.safeRiverReach.getEndingRockPosition(this.sceneThirteenRock);
    this.sceneThirteenTigerPosition.set(
      this.world.leftBankPathAt(this.sceneThirteenRock.z + 1.15),
      SCENE_FOUR_TIGER_GROUND_Y,
      this.sceneThirteenRock.z + 1.15,
    );
    this.sceneThirteenAcrossRiver
      .copy(this.sceneThirteenRock)
      .sub(this.sceneThirteenTigerPosition)
      .setY(0)
      .normalize();
    this.sceneThirteenCameraSide.set(
      this.sceneThirteenAcrossRiver.z,
      0,
      -this.sceneThirteenAcrossRiver.x,
    );
    this.sceneThirteenMidpoint
      .copy(this.sceneThirteenTigerPosition)
      .lerp(this.sceneThirteenRock, 0.54);
    this.sceneThirteenMidpoint.y = 0.72;

    this.tortoise.group.visible = true;
    this.tortoise.group.position.copy(this.sceneThirteenSwimStart);
    this.tortoise.group.rotation.set(
      0,
      Math.atan2(
        this.sceneThirteenRock.x - this.sceneThirteenSwimStart.x,
        this.sceneThirteenRock.z - this.sceneThirteenSwimStart.z,
      ),
      0,
    );
    this.tortoise.setGrounded(false);
    this.tortoise.setPeekOnly(false);
    this.tortoise.setFullyHidden(false);
    this.tortoise.setThinkingPose(0, true);
    this.tortoise.playAnimation(TORTOISE_ANIMATIONS.walk, 0.32, 0.66);

    this.tiger.group.visible = true;
    this.tiger.group.position.copy(this.sceneThirteenTigerPosition);
    this.tiger.group.rotation.y = this.getTigerYawForDirection(
      this.sceneThirteenAcrossRiver.x,
      this.sceneThirteenAcrossRiver.z,
    );
    this.tiger.setThrowPose(0);
    this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.42, 0.62);

    this.sceneThirteenStage = 'complete';
    this.setSceneThirteenStage('climbing');
    this.updateSceneThirteenCamera(0, immediateCamera);
  }

  private resetSceneFourteen(immediateCamera = true): void {
    this.resetSceneThirteen(immediateCamera);
    this.sceneFourteenElapsed = 0;
    this.sceneFourteenStageElapsed = 0;
    this.ui.reset();
    this.shellUi.reset();
    this.tortoise.group.position.copy(this.sceneThirteenRock);
    this.tortoise.group.rotation.set(0, this.getTigerYawForDirection(
      -this.sceneThirteenAcrossRiver.x,
      -this.sceneThirteenAcrossRiver.z,
    ), 0);
    this.tortoise.setGrounded(true);
    this.tortoise.setThinkingPose(0.08, true);
    this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.38, 0.76);
    this.tiger.playAnimation(TIGER_ANIMATIONS.disappointed, 0.5, 0.42);
    this.endingBirdFlock.setCenter(
      this.sceneThirteenMidpoint.clone().add(new THREE.Vector3(0, 4.8, -1.5)),
    );
    this.endingBirdFlock.setVisible(true);
    this.sceneFourteenStage = 'complete';
    this.setSceneFourteenStage('establishing');
    this.updateSceneFourteenCamera(0, immediateCamera);
  }

  private update(delta: number): void {
    this.elapsed += delta;
    this.sceneElapsed += delta;
    this.world.update(delta);
    this.butterfly.update(delta);
    this.tortoise.update(delta);
    this.tiger.update(delta);
    this.ideaSparkle.update(delta, this.camera);
    this.riverSplash.update(delta);
    this.riverStoryBubbles.update(delta);
    this.riverEscapeCourse.update(delta);
    this.safeRiverReach.update(delta);
    this.endingBirdFlock.update(delta);

    if (this.activeScene === 'scene-14') this.updateSceneFourteen(delta);
    else if (this.activeScene === 'scene-13') this.updateSceneThirteen(delta);
    else if (this.activeScene === 'scene-11') this.updateSceneEleven(delta);
    else if (this.activeScene === 'scene-10') this.updateSceneTen(delta);
    else if (this.activeScene === 'scene-9') this.updateSceneNine(delta);
    else if (this.activeScene === 'scene-8') this.updateSceneEight(delta);
    else if (this.activeScene === 'scene-7') this.updateSceneSeven(delta);
    else if (this.activeScene === 'scene-6') this.updateSceneSix(delta);
    else if (this.activeScene === 'scene-5b') this.updateSceneFiveB(delta);
    else if (this.activeScene === 'scene-5') this.updateSceneFive(delta);
    else if (this.activeScene === 'scene-4') this.updateSceneFour(delta);
    else if (this.activeScene === 'scene-3') this.updateSceneThree(delta);
    else if (this.activeScene === 'scene-2') this.updateSceneTwo(delta);
    else this.updateSceneOne(delta);
    this.updateRiverCompass();
    this.updateStoryCameraBlend(delta);
    this.updateStoryTransition(delta);
  }

  private queueStoryScene(nextScene: StorySceneId, delay = STORY_TRANSITION_HOLD): void {
    if (!this.storyMode || this.pendingStoryScene || this.activeScene === nextScene) return;
    this.pendingStoryScene = nextScene;
    this.pendingStoryDelay = Math.max(0, delay);
    this.storyTransitionFrom = this.activeScene;
    this.input.setMovementEnabled(false);
  }

  private updateStoryTransition(delta: number): void {
    if (!this.pendingStoryScene) return;
    this.pendingStoryDelay -= delta;
    if (this.pendingStoryDelay > 0) return;

    const nextScene = this.pendingStoryScene;
    const previousScene = this.activeScene;
    const incomingTortoiseZ = this.tortoise.group.position.z;
    this.storyCameraBlendFromPosition.copy(this.camera.position);
    this.storyCameraBlendFromTarget.copy(this.cameraTarget);

    if (nextScene === 'scene-2') this.sceneTwoStartZ = incomingTortoiseZ;
    else if (nextScene === 'scene-3') this.sceneThreeStartZ = incomingTortoiseZ;
    else if (nextScene === 'scene-4') this.sceneFourTortoiseStartZ = incomingTortoiseZ;
    else if (nextScene === 'scene-5') this.sceneFiveTortoiseZ = incomingTortoiseZ;

    this.pendingStoryScene = undefined;
    this.activeScene = nextScene;
    this.resetCurrentScene(false);
    this.storyCameraBlendElapsed = 0;
    this.camera.position.copy(this.storyCameraBlendFromPosition);
    this.cameraTarget.copy(this.storyCameraBlendFromTarget);
    this.camera.lookAt(this.cameraTarget);
    this.storyTransitionCount += 1;
    this.storySceneHistory.push(nextScene);
    this.storyTransitionFrom = previousScene;
  }

  private updateStoryCameraBlend(delta: number): void {
    const duration = this.reducedMotion ? 0.35 : STORY_CAMERA_BLEND_DURATION;
    if (this.storyCameraBlendElapsed >= duration) return;
    this.storyCameraBlendElapsed = Math.min(duration, this.storyCameraBlendElapsed + delta);
    this.storyCameraDestinationPosition.copy(this.camera.position);
    this.storyCameraDestinationTarget.copy(this.cameraTarget);
    const rawProgress = THREE.MathUtils.clamp(this.storyCameraBlendElapsed / duration, 0, 1);
    const progress = rawProgress * rawProgress * (3 - 2 * rawProgress);
    this.camera.position.lerpVectors(
      this.storyCameraBlendFromPosition,
      this.storyCameraDestinationPosition,
      progress,
    );
    this.cameraTarget.lerpVectors(
      this.storyCameraBlendFromTarget,
      this.storyCameraDestinationTarget,
      progress,
    );
    this.camera.lookAt(this.cameraTarget);
  }

  private advanceStoryForTest(): void {
    if (!this.storyMode) return;
    const index = STORY_SCENE_ORDER.indexOf(this.activeScene);
    const nextScene = STORY_SCENE_ORDER[index + 1];
    if (!nextScene) return;
    this.pendingStoryScene = undefined;
    this.queueStoryScene(nextScene, 0);
    this.updateStoryTransition(0);
  }

  private advanceTimeForTest(seconds: number): void {
    const clampedSeconds = THREE.MathUtils.clamp(seconds, 0, 120);
    let remaining = clampedSeconds;
    while (remaining > 0) {
      const step = Math.min(remaining, 0.05);
      this.update(step);
      remaining -= step;
    }
    this.renderer.render(this.scene, this.camera);
  }

  private updateRiverCompass(): void {
    const visible = this.activeScene === 'scene-11'
      && (this.sceneElevenStage === 'swimming' || this.sceneElevenStage === 'safe-swimming');
    this.riverCompass.setVisible(visible);
    if (!visible) return;
    this.riverCompass.update(
      this.tortoise.group.position,
      this.sceneElevenSafeZone,
      this.camera.position,
      this.cameraTarget,
    );
  }

  private updateSceneOne(delta: number): void {
    this.moveTortoiseAlongBank(delta, SCENE_ONE_TORTOISE_SPEED);

    if (this.sceneElapsed <= SCENE_ONE_OPENING_DURATION) {
      const rawProgress = THREE.MathUtils.clamp(this.sceneElapsed / SCENE_ONE_OPENING_DURATION, 0, 1);
      const eased = this.reducedMotion ? rawProgress : 1 - Math.pow(1 - rawProgress, 3);
      this.camera.position.copy(this.cameraPositionCurve.getPoint(eased));
      this.cameraTarget.copy(this.cameraTargetCurve.getPoint(eased));
      this.camera.lookAt(this.cameraTarget);
    } else {
      this.desiredCameraPosition.set(
        this.tortoise.group.position.x + 5.4,
        4.5,
        this.tortoise.group.position.z - 5.1,
      );
      this.camera.position.lerp(this.desiredCameraPosition, 1 - Math.exp(-delta * 1.35));
      this.cameraTarget.set(
        this.tortoise.group.position.x,
        0.58,
        this.tortoise.group.position.z + 0.15,
      );
      this.camera.lookAt(this.cameraTarget);
    }

    if (!this.sceneOneNarratorShown && this.sceneElapsed >= SCENE_ONE_NARRATOR_AT) {
      this.sceneOneNarratorShown = true;
      this.ui.showNarrator(
        'Once upon a time, beside a beautiful forest river, lived a small but very clever tortoise.',
        () => {
          if (this.activeScene === 'scene-1') this.queueStoryScene('scene-2', 0.7);
        },
      );
    }
  }

  private updateSceneTwo(delta: number): void {
    if (this.sceneElapsed < SCENE_TWO_PAUSE_AT) {
      this.setSceneTwoMotionBeat('approach');
      this.moveTortoiseAlongBank(delta, SCENE_TWO_TORTOISE_SPEED);
    } else if (this.sceneElapsed < SCENE_TWO_RESUME_AT) {
      this.setSceneTwoMotionBeat('butterfly-pause');
      const dx = this.butterfly.group.position.x - this.tortoise.group.position.x;
      const dz = this.butterfly.group.position.z - this.tortoise.group.position.z;
      const butterflyYaw = Math.atan2(dx, dz);
      this.tortoise.group.rotation.y = lerpAngle(
        this.tortoise.group.rotation.y,
        butterflyYaw,
        1 - Math.exp(-delta * 2.2),
      );
    } else {
      this.setSceneTwoMotionBeat('second-walk');
      this.moveTortoiseAlongBank(delta, SCENE_TWO_TORTOISE_SPEED);
    }

    if (this.sceneTwoPopupStage === 'waiting' && this.sceneElapsed >= SCENE_TWO_NARRATOR_AT) {
      this.showSceneTwoNarrator();
    } else if (this.sceneTwoPopupStage === 'between-popups') {
      this.sceneTwoDialogueDelay += delta;
      if (this.sceneTwoDialogueDelay >= SCENE_TWO_DIALOGUE_DELAY) this.showSceneTwoDialogue();
    }

    this.updateSceneTwoCamera(delta, false);
  }

  private updateSceneThree(delta: number): void {
    this.sceneThreeStageElapsed += delta;
    this.moveTortoiseAlongBank(delta, SCENE_THREE_TORTOISE_SPEED);

    if (!this.sceneThreeGrowlPlayed && this.sceneElapsed >= SCENE_THREE_GROWL_AT) {
      this.sceneThreeGrowlPlayed = true;
      this.audio.playStomachGrowl();
    }

    if (this.sceneThreeStage === 'peace' && this.sceneElapsed >= SCENE_THREE_APPROACH_AT) {
      this.setSceneThreeStage('approach');
    } else if (this.sceneThreeStage === 'approach' && this.sceneElapsed >= SCENE_THREE_TAIL_AT) {
      this.setSceneThreeStage('tail');
    } else if (this.sceneThreeStage === 'tail' && this.sceneElapsed >= SCENE_THREE_PAW_AT) {
      this.setSceneThreeStage('paw');
    } else if (this.sceneThreeStage === 'paw' && this.sceneElapsed >= SCENE_THREE_STRIPES_AT) {
      this.setSceneThreeStage('stripes');
    } else if (this.sceneThreeStage === 'stripes' && this.sceneElapsed >= SCENE_THREE_FACE_AT) {
      this.setSceneThreeStage('face');
    } else if (this.sceneThreeStage === 'face' && this.sceneElapsed >= SCENE_THREE_HUNGRY_AT) {
      this.showSceneThreeHungryDialogue();
    } else if (this.sceneThreeStage === 'sniff-close' && this.sceneThreeStageElapsed >= 1.05) {
      this.showSceneThreeSniffDialogue();
    } else if (this.sceneThreeStage === 'pov' && this.sceneThreeStageElapsed >= 3.2) {
      this.setSceneThreeStage('reaction');
    } else if (this.sceneThreeStage === 'reaction' && this.sceneThreeStageElapsed >= 0.72) {
      this.showSceneThreeLunchDialogue();
    }

    if (this.isSceneThreeTortoiseView()) {
      this.tiger.group.rotation.y = this.getTigerLookYaw();
    } else if (this.sceneThreeStage === 'hungry') {
      this.tiger.group.rotation.y = Math.sin(this.sceneThreeStageElapsed * 0.85) * 0.055;
    } else {
      this.tiger.group.rotation.y = THREE.MathUtils.damp(this.tiger.group.rotation.y, 0, 2.8, delta);
    }
    this.updateSceneThreeCamera(delta, false);
  }

  private setSceneThreeStage(stage: SceneThreeStage): void {
    if (this.sceneThreeStage === stage) return;
    this.sceneThreeStage = stage;
    this.sceneThreeStageElapsed = 0;
    const tortoiseView = this.isSceneThreeTortoiseView(stage);
    this.tiger.group.visible = !tortoiseView;
    this.sceneThreeFoliage.setSightlineClear(tortoiseView);
    if (tortoiseView) this.tiger.group.rotation.y = this.getTigerLookYaw();
    this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.18, SCENE_THREE_TIGER_ANIMATION_SPEED);
    if (stage === 'complete') this.queueStoryScene('scene-4', 0.65);
  }

  private isSceneThreeTortoiseView(stage: SceneThreeStage = this.sceneThreeStage): boolean {
    return stage === 'pov' || stage === 'reaction' || stage === 'lunch' || stage === 'complete';
  }

  private getTigerLookYaw(): number {
    const dx = this.tortoise.group.position.x - this.tigerHome.x;
    const dz = this.tortoise.group.position.z - this.tigerHome.z;
    return Math.atan2(dz, -dx);
  }

  private showSceneThreeHungryDialogue(): void {
    this.setSceneThreeStage('hungry');
    this.ui.showDialogue('Tiger', SCENE_THREE_HUNGRY, () => {
      if (this.activeScene !== 'scene-3') return;
      this.setSceneThreeStage('sniff-close');
    });
  }

  private showSceneThreeSniffDialogue(): void {
    this.setSceneThreeStage('sniff-dialogue');
    this.audio.playSniffs();
    this.ui.showDialogue('Tiger', SCENE_THREE_SNIFF, () => {
      if (this.activeScene !== 'scene-3') return;
      this.setSceneThreeStage('pov');
    });
  }

  private showSceneThreeLunchDialogue(): void {
    this.setSceneThreeStage('lunch');
    this.ui.showDialogue('Tiger', SCENE_THREE_LUNCH, () => {
      if (this.activeScene === 'scene-3') this.setSceneThreeStage('complete');
    });
  }

  private positionSceneThreeTortoiseAt(time: number): void {
    const z = this.sceneThreeStartZ - SCENE_THREE_TORTOISE_SPEED * time;
    const x = this.world.leftBankPathAt(z);
    const aheadZ = z - 0.4;
    const headingX = this.world.leftBankPathAt(aheadZ) - x;
    this.tortoise.group.position.set(x, -0.18, z);
    this.tortoise.group.rotation.y = Math.atan2(headingX, -0.4);
  }

  private updateSceneThreeCamera(_delta: number, _immediate: boolean): void {
    const tiger = this.tigerHome;
    const tortoise = this.tortoise.group.position;
    const position = this.desiredCameraPosition;
    const target = this.desiredCameraTarget;
    const startZ = this.sceneThreeStartZ;
    const startX = this.world.leftBankPathAt(startZ);

    if (this.sceneThreeStage === 'peace') {
      position.set(startX + 5.2, 3.55, startZ - 5.1);
      target.set(startX, 0.66, startZ + 0.05);
    } else if (this.sceneThreeStage === 'approach') {
      const progress = THREE.MathUtils.smoothstep(this.sceneElapsed, SCENE_THREE_APPROACH_AT, SCENE_THREE_TAIL_AT);
      position.set(
        THREE.MathUtils.lerp(startX + 5.2, tiger.x + 6.15, progress),
        THREE.MathUtils.lerp(3.55, 2.72, progress),
        THREE.MathUtils.lerp(startZ - 5.1, tiger.z + 2.35, progress),
      );
      target.set(
        THREE.MathUtils.lerp(startX, tiger.x, progress),
        THREE.MathUtils.lerp(0.66, 0.95, progress),
        THREE.MathUtils.lerp(startZ, tiger.z, progress),
      );
    } else if (this.isSceneThreeTortoiseView()) {
      position.set(tiger.x + 0.08, 1.58, tiger.z + 1.02);
      target.set(tortoise.x, 0.58, tortoise.z);
    } else {
      position.set(tiger.x + 6.15, 2.72, tiger.z + 2.35);
      target.set(tiger.x, 0.98, tiger.z);
    }

    if (this.camera.aspect < 0.78) {
      this.cameraAway.copy(position).sub(target).normalize().multiplyScalar(1.25);
      position.add(this.cameraAway);
      position.y += 0.35;
    }

    this.camera.position.copy(position);
    this.cameraTarget.copy(target);
    this.camera.lookAt(this.cameraTarget);
  }

  private updateSceneFour(delta: number): void {
    this.sceneFourStageElapsed += delta;

    if (this.sceneFourStage === 'emerging') {
      const approachProgress = THREE.MathUtils.smoothstep(
        this.sceneFourStageElapsed,
        0,
        SCENE_FOUR_APPROACH_DURATION,
      );
      this.positionSceneFourTigerOnApproach(approachProgress);
      this.faceTigerTowardTortoise();

      if (this.sceneFourStageElapsed < SCENE_FOUR_TORTOISE_WALK_DURATION) {
        this.moveTortoiseAlongBank(delta, 0.18);
      } else if (this.tortoise.getCurrentAnimation() === TORTOISE_ANIMATIONS.walk) {
        this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.4, 0.76);
      }
      this.faceTortoiseTowardTiger(delta);

      if (!this.sceneFourNarratorShown && this.sceneFourStageElapsed >= 0.62) {
        this.showSceneFourNarrator();
      }
      if (!this.sceneFourApproachComplete && approachProgress >= 1) {
        this.sceneFourApproachComplete = true;
        this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.35, 0.8);
        this.tryShowSceneFourTigerGreeting();
      }
    } else if (this.sceneFourStage === 'circling') {
      const circleProgress = THREE.MathUtils.clamp(
        this.sceneFourStageElapsed / SCENE_FOUR_CIRCLE_DURATION,
        0,
        1,
      );
      this.positionSceneFourTigerOnCircle(circleProgress);
      this.faceTigerTowardTortoise();
      this.faceTortoiseTowardTiger(delta);
      if (circleProgress >= 1) this.showSceneFourTigerSnack();
    } else {
      this.faceTigerTowardTortoise();
      if (this.sceneFourStage === 'shell-look' || this.sceneFourStage === 'complete') {
        this.faceTortoiseTowardShell(delta);
      } else {
        this.faceTortoiseTowardTiger(delta);
      }
      if (this.sceneFourStage === 'worried' && this.sceneFourStageElapsed >= 1.55) {
        this.setSceneFourStage('shell-look');
      } else if (this.sceneFourStage === 'shell-look' && this.sceneFourStageElapsed >= 2.2) {
        this.setSceneFourStage('complete');
      }
    }

    this.updateSceneFourCamera(delta, false);
  }

  private setSceneFourStage(stage: SceneFourStage): void {
    if (this.sceneFourStage === stage) return;
    this.sceneFourStage = stage;
    this.sceneFourStageElapsed = 0;

    if (stage === 'circling') {
      this.tiger.playAnimation(TIGER_ANIMATIONS.walk, 0.32, 0.72);
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.3, 0.72);
    } else if (stage === 'worried') {
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.3, 0.8);
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.scared, 0.36, 0.78);
    } else if (stage === 'shell-look' || stage === 'complete') {
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.3, 0.8);
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.headShake, 0.38, 0.62);
    } else if (stage !== 'emerging') {
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.32, 0.8);
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.3, 0.72);
    }
    if (stage === 'complete') this.queueStoryScene('scene-5', 0.6);
  }

  private showSceneFourNarrator(): void {
    this.sceneFourNarratorShown = true;
    this.ui.showNarrator(SCENE_FOUR_NARRATION, () => {
      if (this.activeScene !== 'scene-4') return;
      this.sceneFourNarratorDismissed = true;
      this.tryShowSceneFourTigerGreeting();
    });
  }

  private tryShowSceneFourTigerGreeting(): void {
    if (!this.sceneFourNarratorDismissed || !this.sceneFourApproachComplete) return;
    this.setSceneFourStage('tiger-greeting');
    this.ui.showDialogue('Tiger', SCENE_FOUR_TIGER_GREETING, () => {
      if (this.activeScene !== 'scene-4') return;
      this.setSceneFourStage('tortoise-reply');
      this.ui.showDialogue('Tortoise', SCENE_FOUR_TORTOISE_REPLY, () => {
        if (this.activeScene === 'scene-4') this.setSceneFourStage('circling');
      });
    });
  }

  private showSceneFourTigerSnack(): void {
    if (this.sceneFourStage === 'tiger-snack') return;
    this.setSceneFourStage('tiger-snack');
    this.audio.playSniffs();
    this.ui.showDialogue('Tiger', SCENE_FOUR_TIGER_SNACK, () => {
      if (this.activeScene === 'scene-4') this.setSceneFourStage('worried');
    });
  }

  private positionSceneFourTigerOnApproach(progress: number): void {
    this.tiger.group.position.lerpVectors(this.sceneFourTigerStart, this.sceneFourTigerNear, progress);
    this.tiger.group.position.y = SCENE_FOUR_TIGER_GROUND_Y;
  }

  private positionSceneFourTigerOnCircle(progress: number): void {
    const angle = -Math.PI * 0.5 + progress * Math.PI;
    this.tiger.group.position.set(
      this.tortoise.group.position.x - 2.25 - Math.cos(angle) * 1.05,
      SCENE_FOUR_TIGER_GROUND_Y,
      this.tortoise.group.position.z + Math.sin(angle) * 2.35,
    );
  }

  private faceTigerTowardTortoise(): void {
    const dx = this.tortoise.group.position.x - this.tiger.group.position.x;
    const dz = this.tortoise.group.position.z - this.tiger.group.position.z;
    this.tiger.group.rotation.y = this.getTigerYawForDirection(dx, dz);
  }

  private faceTortoiseTowardTiger(delta: number): void {
    const dx = this.tiger.group.position.x - this.tortoise.group.position.x;
    const dz = this.tiger.group.position.z - this.tortoise.group.position.z;
    const yaw = Math.atan2(dx, dz);
    this.tortoise.group.rotation.y = lerpAngle(
      this.tortoise.group.rotation.y,
      yaw,
      1 - Math.exp(-delta * 3.1),
    );
  }

  private orientTortoiseForSceneFive(): void {
    this.tortoise.group.rotation.y = Math.atan2(-2.25, 2.35);
  }

  private faceTortoiseTowardShell(delta: number): void {
    const dx = this.tiger.group.position.x - this.tortoise.group.position.x;
    const dz = this.tiger.group.position.z - this.tortoise.group.position.z;
    const threeQuarterYaw = Math.atan2(dx, dz) + 1.35;
    this.tortoise.group.rotation.y = lerpAngle(
      this.tortoise.group.rotation.y,
      threeQuarterYaw,
      1 - Math.exp(-delta * 2.6),
    );
  }

  private getTigerYawForDirection(dx: number, dz: number): number {
    // TigerLowPoly.glb is authored facing local +Z. Keep this convention here
    // so approach movement and target-facing poses use the model's real front.
    return Math.atan2(dx, dz);
  }

  private updateSceneFourCamera(delta: number, immediate: boolean): void {
    const tiger = this.tiger.group.position;
    const tortoise = this.tortoise.group.position;
    const emerging = this.sceneFourStage === 'emerging';

    if (emerging) {
      const separation = tiger.distanceTo(tortoise);
      this.sceneFourMidpoint.copy(tiger).lerp(tortoise, 0.5);
      this.desiredCameraTarget.copy(this.sceneFourMidpoint);
      this.desiredCameraTarget.y = 0.72;
      this.desiredCameraPosition
        .copy(this.sceneFourMidpoint)
        .addScaledVector(this.sceneFourCameraSide, 7.4 + separation * 0.17);
      this.desiredCameraPosition.y = 4.15 + separation * 0.16;
    } else if (this.sceneFourStage === 'circling') {
      this.sceneFourMidpoint.copy(tiger).lerp(tortoise, 0.5);
      this.desiredCameraTarget.copy(this.sceneFourMidpoint);
      this.desiredCameraTarget.y = 0.76;
      this.desiredCameraPosition
        .copy(this.sceneFourMidpoint)
        .addScaledVector(this.sceneFourCameraSide, 9.1)
        .addScaledVector(this.sceneFourPathDirection, -0.35);
      this.desiredCameraPosition.y = 4.85;
    } else {
      this.sceneFourMidpoint.copy(tiger).lerp(tortoise, 0.5);
      this.desiredCameraTarget.copy(this.sceneFourMidpoint);

      if (this.sceneFourStage === 'tiger-greeting' || this.sceneFourStage === 'tiger-snack') {
        this.desiredCameraTarget.lerp(tiger, 0.32);
        this.desiredCameraTarget.y = 1.08;
      } else if (this.sceneFourStage === 'tortoise-reply') {
        this.desiredCameraTarget.lerp(tortoise, 0.34);
        this.desiredCameraTarget.y = 0.76;
      } else {
        this.desiredCameraTarget.lerp(tortoise, 0.24);
        this.desiredCameraTarget.y = 0.76;
      }

      this.desiredCameraPosition
        .copy(this.sceneFourMidpoint)
        .addScaledVector(this.sceneFourCameraSide, 7.65)
        .addScaledVector(this.sceneFourPathDirection, -0.35);
      this.desiredCameraPosition.y = 4.55;
      if (this.sceneFourStage === 'shell-look' || this.sceneFourStage === 'complete') {
        this.desiredCameraPosition.addScaledVector(this.sceneFourCameraSide, -0.55);
        this.desiredCameraTarget.y = 0.68;
      }
    }

    if (this.camera.aspect < 0.78) {
      this.cameraAway
        .copy(this.desiredCameraPosition)
        .sub(this.desiredCameraTarget)
        .normalize()
        .multiplyScalar(2.35);
      this.desiredCameraPosition.add(this.cameraAway);
      this.desiredCameraPosition.y += 0.4;
    }

    if (immediate) {
      this.camera.position.copy(this.desiredCameraPosition);
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      // Match Scene 2's gentle, frame-rate-independent camera easing so
      // dialogue speaker changes feel like a short pan instead of a cut.
      const amount = 1 - Math.exp(-delta * 1.8);
      this.camera.position.lerp(this.desiredCameraPosition, amount);
      this.cameraTarget.lerp(this.desiredCameraTarget, amount);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private readonly handleSceneFiveHideTap = (): void => {
    if (this.activeScene !== 'scene-5' || this.sceneFiveStage !== 'objective') return;
    this.sceneFiveTapCount = Math.min(SCENE_FIVE_REQUIRED_TAPS, this.sceneFiveTapCount + 1);
    this.shellUi.setProgress(this.sceneFiveTapCount);
    this.audio.playHideTap(this.sceneFiveTapCount);
    if (this.sceneFiveTapCount === 1) this.shellUi.hideObjective();
    if ('vibrate' in navigator) navigator.vibrate(this.sceneFiveTapCount >= SCENE_FIVE_REQUIRED_TAPS ? 38 : 14);
    if (this.sceneFiveTapCount >= SCENE_FIVE_REQUIRED_TAPS) this.setSceneFiveStage('tucking');
  };

  private updateSceneFive(delta: number): void {
    this.sceneFiveStageElapsed += delta;
    this.faceTigerTowardTortoise();

    if (this.sceneFiveStage === 'objective') {
      this.faceTortoiseTowardTiger(delta);
    } else if (this.sceneFiveStage === 'tucking') {
      if (this.sceneFiveStageElapsed >= SCENE_FIVE_TUCK_DURATION) this.setSceneFiveStage('surprised');
    } else if (this.sceneFiveStage === 'surprised') {
      const recoil = Math.sin(Math.min(1, this.sceneFiveStageElapsed / SCENE_FIVE_SURPRISE_DURATION) * Math.PI) * 0.18;
      this.sceneFiveTigerDirection
        .copy(this.tiger.group.position)
        .sub(this.tortoise.group.position)
        .setY(0)
        .normalize();
      this.tiger.group.position.copy(this.sceneFiveTigerStart).addScaledVector(this.sceneFiveTigerDirection, recoil);
      if (this.sceneFiveStageElapsed >= SCENE_FIVE_SURPRISE_DURATION) this.setSceneFiveStage('shell-tap');
    } else if (this.sceneFiveStage === 'shell-tap') {
      const firstKnock = this.getSceneFiveKnockPulse(this.sceneFiveStageElapsed, 0.36, 0.25);
      const secondKnock = this.getSceneFiveKnockPulse(this.sceneFiveStageElapsed, 0.91, 0.25);
      this.updateSceneFivePawContact(this.sceneFiveTigerStart, Math.max(firstKnock, secondKnock));
      if (this.sceneFiveStageElapsed >= SCENE_FIVE_SHELL_TAP_DURATION) this.setSceneFiveStage('sniffing');
    } else if (this.sceneFiveStage === 'sniffing') {
      if (this.sceneFiveStageElapsed >= SCENE_FIVE_SNIFF_DURATION) this.setSceneFiveStage('changing-side');
    } else if (this.sceneFiveStage === 'changing-side') {
      const progress = THREE.MathUtils.smoothstep(
        this.sceneFiveStageElapsed,
        0,
        SCENE_FIVE_CHANGE_SIDE_DURATION,
      );
      this.positionSceneFiveTigerAtSide(progress);
      if (progress >= 1) this.setSceneFiveStage('second-tap');
    } else if (this.sceneFiveStage === 'second-tap') {
      const pawReach = this.getSceneFiveKnockPulse(this.sceneFiveStageElapsed, 0.48, 0.3);
      this.updateSceneFivePawContact(this.sceneFiveSecondTapStart, pawReach);
      if (this.sceneFiveStageElapsed >= SCENE_FIVE_SECOND_TAP_DURATION) this.setSceneFiveStage('retreating');
    } else if (this.sceneFiveStage === 'retreating') {
      const progress = THREE.MathUtils.smoothstep(
        this.sceneFiveStageElapsed,
        0,
        SCENE_FIVE_RETREAT_DURATION,
      );
      this.tiger.group.position
        .copy(this.sceneFiveTigerRetreatStart)
        .addScaledVector(this.sceneFiveTigerDirection, progress * SCENE_FIVE_RETREAT_DISTANCE);
      this.tiger.group.position.y = SCENE_FOUR_TIGER_GROUND_Y;
      this.faceTigerTowardTortoise();
      if (progress >= 1) this.setSceneFiveStage('disappointed');
    } else if (this.sceneFiveStage === 'disappointed') {
      if (this.sceneFiveStageElapsed >= SCENE_FIVE_DISAPPOINTED_DURATION) {
        this.setSceneFiveStage('complete');
      }
    }

    this.updateSceneFiveCamera(delta, false);
  }

  private setSceneFiveStage(stage: SceneFiveStage): void {
    if (this.sceneFiveStage === stage) return;
    this.sceneFiveStage = stage;
    this.sceneFiveStageElapsed = 0;
    this.shellUi.hideSecondaryDialogue();
    this.tiger.clearPawTarget();
    this.sceneFivePawContactDistance = undefined;

    if (stage === 'tucking') {
      this.shellUi.hideObjective();
      this.shellUi.hideAction();
      this.tortoise.setFullyHidden(false);
      this.tortoise.playAnimationOnce(TORTOISE_ANIMATIONS.tuck, 0.12, 1.25, true);
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.2, 0.8);
    } else if (stage === 'surprised') {
      this.tortoise.setFullyHidden(true);
      this.tiger.group.position.copy(this.sceneFiveTigerStart);
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.16, 1.05);
    } else if (stage === 'shell-tap') {
      this.tortoise.setFullyHidden(true);
      this.tiger.group.position.copy(this.sceneFiveTigerStart);
      this.shellUi.showSecondaryDialogue('Tiger', 'TOK TOK');
      this.audio.playShellKnock();
    } else if (stage === 'sniffing') {
      this.tortoise.setFullyHidden(true);
      this.tiger.group.position.copy(this.sceneFiveTigerStart);
      this.tiger.playAnimationOnce(TIGER_ANIMATIONS.sniff, 0.22, 1.18, true);
      this.audio.playSniffs();
    } else if (stage === 'changing-side') {
      this.tortoise.setFullyHidden(true);
      this.tiger.playAnimation(TIGER_ANIMATIONS.walk, 0.24, 0.72);
    } else if (stage === 'second-tap') {
      this.tortoise.setFullyHidden(true);
      this.positionSceneFiveTigerAtSide(1);
      this.sceneFiveSecondTapStart.copy(this.tiger.group.position);
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.2, 0.84);
      this.shellUi.showSecondaryDialogue('Tiger', 'TOK!');
      this.audio.playSingleShellKnock();
    } else if (stage === 'retreating') {
      this.tortoise.setFullyHidden(true);
      this.sceneFiveTigerRetreatStart.copy(this.tiger.group.position);
      this.sceneFiveTigerDirection
        .copy(this.tiger.group.position)
        .sub(this.tortoise.group.position)
        .setY(0)
        .normalize();
      this.tiger.playAnimation(TIGER_ANIMATIONS.walk, 0.22, -0.58);
    } else if (stage === 'disappointed') {
      this.tortoise.setFullyHidden(true);
      this.tiger.group.position.y = SCENE_FOUR_TIGER_GROUND_Y;
      this.tiger.playAnimationOnce(TIGER_ANIMATIONS.disappointed, 0.28, 1.03, true);
    } else if (stage === 'complete') {
      this.tiger.group.position.y = SCENE_FOUR_TIGER_GROUND_Y;
      this.queueStoryScene('scene-5b', 0.45);
    }
  }

  private updateSceneFivePawContact(basePosition: THREE.Vector3, pawReach: number): void {
    this.sceneFiveTigerDirection
      .copy(this.tortoise.group.position)
      .sub(basePosition)
      .setY(0)
      .normalize();
    this.tiger.group.position
      .copy(basePosition)
      .addScaledVector(this.sceneFiveTigerDirection, 0.22 + pawReach * 0.52);
    this.sceneFiveShellContact
      .copy(this.tortoise.group.position)
      .addScaledVector(this.sceneFiveTigerDirection, -0.48);
    this.sceneFiveShellContact.y = 0.72;
    this.sceneFivePawContactDistance = this.tiger.poseFrontPawAt(this.sceneFiveShellContact, pawReach);
    if (this.sceneFivePawContactDistance === undefined || pawReach <= 0) return;
    const contactCorrection = THREE.MathUtils.clamp(
      this.sceneFivePawContactDistance - 0.018,
      0,
      0.34,
    ) * pawReach;
    this.tiger.group.position.addScaledVector(this.sceneFiveTigerDirection, contactCorrection);
    this.sceneFivePawContactDistance = this.tiger.poseFrontPawAt(this.sceneFiveShellContact, pawReach);
  }

  private updateSceneFiveBPushContact(pawReach: number): void {
    this.sceneFiveTigerDirection
      .copy(this.tortoise.group.position)
      .sub(this.sceneFiveBAttackPosition)
      .setY(0)
      .normalize();
    this.tiger.group.position
      .copy(this.sceneFiveBAttackPosition)
      .addScaledVector(this.sceneFiveTigerDirection, pawReach * 0.74);
    this.sceneFiveShellContact
      .copy(this.tortoise.group.position)
      .addScaledVector(this.sceneFiveTigerDirection, -0.48);
    this.sceneFiveShellContact.y = 0.72;
    this.sceneFivePawContactDistance = this.tiger.poseFrontPawAt(this.sceneFiveShellContact, pawReach);
    if (this.sceneFivePawContactDistance === undefined || pawReach <= 0) return;
    const contactCorrection = THREE.MathUtils.clamp(
      this.sceneFivePawContactDistance - 0.018,
      0,
      0.28,
    ) * pawReach;
    this.tiger.group.position.addScaledVector(this.sceneFiveTigerDirection, contactCorrection);
    this.sceneFivePawContactDistance = this.tiger.poseFrontPawAt(this.sceneFiveShellContact, pawReach);
  }

  private positionSceneFiveTigerAtSide(progress: number): void {
    const angle = THREE.MathUtils.lerp(Math.PI * 0.5, -0.18, progress);
    this.tiger.group.position.set(
      this.tortoise.group.position.x - 2.25 - Math.cos(angle) * 1.05,
      SCENE_FOUR_TIGER_GROUND_Y,
      this.tortoise.group.position.z + Math.sin(angle) * 2.35,
    );
    this.faceTigerTowardTortoise();
  }

  private getSceneFiveKnockPulse(time: number, center: number, halfDuration: number): number {
    const distance = Math.abs(time - center);
    if (distance >= halfDuration) return 0;
    return Math.sin((1 - distance / halfDuration) * Math.PI * 0.5);
  }

  private updateSceneFiveCamera(delta: number, immediate: boolean): void {
    const tiger = this.tiger.group.position;
    const tortoise = this.tortoise.group.position;
    this.sceneFiveMidpoint.copy(tiger).lerp(tortoise, 0.53);
    this.desiredCameraTarget.copy(this.sceneFiveMidpoint);
    this.desiredCameraTarget.y = 0.72;

    let distance = 7.75;
    let height = 4.45;
    if (this.sceneFiveStage === 'objective' || this.sceneFiveStage === 'tucking') {
      this.desiredCameraTarget.lerp(tortoise, 0.28);
      distance = 7.25;
      height = 4.2;
    } else if (
      this.sceneFiveStage === 'retreating'
      || this.sceneFiveStage === 'disappointed'
      || this.sceneFiveStage === 'complete'
    ) {
      this.desiredCameraTarget.lerp(tiger, 0.2);
      distance = 8.55;
      height = 4.75;
    }

    this.desiredCameraPosition
      .copy(this.sceneFiveMidpoint)
      .addScaledVector(this.sceneFourCameraSide, distance)
      .addScaledVector(this.sceneFourPathDirection, -0.3);
    this.desiredCameraPosition.y = height;

    if (this.camera.aspect < 0.78) {
      this.cameraAway
        .copy(this.desiredCameraPosition)
        .sub(this.desiredCameraTarget)
        .normalize()
        .multiplyScalar(2.25);
      this.desiredCameraPosition.add(this.cameraAway);
      this.desiredCameraPosition.y += 0.38;
    }

    if (immediate) {
      this.camera.position.copy(this.desiredCameraPosition);
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      const amount = 1 - Math.exp(-delta * 1.75);
      this.camera.position.lerp(this.desiredCameraPosition, amount);
      this.cameraTarget.lerp(this.desiredCameraTarget, amount);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private updateSceneFiveB(delta: number): void {
    this.sceneFiveBStageElapsed += delta;
    this.faceTigerTowardTortoise();

    if (this.sceneFiveBStage === 'approaching') {
      const progress = THREE.MathUtils.smoothstep(
        this.sceneFiveBStageElapsed,
        0,
        SCENE_FIVE_B_APPROACH_DURATION,
      );
      this.tiger.group.position.lerpVectors(
        this.sceneFiveBApproachStart,
        this.sceneFiveBAttackPosition,
        progress,
      );
      this.tiger.group.position.y = SCENE_FOUR_TIGER_GROUND_Y;
      this.faceTigerTowardTortoise();
      if (progress >= 1) this.setSceneFiveBStage('pushing');
    } else if (this.sceneFiveBStage === 'pushing') {
      const reachIn = THREE.MathUtils.smoothstep(this.sceneFiveBStageElapsed, 0.08, 0.48);
      const release = 1 - THREE.MathUtils.smoothstep(
        this.sceneFiveBStageElapsed,
        SCENE_FIVE_B_PUSH_DURATION - 0.42,
        SCENE_FIVE_B_PUSH_DURATION,
      );
      this.updateSceneFiveBPushContact(reachIn * release);
      if (this.sceneFiveBStageElapsed >= SCENE_FIVE_B_PUSH_DURATION) {
        this.setSceneFiveBStage('biting');
      }
    } else if (this.sceneFiveBStage === 'biting') {
      const reachIn = THREE.MathUtils.smoothstep(this.sceneFiveBStageElapsed, 0.32, 1.15);
      const release = 1 - THREE.MathUtils.smoothstep(this.sceneFiveBStageElapsed, 2.3, 3.05);
      const biteReach = reachIn * release;
      this.sceneFiveTigerDirection
        .copy(this.tortoise.group.position)
        .sub(this.sceneFiveBBiteStart)
        .setY(0)
        .normalize();
      this.tiger.group.position
        .copy(this.sceneFiveBBiteStart)
        .addScaledVector(this.sceneFiveTigerDirection, biteReach * 0.3);
      this.tiger.group.position.y = SCENE_FOUR_TIGER_GROUND_Y;
      this.faceTigerTowardTortoise();
      this.sceneFiveShellContact
        .copy(this.tortoise.group.position)
        .addScaledVector(this.sceneFiveTigerDirection, -0.46);
      this.sceneFiveShellContact.y = 0.92;
      // Keep the exported neck and head tracks untouched. The whole tiger
      // eases forward slightly while the authored bite clip does the acting.
      this.sceneFiveBBiteDistance = this.tiger.getBoneDistanceTo(
        'lower_jaw',
        this.sceneFiveShellContact,
      );
      if (this.sceneFiveBStageElapsed >= SCENE_FIVE_B_BITE_DURATION) {
        this.setSceneFiveBStage('narrator');
      }
    } else if (this.sceneFiveBStage === 'annoyed') {
      if (this.sceneFiveBStageElapsed >= SCENE_FIVE_B_ANNOYED_DURATION) {
        this.setSceneFiveBStage('tiger-complaint');
      }
    } else if (this.sceneFiveBStage === 'peeking') {
      if (this.sceneFiveBStageElapsed >= SCENE_FIVE_B_PEEK_DURATION) {
        this.setSceneFiveBStage('tortoise-reply');
      }
    } else if (this.sceneFiveBStage === 'scratching') {
      if (this.sceneFiveBStageElapsed >= SCENE_FIVE_B_SCRATCH_DURATION) {
        this.setSceneFiveBStage('tiger-question');
      }
    } else if (this.sceneFiveBStage === 'thinking') {
      if (this.sceneFiveBStageElapsed >= SCENE_FIVE_B_THINK_DURATION) {
        this.setSceneFiveBStage('complete');
      }
    }

    this.updateSceneFiveBCamera(delta, false);
  }

  private setSceneFiveBStage(stage: SceneFiveBStage): void {
    if (this.sceneFiveBStage === stage) return;
    this.sceneFiveBStage = stage;
    this.sceneFiveBStageElapsed = 0;
    this.ui.reset();
    this.tiger.clearPawTarget();
    this.sceneFivePawContactDistance = undefined;

    if (stage === 'pushing') {
      this.tiger.group.position.copy(this.sceneFiveBAttackPosition);
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.2, 0.84);
    } else if (stage === 'biting') {
      this.sceneFiveBBiteStart.copy(this.tiger.group.position);
      this.tiger.playAnimationOnce(TIGER_ANIMATIONS.bite, 0.22, 1.08, true);
    } else if (stage === 'narrator') {
      this.tiger.group.position.copy(this.sceneFiveBBiteStart);
      this.ui.showNarrator(SCENE_FIVE_B_NARRATION, () => {
        if (this.activeScene === 'scene-5b') this.setSceneFiveBStage('annoyed');
      });
    } else if (stage === 'annoyed') {
      this.tiger.playAnimationOnce(TIGER_ANIMATIONS.disappointed, 0.26, 1.06, true);
    } else if (stage === 'tiger-complaint') {
      this.ui.showDialogue('Tiger', SCENE_FIVE_B_TIGER_COMPLAINT, () => {
        if (this.activeScene === 'scene-5b') this.setSceneFiveBStage('peeking');
      });
    } else if (stage === 'peeking') {
      this.tortoise.setFullyHidden(false);
      this.tortoise.setPeekOnly(true);
      this.tortoise.playAnimationOnce(TORTOISE_ANIMATIONS.peek, 0.18, 0.92, true);
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.28, 0.76);
    } else if (stage === 'tortoise-reply') {
      this.ui.showDialogue('Tortoise', SCENE_FIVE_B_TORTOISE_REPLY, () => {
        if (this.activeScene === 'scene-5b') this.setSceneFiveBStage('scratching');
      });
    } else if (stage === 'scratching') {
      // The rig has no convincing quadruped head-scratch clip. A quiet,
      // puzzled breathing pause reads naturally without forcing the foreleg.
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.48, 0.68);
    } else if (stage === 'tiger-question') {
      this.ui.showDialogue('Tiger', SCENE_FIVE_B_TIGER_QUESTION, () => {
        if (this.activeScene === 'scene-5b') this.setSceneFiveBStage('thinking');
      });
    } else if (stage === 'thinking') {
      const riverDirection = Math.sign(
        this.world.riverCenterAt(this.tortoise.group.position.z) - this.tortoise.group.position.x,
      );
      this.tortoise.setThinkingPose(riverDirection * 0.13, true);
    } else if (stage === 'complete') {
      const riverDirection = Math.sign(
        this.world.riverCenterAt(this.tortoise.group.position.z) - this.tortoise.group.position.x,
      );
      this.tortoise.setThinkingPose(riverDirection * 0.13, true);
      this.queueStoryScene('scene-6', 0.5);
    }
  }

  private updateSceneFiveBCamera(delta: number, immediate: boolean): void {
    const tiger = this.tiger.group.position;
    const tortoise = this.tortoise.group.position;
    this.sceneFiveMidpoint.copy(tiger).lerp(tortoise, 0.53);
    this.desiredCameraTarget.copy(this.sceneFiveMidpoint);
    this.desiredCameraTarget.y = 0.82;

    let distance = 7.5;
    let height = 4.25;
    if (this.sceneFiveBStage === 'approaching') {
      const continuityProgress = THREE.MathUtils.smoothstep(
        this.sceneFiveBStageElapsed,
        0,
        SCENE_FIVE_B_APPROACH_DURATION,
      );
      this.desiredCameraTarget.y = THREE.MathUtils.lerp(0.72, 0.82, continuityProgress);
      this.desiredCameraTarget.lerp(tiger, THREE.MathUtils.lerp(0.2, 0, continuityProgress));
      distance = THREE.MathUtils.lerp(8.55, 7.5, continuityProgress);
      height = THREE.MathUtils.lerp(4.75, 4.25, continuityProgress);
    } else if (
      this.sceneFiveBStage === 'tiger-complaint'
      || this.sceneFiveBStage === 'scratching'
      || this.sceneFiveBStage === 'tiger-question'
      || this.sceneFiveBStage === 'annoyed'
    ) {
      this.desiredCameraTarget.lerp(tiger, 0.43);
      distance = 6.9;
      height = 3.85;
    } else if (this.sceneFiveBStage === 'peeking' || this.sceneFiveBStage === 'tortoise-reply') {
      this.desiredCameraTarget.lerp(tortoise, 0.45);
      distance = 6.7;
      height = 3.7;
    }

    if (this.sceneFiveBStage === 'thinking' || this.sceneFiveBStage === 'complete') {
      this.desiredCameraTarget.copy(tortoise);
      this.desiredCameraTarget.y = 0.96;
      this.sceneFiveTigerDirection.set(
        this.sceneFiveBTigerToShell.z,
        0,
        -this.sceneFiveBTigerToShell.x,
      );
      this.desiredCameraPosition
        .copy(tortoise)
        .addScaledVector(this.sceneFiveBTigerToShell, 0.48)
        .addScaledVector(this.sceneFiveTigerDirection, 3.18);
      this.desiredCameraPosition.y = 2.14;
    } else {
      this.desiredCameraPosition
        .copy(this.sceneFiveMidpoint)
        .addScaledVector(this.sceneFourCameraSide, distance)
        .addScaledVector(this.sceneFourPathDirection, -0.3);
      this.desiredCameraPosition.y = height;
    }

    if (this.camera.aspect < 0.78) {
      this.cameraAway
        .copy(this.desiredCameraPosition)
        .sub(this.desiredCameraTarget)
        .normalize()
        .multiplyScalar(this.sceneFiveBStage === 'thinking' || this.sceneFiveBStage === 'complete' ? 1.2 : 2.15);
      this.desiredCameraPosition.add(this.cameraAway);
      this.desiredCameraPosition.y += 0.35;
    }

    if (immediate) {
      this.camera.position.copy(this.desiredCameraPosition);
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      const amount = 1 - Math.exp(-delta * 1.7);
      this.camera.position.lerp(this.desiredCameraPosition, amount);
      this.cameraTarget.lerp(this.desiredCameraTarget, amount);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private updateSceneSix(delta: number): void {
    this.sceneSixStageElapsed += delta;
    this.sceneFiveShellContact.set(
      this.tortoise.group.position.x + 0.04,
      this.tortoise.group.position.y + 2.05,
      this.tortoise.group.position.z - 0.04,
    );
    this.ideaSparkle.setOrigin(this.sceneFiveShellContact);

    if (this.sceneSixStage === 'pause' && this.sceneSixStageElapsed >= SCENE_SIX_PAUSE_DURATION) {
      this.setSceneSixStage('tortoise-river');
    } else if (this.sceneSixStage === 'tiger-thinks') {
      const progress = THREE.MathUtils.clamp(
        this.sceneSixStageElapsed / SCENE_SIX_THINK_DURATION,
        0,
        1,
      );
      let yaw = this.sceneSixTigerRiverYaw;
      if (progress < 0.36) {
        yaw = lerpAngle(
          this.sceneSixTigerFacingYaw,
          this.sceneSixTigerRiverYaw,
          THREE.MathUtils.smoothstep(progress, 0, 0.36),
        );
      } else if (progress > 0.62) {
        yaw = lerpAngle(
          this.sceneSixTigerRiverYaw,
          this.sceneSixTigerFacingYaw,
          THREE.MathUtils.smoothstep(progress, 0.62, 1),
        );
      }
      this.tiger.group.rotation.y = yaw;
      if (progress >= 1) this.setSceneSixStage('complete');
    }

    this.updateSceneSixCamera(delta, false);
  }

  private setSceneSixStage(stage: SceneSixStage): void {
    if (this.sceneSixStage === stage) return;
    this.sceneSixStage = stage;
    this.sceneSixStageElapsed = 0;
    this.ui.reset();

    if (stage === 'narrator') {
      this.ideaSparkle.setVisible(true);
      this.ui.showNarrator(SCENE_SIX_NARRATION, () => {
        if (this.activeScene === 'scene-6') this.setSceneSixStage('tortoise-way');
      });
    } else if (stage === 'tortoise-way') {
      this.ui.showDialogue('Tortoise', SCENE_SIX_TORTOISE_WAY, () => {
        if (this.activeScene === 'scene-6') this.setSceneSixStage('tiger-interest');
      });
    } else if (stage === 'tiger-interest') {
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.45, 0.82);
      this.ui.showDialogue('Tiger', SCENE_SIX_TIGER_INTEREST, () => {
        if (this.activeScene === 'scene-6') this.setSceneSixStage('tortoise-sun');
      });
    } else if (stage === 'tortoise-sun') {
      this.ui.showDialogue('Tortoise', SCENE_SIX_TORTOISE_SUN, () => {
        if (this.activeScene === 'scene-6') this.setSceneSixStage('pause');
      });
    } else if (stage === 'tortoise-river') {
      this.ui.showDialogue('Tortoise', SCENE_SIX_TORTOISE_RIVER, () => {
        if (this.activeScene === 'scene-6') this.setSceneSixStage('tiger-thinks');
      });
    } else if (stage === 'tiger-thinks') {
      this.ideaSparkle.setVisible(false);
    } else if (stage === 'complete') {
      this.queueStoryScene('scene-7', 0.5);
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.5, 0.68);
      this.ideaSparkle.setVisible(false);
      this.tiger.group.rotation.y = this.sceneSixTigerFacingYaw;
    }
  }

  private updateSceneSixCamera(delta: number, immediate: boolean): void {
    const tortoise = this.tortoise.group.position;
    const tiger = this.tiger.group.position;
    const tigerShot = this.sceneSixStage === 'tiger-interest' || this.sceneSixStage === 'tiger-thinks';

    if (tigerShot) {
      this.sceneFiveMidpoint.copy(tiger).lerp(tortoise, 0.55);
      this.desiredCameraTarget.copy(this.sceneFiveMidpoint).lerp(tiger, 0.38);
      this.desiredCameraTarget.y = 1.05;
      this.desiredCameraPosition
        .copy(this.sceneFiveMidpoint)
        .addScaledVector(this.sceneFourCameraSide, 6.65)
        .addScaledVector(this.sceneFourPathDirection, -0.25);
      this.desiredCameraPosition.y = 3.75;
    } else {
      this.sceneFiveTigerDirection.set(
        -this.sceneSixRiverDirection.z,
        0,
        this.sceneSixRiverDirection.x,
      );
      this.desiredCameraTarget.copy(tortoise);
      this.desiredCameraTarget.y = 1;
      this.desiredCameraPosition
        .copy(tortoise)
        .addScaledVector(this.sceneSixRiverDirection, -1.05)
        .addScaledVector(this.sceneFiveTigerDirection, 2.75);
      this.desiredCameraPosition.y = 2.35;
    }

    if (this.camera.aspect < 0.78) {
      this.cameraAway
        .copy(this.desiredCameraPosition)
        .sub(this.desiredCameraTarget)
        .normalize()
        .multiplyScalar(1.45);
      this.desiredCameraPosition.add(this.cameraAway);
      this.desiredCameraPosition.y += 0.3;
    }

    if (immediate) {
      this.camera.position.copy(this.desiredCameraPosition);
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      const amount = 1 - Math.exp(-delta * 1.55);
      this.camera.position.lerp(this.desiredCameraPosition, amount);
      this.cameraTarget.lerp(this.desiredCameraTarget, amount);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private updateSceneSeven(delta: number): void {
    this.sceneSevenStageElapsed += delta;

    if (this.sceneSevenStage === 'holding-laugh') {
      const settle = 1 - THREE.MathUtils.smoothstep(
        this.sceneSevenStageElapsed,
        SCENE_SEVEN_LAUGH_DURATION * 0.62,
        SCENE_SEVEN_LAUGH_DURATION,
      );
      this.tortoise.group.rotation.y = this.sceneSevenTortoiseBaseYaw
        + Math.sin(this.sceneSevenStageElapsed * 7.5) * 0.045 * settle;
      if (this.sceneSevenStageElapsed >= SCENE_SEVEN_LAUGH_DURATION) {
        this.setSceneSevenStage('narrator');
      }
    } else if (this.sceneSevenStage === 'pickup-camera') {
      if (this.sceneSevenStageElapsed >= SCENE_SEVEN_CAMERA_SETUP_DURATION) {
        this.setSceneSevenStage('pickup');
      }
    } else if (this.sceneSevenStage === 'pickup') {
      const tigerProgress = THREE.MathUtils.smoothstep(this.sceneSevenStageElapsed, 0, 1.15);
      const pickupProgress = THREE.MathUtils.smoothstep(this.sceneSevenStageElapsed, 0.52, 3.05);
      this.tiger.group.position.lerpVectors(
        this.sceneSevenTigerPickupStart,
        this.sceneSevenTigerPickupEnd,
        tigerProgress,
      );
      this.tortoise.group.position.lerpVectors(
        this.sceneSevenTortoisePickupStart,
        this.sceneSevenTortoisePickupEnd,
        pickupProgress,
      );
      this.tortoise.group.position.y += Math.sin(pickupProgress * Math.PI) * 0.16;
      if (this.sceneSevenStageElapsed >= 0.52) {
        this.tortoise.setFullyHidden(true);
        this.tortoise.setGrounded(false);
      }
      this.faceTigerTowardTortoise();
      if (this.sceneSevenStageElapsed >= SCENE_SEVEN_PICKUP_DURATION) {
        this.setSceneSevenStage('pickup-reveal');
      }
    } else if (this.sceneSevenStage === 'pickup-reveal') {
      if (this.sceneSevenStageElapsed >= SCENE_SEVEN_REVEAL_DURATION) {
        this.setSceneSevenStage('complete');
      }
    }

    this.updateSceneSevenCamera(delta, false);
  }

  private setSceneSevenStage(stage: SceneSevenStage): void {
    if (this.sceneSevenStage === stage) return;
    this.sceneSevenStage = stage;
    this.sceneSevenStageElapsed = 0;
    this.ui.reset();

    if (stage === 'tiger-proud') {
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.5, 0.82);
      this.ui.showDialogue('Tiger', SCENE_SEVEN_TIGER_PROUD, () => {
        if (this.activeScene === 'scene-7') this.setSceneSevenStage('tortoise-flatter');
      });
    } else if (stage === 'tortoise-flatter') {
      this.tortoise.setThinkingPose(0.13, true);
      this.ui.showDialogue('Tortoise', SCENE_SEVEN_TORTOISE_FLATTER, () => {
        if (this.activeScene === 'scene-7') this.setSceneSevenStage('holding-laugh');
      });
    } else if (stage === 'holding-laugh') {
      this.sceneSevenTortoiseBaseYaw = this.tortoise.group.rotation.y;
    } else if (stage === 'narrator') {
      this.tortoise.group.rotation.y = this.sceneSevenTortoiseBaseYaw;
      this.ui.showNarrator(SCENE_SEVEN_NARRATION, () => {
        if (this.activeScene === 'scene-7') this.setSceneSevenStage('pickup-camera');
      });
    } else if (stage === 'pickup-camera') {
      this.sceneSevenPickupDirection
        .copy(this.tortoise.group.position)
        .sub(this.tiger.group.position)
        .setY(0)
        .normalize();
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.45, 0.64);
    } else if (stage === 'pickup') {
      this.sceneSevenTigerPickupStart.copy(this.tiger.group.position);
      this.sceneSevenTortoisePickupStart.copy(this.tortoise.group.position);
      this.sceneSevenPickupDirection
        .copy(this.tortoise.group.position)
        .sub(this.tiger.group.position)
        .setY(0)
        .normalize();
      this.sceneSevenTigerPickupEnd
        .copy(this.sceneSevenTigerPickupStart)
        .addScaledVector(this.sceneSevenPickupDirection, 0.32);
      this.sceneSevenTigerPickupEnd.y = SCENE_FOUR_TIGER_GROUND_Y;
      this.sceneSevenTortoisePickupEnd
        .copy(this.sceneSevenTigerPickupEnd)
        .addScaledVector(this.sceneSevenPickupDirection, 1.88);
      // Hold the shell below the muzzle rather than pushing it through the
      // tiger's face. Both imported rigs remain untouched during the lift.
      this.sceneSevenTortoisePickupEnd.y = 0.38;
      this.tortoise.setPeekOnly(false);
      this.tortoise.playAnimationOnce(TORTOISE_ANIMATIONS.tuck, 0.38, 0.82, true);
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.5, 0.64);
    } else if (stage === 'pickup-reveal') {
      this.tiger.group.position.copy(this.sceneSevenTigerPickupEnd);
      this.tortoise.group.position.copy(this.sceneSevenTortoisePickupEnd);
      this.tortoise.setFullyHidden(true);
      this.tortoise.setGrounded(false);
      this.faceTigerTowardTortoise();
      this.queueStoryScene('scene-8', 0.5);
    } else if (stage === 'complete') {
      this.tiger.group.position.copy(this.sceneSevenTigerPickupEnd);
      this.tortoise.group.position.copy(this.sceneSevenTortoisePickupEnd);
      this.tortoise.setFullyHidden(true);
      this.tortoise.setGrounded(false);
      this.faceTigerTowardTortoise();
    }
  }

  private updateSceneSevenCamera(delta: number, immediate: boolean): void {
    const tortoise = this.tortoise.group.position;
    const tiger = this.tiger.group.position;

    if (this.sceneSevenStage === 'pickup-camera' || this.sceneSevenStage === 'pickup') {
      this.desiredCameraTarget
        .copy(tiger)
        .addScaledVector(this.sceneSevenPickupDirection, 1.2);
      this.desiredCameraTarget.y = 1.08;
      this.desiredCameraPosition
        .copy(tiger)
        .addScaledVector(this.sceneSevenPickupDirection, -5.2);
      this.desiredCameraPosition.y = 2.72;

      if (this.camera.aspect < 0.78) {
        this.desiredCameraPosition.addScaledVector(this.sceneSevenPickupDirection, -1.25);
        this.desiredCameraPosition.y += 0.2;
      }

      if (immediate) {
        this.camera.position.copy(this.desiredCameraPosition);
        this.cameraTarget.copy(this.desiredCameraTarget);
      } else {
        const amount = 1 - Math.exp(-delta * 2.2);
        this.camera.position.lerp(this.desiredCameraPosition, amount);
        this.cameraTarget.lerp(this.desiredCameraTarget, amount);
      }
      this.camera.lookAt(this.cameraTarget);
      return;
    }

    this.sceneFiveMidpoint.copy(tiger).lerp(tortoise, 0.52);
    this.desiredCameraTarget.copy(this.sceneFiveMidpoint);
    this.desiredCameraTarget.y = this.sceneSevenStage === 'pickup-reveal' || this.sceneSevenStage === 'complete'
      ? 1.02
      : 0.92;

    let distance = 7.1;
    let height = 4.05;
    if (this.sceneSevenStage === 'tiger-proud') {
      this.desiredCameraTarget.lerp(tiger, 0.42);
      distance = 6.75;
      height = 3.82;
    } else if (this.sceneSevenStage === 'tortoise-flatter' || this.sceneSevenStage === 'holding-laugh') {
      this.desiredCameraTarget.lerp(tortoise, 0.48);
      distance = 6.55;
      height = 3.68;
    } else if (this.sceneSevenStage === 'pickup-reveal' || this.sceneSevenStage === 'complete') {
      distance = 6.35;
      height = 3.55;
    }

    this.desiredCameraPosition
      .copy(this.sceneFiveMidpoint)
      .addScaledVector(this.sceneFourCameraSide, distance)
      .addScaledVector(this.sceneFourPathDirection, -0.28);
    this.desiredCameraPosition.y = height;

    if (this.camera.aspect < 0.78) {
      this.cameraAway
        .copy(this.desiredCameraPosition)
        .sub(this.desiredCameraTarget)
        .normalize()
        .multiplyScalar(1.9);
      this.desiredCameraPosition.add(this.cameraAway);
      this.desiredCameraPosition.y += 0.34;
    }

    if (immediate) {
      this.camera.position.copy(this.desiredCameraPosition);
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      const amount = 1 - Math.exp(-delta * 1.6);
      this.camera.position.lerp(this.desiredCameraPosition, amount);
      this.cameraTarget.lerp(this.desiredCameraTarget, amount);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private updateSceneEight(delta: number): void {
    this.sceneEightStageElapsed += delta;
    const progress = THREE.MathUtils.clamp(this.sceneElapsed / SCENE_EIGHT_DURATION, 0, 1);
    const travel = THREE.MathUtils.smoothstep(progress, 0, 1);
    this.tiger.group.position.lerpVectors(this.sceneEightTigerStart, this.sceneEightTigerEnd, travel);
    this.tiger.group.position.y = SCENE_FOUR_TIGER_GROUND_Y;
    this.tiger.group.rotation.y = this.getTigerYawForDirection(
      this.sceneEightDirection.x,
      this.sceneEightDirection.z,
    );
    const tigerIsMoving = progress < 0.999 && this.sceneEightStage !== 'complete';
    this.updateSceneEightCarryPose(progress, tigerIsMoving);

    if (this.sceneEightStage === 'walking' && this.sceneElapsed >= SCENE_EIGHT_TIGER_SOFT_AT) {
      this.setSceneEightStage('tiger-soft');
    } else if (this.sceneEightStage === 'tiger-soft' && this.sceneElapsed >= SCENE_EIGHT_TIGER_PROUD_AT) {
      this.setSceneEightStage('tiger-proud');
    } else if (this.sceneEightStage === 'tiger-proud' && this.sceneElapsed >= SCENE_EIGHT_TORTOISE_CLOSE_AT) {
      this.setSceneEightStage('tortoise-close');
    } else if (this.sceneEightStage === 'tortoise-close' && this.sceneElapsed >= SCENE_EIGHT_ARRIVING_AT) {
      this.setSceneEightStage('arriving');
    } else if (this.sceneEightStage === 'arriving' && progress >= 1) {
      this.setSceneEightStage('complete');
    }

    this.updateSceneEightCamera(delta, false);
  }

  private setSceneEightStage(stage: SceneEightStage): void {
    if (this.sceneEightStage === stage) return;
    this.sceneEightStage = stage;
    this.sceneEightStageElapsed = 0;
    if (stage === 'tiger-soft') {
      this.shellUi.showSecondaryDialogue('Tiger', SCENE_EIGHT_TIGER_SOFT);
    } else if (stage === 'tiger-proud') {
      this.shellUi.showSecondaryDialogue('Tiger', SCENE_EIGHT_TIGER_PROUD);
    } else if (stage === 'tortoise-close') {
      this.tortoise.setFullyHidden(false);
      this.tortoise.setPeekOnly(true);
      this.tortoise.playAnimationOnce(
        TORTOISE_ANIMATIONS.peek,
        0,
        SCENE_EIGHT_TORTOISE_PEEK_SPEED,
        true,
      );
      this.tortoise.setThinkingPose(0.05, true);
      this.shellUi.showSecondaryDialogue('Tortoise', SCENE_EIGHT_TORTOISE_CLOSE);
    } else if (stage === 'arriving') {
      this.shellUi.hideSecondaryDialogue();
      this.tortoise.setCurrentAnimationProgress(SCENE_EIGHT_TORTOISE_PEEK_PROGRESS);
      this.tiger.playAnimation(TIGER_ANIMATIONS.walk, 0.35, 0.48);
    } else if (stage === 'complete') {
      this.shellUi.hideSecondaryDialogue();
      this.tiger.group.position.copy(this.sceneEightTigerEnd);
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.45, 0.66);
      this.updateSceneEightCarryPose(1, false);
      this.queueStoryScene('scene-9', 0.45);
    }
  }

  private updateSceneEightCamera(delta: number, immediate: boolean): void {
    this.desiredCameraTarget.copy(this.tiger.group.position).lerp(this.tortoise.group.position, 0.42);
    this.desiredCameraTarget.y = 0.98;
    this.desiredCameraPosition
      .copy(this.tiger.group.position)
      .addScaledVector(this.sceneEightCameraSide, 7.2)
      .addScaledVector(this.sceneEightDirection, -0.45);
    this.desiredCameraPosition.y = 3.75;

    if (this.camera.aspect < 0.78) {
      this.desiredCameraPosition.addScaledVector(this.sceneEightCameraSide, 2.25);
      this.desiredCameraPosition.y += 0.65;
      this.desiredCameraTarget.addScaledVector(this.sceneEightDirection, 0.45);
    }

    if (immediate) {
      this.camera.position.copy(this.desiredCameraPosition);
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      const amount = 1 - Math.exp(-delta * 1.75);
      this.camera.position.lerp(this.desiredCameraPosition, amount);
      this.cameraTarget.lerp(this.desiredCameraTarget, amount);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private updateSceneNine(delta: number): void {
    this.sceneNineStageElapsed += delta;
    this.updateSceneEightCarryPose(1, false);
    this.updateSceneNineCamera(delta, false);
  }

  private setSceneNineStage(stage: SceneNineStage): void {
    if (this.sceneNineStage === stage) return;
    this.sceneNineStage = stage;
    this.sceneNineStageElapsed = 0;
    this.ui.reset();
    if (stage === 'tiger-arrival') {
      this.ui.showDialogue('Tiger', SCENE_NINE_TIGER_ARRIVAL, () => {
        if (this.activeScene === 'scene-9') this.setSceneNineStage('tortoise-deep');
      });
    } else if (stage === 'tortoise-deep') {
      this.tortoise.setThinkingPose(0.16, true);
      this.ui.showDialogue('Tortoise', SCENE_NINE_TORTOISE_DEEP, () => {
        if (this.activeScene === 'scene-9') this.setSceneNineStage('tiger-question');
      });
    } else if (stage === 'tiger-question') {
      this.ui.showDialogue('Tiger', SCENE_NINE_TIGER_QUESTION, () => {
        if (this.activeScene === 'scene-9') this.setSceneNineStage('tortoise-explain');
      });
    } else if (stage === 'tortoise-explain') {
      this.tortoise.setThinkingPose(0.18, true);
      this.ui.showDialogue('Tortoise', SCENE_NINE_TORTOISE_EXPLAIN, () => {
        if (this.activeScene === 'scene-9') this.setSceneNineStage('tiger-agrees');
      });
    } else if (stage === 'tiger-agrees') {
      this.ui.showDialogue('Tiger', SCENE_NINE_TIGER_AGREES, () => {
        if (this.activeScene === 'scene-9') this.setSceneNineStage('complete');
      });
    } else if (stage === 'complete') {
      this.queueStoryScene('scene-10', 0.45);
    }
  }

  private updateSceneNineCamera(delta: number, immediate: boolean): void {
    const tortoiseFocus = this.sceneNineStage === 'tortoise-deep'
      || this.sceneNineStage === 'tortoise-explain';
    this.desiredCameraTarget.copy(this.tiger.group.position).lerp(
      this.tortoise.group.position,
      tortoiseFocus ? 0.72 : 0.28,
    );
    this.desiredCameraTarget.y = tortoiseFocus ? 0.82 : 1.14;
    this.desiredCameraPosition
      .copy(this.tiger.group.position)
      .addScaledVector(this.sceneEightCameraSide, tortoiseFocus ? 6.15 : 6.55)
      .addScaledVector(this.sceneEightDirection, tortoiseFocus ? 0.35 : -0.35);
    this.desiredCameraPosition.y = tortoiseFocus ? 3.18 : 3.48;

    if (this.camera.aspect < 0.78) {
      this.desiredCameraPosition.addScaledVector(this.sceneEightCameraSide, 2.15);
      this.desiredCameraPosition.y += 0.55;
    }

    if (immediate) {
      this.camera.position.copy(this.desiredCameraPosition);
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      const amount = 1 - Math.exp(-delta * 1.7);
      this.camera.position.lerp(this.desiredCameraPosition, amount);
      this.cameraTarget.lerp(this.desiredCameraTarget, amount);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private updateSceneTen(delta: number): void {
    this.sceneTenStageElapsed += delta;

    if (this.sceneTenStage === 'settling') {
      this.tiger.setThrowPose(0);
      this.updateSceneEightCarryPose(1, false);
      if (this.sceneTenStageElapsed >= SCENE_TEN_SETTLE_DURATION) {
        this.setSceneTenStage('backswing');
      }
    } else if (this.sceneTenStage === 'backswing') {
      const progress = THREE.MathUtils.smoothstep(
        this.sceneTenStageElapsed,
        0,
        SCENE_TEN_BACKSWING_DURATION,
      );
      this.tiger.setThrowPose(THREE.MathUtils.lerp(0, -0.46, progress));
      this.tortoise.group.position.lerpVectors(this.sceneTenThrowStart, this.sceneTenBackswing, progress);
      this.tortoise.group.rotation.z = this.sceneTenFlightBaseRoll - progress * 0.22;
      if (this.sceneTenStageElapsed >= SCENE_TEN_BACKSWING_DURATION) {
        this.setSceneTenStage('forward-swing');
      }
    } else if (this.sceneTenStage === 'forward-swing') {
      const progress = THREE.MathUtils.clamp(
        this.sceneTenStageElapsed / SCENE_TEN_FORWARD_SWING_DURATION,
        0,
        1,
      );
      const releaseMotion = progress * progress;
      const neckMotion = THREE.MathUtils.smoothstep(progress, 0, 1);
      this.tiger.setThrowPose(THREE.MathUtils.lerp(-0.46, 1, neckMotion));
      this.tortoise.group.position.lerpVectors(
        this.sceneTenBackswing,
        this.sceneTenRelease,
        releaseMotion,
      );
      this.tortoise.group.rotation.z = THREE.MathUtils.lerp(
        this.sceneTenFlightBaseRoll - 0.22,
        this.sceneTenFlightBaseRoll + 0.12,
        releaseMotion,
      );
      if (this.sceneTenStageElapsed >= SCENE_TEN_FORWARD_SWING_DURATION) {
        this.setSceneTenStage('flight');
      }
    } else if (this.sceneTenStage === 'flight') {
      const progress = THREE.MathUtils.clamp(
        this.sceneTenStageElapsed / SCENE_TEN_FLIGHT_DURATION,
        0,
        1,
      );
      const followThrough = 1 - THREE.MathUtils.smoothstep(progress, 0, 0.32);
      this.tiger.setThrowPose(followThrough);
      this.sceneTenArcPoint.lerpVectors(this.sceneTenRelease, this.sceneTenSplashPoint, progress);
      this.sceneTenArcPoint.y += Math.sin(progress * Math.PI) * 3.05;
      this.tortoise.group.position.copy(this.sceneTenArcPoint);
      this.tortoise.group.rotation.x = Math.sin(progress * Math.PI) * 0.16;
      this.tortoise.group.rotation.y = this.sceneTenFlightBaseYaw + progress * 0.24;
      this.tortoise.group.rotation.z = this.sceneTenFlightBaseRoll + 0.12 - progress * 0.58;
      if (this.sceneTenStageElapsed >= SCENE_TEN_FLIGHT_DURATION) {
        this.setSceneTenStage('splash');
      }
    } else if (this.sceneTenStage === 'splash') {
      this.tiger.setThrowPose(0);
      if (this.sceneTenStageElapsed >= SCENE_TEN_SPLASH_DURATION) {
        this.setSceneTenStage('waiting');
      }
    } else if (this.sceneTenStage === 'waiting') {
      this.tiger.setThrowPose(0);
      if (this.sceneTenStageElapsed >= SCENE_TEN_WAIT_DURATION) {
        this.setSceneTenStage('complete');
      }
    }

    this.updateSceneTenCamera(delta, false);
  }

  private setSceneTenStage(stage: SceneTenStage): void {
    if (this.sceneTenStage === stage) return;
    this.sceneTenStage = stage;
    this.sceneTenStageElapsed = 0;
    if (stage === 'backswing') {
      this.sceneTenThrowStart.copy(this.tortoise.group.position);
      this.sceneTenBackswing
        .copy(this.sceneTenThrowStart)
        .addScaledVector(this.sceneTenThrowDirection, -0.72);
      this.sceneTenBackswing.y += 0.2;
    } else if (stage === 'flight') {
      this.tortoise.setFullyHidden(false);
      this.tortoise.setPeekOnly(true);
      this.tortoise.setThinkingPose(0.12, true);
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.32, 0.68);
      this.tortoise.group.position.copy(this.sceneTenRelease);
    } else if (stage === 'splash') {
      this.tiger.setThrowPose(0);
      this.tortoise.group.position.copy(this.sceneTenSplashPoint);
      this.tortoise.group.visible = false;
      this.riverSplash.trigger(this.sceneTenSplashPoint);
      this.shellUi.showSoundEffect('SPLASH!');
      this.audio.playSplash();
    } else if (stage === 'complete') {
      this.queueStoryScene('scene-11', 0.35);
      this.shellUi.hideSecondaryDialogue();
    } else if (stage === 'waiting') {
      this.tiger.setThrowPose(0);
      this.shellUi.hideSecondaryDialogue();
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.45, 0.72);
    }
  }

  private updateSceneTenCamera(delta: number, immediate: boolean): void {
    const wideShot = this.sceneTenStage === 'flight'
      || this.sceneTenStage === 'splash'
      || this.sceneTenStage === 'waiting'
      || this.sceneTenStage === 'complete';
    this.desiredCameraTarget.copy(this.tiger.group.position).lerp(
      this.sceneTenSplashPoint,
      wideShot ? 0.48 : 0.34,
    );
    this.desiredCameraTarget.y = wideShot ? 1.28 : 1.05;
    this.desiredCameraPosition
      .copy(this.desiredCameraTarget)
      .addScaledVector(this.sceneTenCameraSide, wideShot ? 11.35 : 8.15)
      .addScaledVector(this.sceneTenThrowDirection, -0.45);
    this.desiredCameraPosition.y = wideShot ? 4.85 : 4.05;

    if (this.camera.aspect < 0.78) {
      this.desiredCameraPosition.addScaledVector(this.sceneTenCameraSide, wideShot ? 7.1 : 3.8);
      this.desiredCameraPosition.y += wideShot ? 1.25 : 0.95;
      this.desiredCameraTarget.y += 0.18;
    }

    if (immediate) {
      this.camera.position.copy(this.desiredCameraPosition);
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      const amount = 1 - Math.exp(-delta * (wideShot ? 1.45 : 1.75));
      this.camera.position.lerp(this.desiredCameraPosition, amount);
      this.cameraTarget.lerp(this.desiredCameraTarget, amount);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private updateSceneEleven(delta: number): void {
    this.sceneElevenStageElapsed += delta;

    if (this.sceneElevenStage === 'silence') {
      if (this.sceneElevenStageElapsed >= SCENE_ELEVEN_SILENCE_DURATION) {
        this.setSceneElevenStage('tiger-wonders');
      }
    } else if (this.sceneElevenStage === 'bubble-one') {
      if (this.sceneElevenStageElapsed >= SCENE_ELEVEN_BUBBLE_DURATION) {
        this.setSceneElevenStage('bubble-two');
      }
    } else if (this.sceneElevenStage === 'bubble-two') {
      if (this.sceneElevenStageElapsed >= SCENE_ELEVEN_BUBBLE_DURATION) {
        this.setSceneElevenStage('reveal');
      }
    } else if (this.sceneElevenStage === 'reveal') {
      const progress = THREE.MathUtils.smoothstep(
        this.sceneElevenStageElapsed,
        0,
        SCENE_ELEVEN_REVEAL_DURATION,
      );
      this.tortoise.group.position.copy(this.sceneElevenRevealPoint);
      this.tortoise.group.position.y = THREE.MathUtils.lerp(-0.72, SCENE_ELEVEN_SWIM_Y, progress);
      this.tortoise.group.rotation.z = Math.sin(progress * Math.PI) * -0.08;
      if (this.sceneElevenStageElapsed >= SCENE_ELEVEN_REVEAL_DURATION) {
        this.setSceneElevenStage('tortoise-thanks');
      }
    } else if (this.sceneElevenStage === 'tiger-freezes') {
      if (this.sceneElevenStageElapsed >= SCENE_ELEVEN_FREEZE_DURATION) {
        this.setSceneElevenStage('tiger-question');
      }
    } else if (this.sceneElevenStage === 'objective') {
      if (this.sceneElevenStageElapsed >= SCENE_ELEVEN_OBJECTIVE_DURATION) {
        this.setSceneElevenStage('swimming');
      }
    } else if (this.sceneElevenStage === 'swimming') {
      this.updateRiverEscapeGameplay(delta);
    } else if (this.sceneElevenStage === 'safe-objective') {
      if (this.sceneElevenStageElapsed >= SCENE_ELEVEN_SAFE_OBJECTIVE_DURATION) {
        this.setSceneElevenStage('safe-swimming');
      }
    } else if (this.sceneElevenStage === 'safe-swimming') {
      this.updateSafeRiverGameplay(delta);
    } else if (this.sceneElevenStage === 'safe-arrival') {
      if (this.sceneElevenStageElapsed >= SCENE_ELEVEN_SAFE_ARRIVAL_DURATION) {
        this.setSceneElevenStage('safe-narrator');
      }
    } else if (this.sceneElevenStage === 'complete') {
      if (this.sceneElevenSpeechTimer > 0) {
        this.sceneElevenSpeechTimer -= delta;
        if (this.sceneElevenSpeechTimer <= 0) this.shellUi.hideSecondaryDialogue();
      }
    }

    if (this.sceneElevenTigerLookBackTimer > 0) {
      this.sceneElevenTigerLookBackTimer = Math.max(0, this.sceneElevenTigerLookBackTimer - delta);
      this.faceSceneElevenTigerTowardTortoise(delta);
    }

    if (this.sceneElevenStage !== 'swimming'
      && this.sceneElevenStage !== 'safe-swimming'
      && this.sceneElevenStage !== 'safe-arrival'
      && this.sceneElevenStage !== 'safe-narrator'
      && this.sceneElevenStage !== 'complete') {
      this.faceSceneElevenTigerTowardWater(delta);
    }
    const atSurface = this.sceneElevenStage === 'reveal'
      || this.sceneElevenStage === 'tortoise-thanks'
      || this.sceneElevenStage === 'tiger-freezes'
      || this.sceneElevenStage === 'tiger-question'
      || this.sceneElevenStage === 'tortoise-explains'
      || this.sceneElevenStage === 'objective'
      || this.sceneElevenStage === 'swimming'
      || this.sceneElevenStage === 'safe-objective'
      || this.sceneElevenStage === 'safe-swimming'
      || this.sceneElevenStage === 'safe-arrival'
      || this.sceneElevenStage === 'safe-narrator'
      || this.sceneElevenStage === 'complete';
    this.tortoiseSwimWake.setVisible(atSurface && this.tortoise.group.visible);
    this.tortoiseSwimWake.update(
      delta,
      this.tortoise.group.position,
      this.tortoise.group.rotation.y,
      this.sceneElevenStage === 'swimming' || this.sceneElevenStage === 'safe-swimming'
        ? 1
        : this.sceneElevenStage === 'safe-arrival' || this.sceneElevenStage === 'complete'
          ? 0.18
          : 0.22,
    );
    this.updateSceneElevenCamera(delta, false);
  }

  private setSceneElevenStage(stage: SceneElevenStage): void {
    if (this.sceneElevenStage === stage) return;
    this.sceneElevenStage = stage;
    this.sceneElevenStageElapsed = 0;

    if (stage === 'silence') {
      this.ui.reset();
      this.shellUi.reset();
    } else if (stage === 'tiger-wonders') {
      this.ui.showDialogue('Tiger', SCENE_ELEVEN_TIGER_WONDERS, () => {
        if (this.activeScene === 'scene-11') this.setSceneElevenStage('bubble-one');
      });
    } else if (stage === 'bubble-one' || stage === 'bubble-two') {
      this.ui.reset();
      this.sceneElevenBubblePoint.copy(this.sceneTenSplashPoint);
      if (stage === 'bubble-two') {
        this.sceneElevenBubblePoint.x += 0.38;
        this.sceneElevenBubblePoint.z -= 0.42;
      }
      this.riverStoryBubbles.trigger(this.sceneElevenBubblePoint);
      this.shellUi.showAmbientEffect('Bloop.');
    } else if (stage === 'reveal') {
      this.shellUi.hideSecondaryDialogue();
      this.tortoise.group.visible = true;
      this.tortoise.group.position.copy(this.sceneElevenRevealPoint);
      this.tortoise.group.position.y = -0.72;
      this.tortoise.group.rotation.set(0, Math.PI, 0);
    } else if (stage === 'tortoise-thanks') {
      this.tortoise.group.position.copy(this.sceneElevenRevealPoint);
      this.tortoise.group.rotation.z = 0;
      this.ui.showDialogue('Tortoise', SCENE_ELEVEN_TORTOISE_THANKS, () => {
        if (this.activeScene === 'scene-11') this.setSceneElevenStage('tiger-freezes');
      });
    } else if (stage === 'tiger-freezes') {
      this.ui.reset();
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.3, 0.38);
    } else if (stage === 'tiger-question') {
      this.ui.showDialogue('Tiger', SCENE_ELEVEN_TIGER_QUESTION, () => {
        if (this.activeScene === 'scene-11') this.setSceneElevenStage('tortoise-explains');
      });
    } else if (stage === 'tortoise-explains') {
      this.ui.showDialogue('Tortoise', SCENE_ELEVEN_TORTOISE_ESCAPE, () => {
        if (this.activeScene === 'scene-11') this.setSceneElevenStage('objective');
      });
    } else if (stage === 'objective') {
      this.ui.reset();
      this.shellUi.showObjective(SCENE_ELEVEN_OBJECTIVE);
      this.tortoise.setPeekOnly(false);
      this.tortoise.setThinkingPose(0, true);
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.walk, 0.35, 0.9);
      this.riverEscapeCourse.setVisible(true);
      // The next reach is distant scenery at this point. Reveal it with the
      // rest of the river course so its rocks and bank are already part of the
      // world when the safe-bank objective begins.
      this.safeRiverReach.setVisible(true);
      this.safeRiverReach.setSafeZoneGlowVisible(false);
      this.world.setGameplayRiverDecorVisible(false);
    } else if (stage === 'swimming') {
      this.shellUi.hideObjective();
      this.input.setMovementEnabled(true);
      this.tiger.playAnimation(TIGER_ANIMATIONS.walk, 0.38, 1.08);
    } else if (stage === 'safe-objective') {
      this.input.setMovementEnabled(false);
      this.shellUi.hideSecondaryDialogue();
      this.shellUi.showObjective(SCENE_ELEVEN_SAFE_OBJECTIVE);
      this.safeRiverReach.setVisible(true);
      this.safeRiverReach.setSafeZoneGlowVisible(true);
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.42, 0.62);
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.32, 0.82);
    } else if (stage === 'safe-swimming') {
      this.shellUi.hideObjective();
      this.input.setMovementEnabled(true);
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.walk, 0.32, 0.94);
    } else if (stage === 'safe-arrival') {
      this.input.setMovementEnabled(false);
      this.shellUi.hideObjective();
      this.shellUi.hideSecondaryDialogue();
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.38, 0.78);
      this.tortoise.group.rotation.z = 0;
    } else if (stage === 'safe-narrator') {
      this.input.setMovementEnabled(false);
      this.ui.showNarrator(SCENE_ELEVEN_SAFE_NARRATION, () => {
        if (this.activeScene !== 'scene-11') return;
        this.setSceneElevenStage('complete');
        this.queueStoryScene('scene-13', 0.55);
      });
    } else if (stage === 'complete') {
      this.input.setMovementEnabled(false);
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.42, 0.68);
      this.sceneElevenSpeechTimer = SCENE_ELEVEN_SPEECH_DURATION;
    }
  }

  private faceSceneElevenTigerTowardWater(delta: number): void {
    const target = this.sceneElevenStage === 'reveal'
      || this.sceneElevenStage === 'tortoise-thanks'
      || this.sceneElevenStage === 'tiger-freezes'
      || this.sceneElevenStage === 'tiger-question'
      || this.sceneElevenStage === 'tortoise-explains'
      || this.sceneElevenStage === 'objective'
      ? this.sceneElevenRevealPoint
      : this.sceneTenSplashPoint;
    this.sceneElevenTigerDirection.copy(target).sub(this.tiger.group.position).setY(0).normalize();
    const yaw = this.getTigerYawForDirection(
      this.sceneElevenTigerDirection.x,
      this.sceneElevenTigerDirection.z,
    );
    this.tiger.group.rotation.y = lerpAngle(
      this.tiger.group.rotation.y,
      yaw,
      delta === 0 ? 1 : 1 - Math.exp(-delta * 2.2),
    );
  }

  private faceSceneElevenTigerTowardTortoise(delta: number): void {
    this.sceneElevenTigerDirection
      .copy(this.tortoise.group.position)
      .sub(this.tiger.group.position)
      .setY(0);
    if (this.sceneElevenTigerDirection.lengthSq() < 0.0001) return;
    this.sceneElevenTigerDirection.normalize();
    const yaw = this.getTigerYawForDirection(
      this.sceneElevenTigerDirection.x,
      this.sceneElevenTigerDirection.z,
    );
    this.tiger.group.rotation.y = lerpAngle(
      this.tiger.group.rotation.y,
      yaw,
      delta === 0 ? 1 : 1 - Math.exp(-delta * 4.2),
    );
  }

  private updateRiverEscapeGameplay(delta: number): void {
    this.updateTortoiseSwimming(delta, this.riverEscapeCourse.obstacles);
    const progress = this.riverEscapeCourse.getProgress(this.tortoise.group.position.z);
    if (
      this.sceneElevenSpeechIndex < SCENE_ELEVEN_SPEECH.length
      && progress >= SCENE_ELEVEN_SPEECH_PROGRESS[this.sceneElevenSpeechIndex]!
    ) {
      this.shellUi.showSecondaryDialogue('Tortoise', SCENE_ELEVEN_SPEECH[this.sceneElevenSpeechIndex]!);
      this.sceneElevenSpeechTimer = SCENE_ELEVEN_SPEECH_DURATION;
      this.sceneElevenSpeechIndex += 1;
    } else {
      this.updateSceneElevenSpeechTimer(delta);
    }

    this.updateSceneElevenTigerChase(delta);
    if (progress >= 1) this.setSceneElevenStage('safe-objective');
  }

  private updateSafeRiverGameplay(delta: number): void {
    this.updateTortoiseSwimming(delta, this.safeRiverReach.obstacles);
    const progress = this.safeRiverReach.getProgress(this.tortoise.group.position.z);
    if (progress > 0.7) {
      const approach = THREE.MathUtils.smoothstep(progress, 0.7, 1);
      this.tortoise.group.position.x = THREE.MathUtils.lerp(
        this.tortoise.group.position.x,
        this.sceneElevenSafeZone.x,
        (1 - Math.exp(-delta * 1.8)) * approach,
      );
      this.sceneElevenSwimVelocityX *= 1 - approach * 0.035;
    }
    if (this.tortoise.group.position.z < this.safeRiverReach.getFinishZ()) {
      this.tortoise.group.position.z = this.safeRiverReach.getFinishZ();
    }

    if (
      this.sceneElevenSafeSpeechIndex < SCENE_ELEVEN_TIGER_SAFE_SPEECH.length
      && progress >= SCENE_ELEVEN_TIGER_SAFE_PROGRESS[this.sceneElevenSafeSpeechIndex]!
    ) {
      const speechIndex = this.sceneElevenSafeSpeechIndex;
      this.shellUi.showSecondaryDialogue(
        'Tiger',
        SCENE_ELEVEN_TIGER_SAFE_SPEECH[speechIndex]!,
      );
      this.sceneElevenSpeechTimer = SCENE_ELEVEN_SPEECH_DURATION;
      this.sceneElevenSafeSpeechIndex += 1;
      if (speechIndex === 0) {
        this.sceneElevenTigerLookBackTimer = SCENE_ELEVEN_TIGER_LOOK_BACK_DURATION;
      }
    } else {
      this.updateSceneElevenSpeechTimer(delta);
    }

    if (progress >= 1 && this.safeRiverReach.isReached(this.tortoise.group.position)) {
      this.setSceneElevenStage('safe-arrival');
    }
  }

  private updateSceneElevenSpeechTimer(delta: number): void {
    if (this.sceneElevenSpeechTimer <= 0) return;
    this.sceneElevenSpeechTimer -= delta;
    if (this.sceneElevenSpeechTimer <= 0) this.shellUi.hideSecondaryDialogue();
  }

  private updateTortoiseSwimming(delta: number, obstacles: readonly RiverObstacle[]): void {
    const inputX = Math.abs(this.input.state.moveX) > 0.04
      ? this.input.state.moveX
      : Number(this.input.state.right) - Number(this.input.state.left);
    const analogForward = THREE.MathUtils.clamp(-this.input.state.moveY, 0, 1);
    const forwardIntent = Math.max(analogForward, Number(this.input.state.forward));
    const backwardIntent = Math.max(
      THREE.MathUtils.clamp(this.input.state.moveY, 0, 1),
      Number(this.input.state.backward),
    );
    const targetVelocityX = inputX * SCENE_ELEVEN_STEER_SPEED;
    this.sceneElevenSwimVelocityX = THREE.MathUtils.lerp(
      this.sceneElevenSwimVelocityX,
      targetVelocityX,
      1 - Math.exp(-delta * 5.8),
    );

    this.sceneElevenContactCooldowns.forEach((time, id) => {
      const next = time - delta;
      if (next <= 0) this.sceneElevenContactCooldowns.delete(id);
      else this.sceneElevenContactCooldowns.set(id, next);
    });
    if (this.sceneElevenSlowTimer > 0) {
      this.sceneElevenSlowTimer -= delta;
    } else {
      this.sceneElevenSlowFactor = THREE.MathUtils.lerp(
        this.sceneElevenSlowFactor,
        1,
        1 - Math.exp(-delta * 4.5),
      );
    }

    let swimSpeed = (SCENE_ELEVEN_MIN_SWIM_SPEED + forwardIntent * SCENE_ELEVEN_FORWARD_BOOST)
      * THREE.MathUtils.lerp(1, 0.55, backwardIntent)
      * this.sceneElevenSlowFactor;
    this.tortoise.group.position.x += this.sceneElevenSwimVelocityX * delta;

    for (const obstacle of obstacles) {
      const dx = this.tortoise.group.position.x - obstacle.position.x;
      const dz = this.tortoise.group.position.z - obstacle.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance >= obstacle.radius) continue;
      if (obstacle.kind === 'current') {
        this.tortoise.group.position.x += obstacle.drift * delta;
        swimSpeed *= obstacle.speedFactor;
        continue;
      }
      const pushDirection = Math.abs(dx) > 0.08 ? Math.sign(dx) : Math.sign(obstacle.drift);
      const overlap = 1 - distance / obstacle.radius;
      this.tortoise.group.position.x += pushDirection * overlap * delta * 1.7;
      this.sceneElevenSwimVelocityX += pushDirection * overlap * 1.25;
      this.sceneElevenSlowTimer = 0.62;
      this.sceneElevenSlowFactor = Math.min(this.sceneElevenSlowFactor, obstacle.speedFactor);
      if (!this.sceneElevenContactCooldowns.has(obstacle.id)) {
        this.sceneElevenContactCooldowns.set(obstacle.id, 1.1);
        this.sceneElevenCollisionCount += 1;
        this.sceneElevenLastObstacle = obstacle.kind;
      }
    }

    this.tortoise.group.position.z -= swimSpeed * delta;
    const riverCenter = this.world.riverCenterAt(this.tortoise.group.position.z);
    const halfWidth = this.world.riverWidthAt(this.tortoise.group.position.z) * 0.5 - 1.05;
    this.tortoise.group.position.x = THREE.MathUtils.clamp(
      this.tortoise.group.position.x,
      riverCenter - halfWidth,
      riverCenter + halfWidth,
    );
    this.tortoise.group.position.y = SCENE_ELEVEN_SWIM_Y
      + Math.sin(this.sceneElapsed * 4.2) * 0.022;
    const desiredYaw = Math.atan2(this.sceneElevenSwimVelocityX * 0.32, -Math.max(swimSpeed, 0.1));
    this.tortoise.group.rotation.y = lerpAngle(
      this.tortoise.group.rotation.y,
      desiredYaw,
      1 - Math.exp(-delta * 4.6),
    );
    this.tortoise.group.rotation.z = -this.sceneElevenSwimVelocityX * 0.028;
  }

  private updateSceneElevenTigerChase(delta: number): void {
    const targetZ = this.tortoise.group.position.z + SCENE_ELEVEN_TIGER_BANK_LEAD;
    this.sceneElevenTigerTarget.set(this.world.leftBankPathAt(targetZ), SCENE_FOUR_TIGER_GROUND_Y, targetZ);
    this.sceneElevenTigerDirection.copy(this.sceneElevenTigerTarget).sub(this.tiger.group.position).setY(0);
    const distance = this.sceneElevenTigerDirection.length();
    if (distance > 0.001) {
      this.sceneElevenTigerDirection.multiplyScalar(1 / distance);
      this.tiger.group.position.addScaledVector(
        this.sceneElevenTigerDirection,
        Math.min(distance, SCENE_ELEVEN_TIGER_CHASE_SPEED * delta),
      );
      const yaw = this.getTigerYawForDirection(
        this.sceneElevenTigerDirection.x,
        this.sceneElevenTigerDirection.z,
      );
      this.tiger.group.rotation.y = lerpAngle(
        this.tiger.group.rotation.y,
        yaw,
        1 - Math.exp(-delta * 6),
      );
    }
  }

  private updateSceneElevenCamera(delta: number, immediate: boolean): void {
    const safeGameplay = this.sceneElevenStage === 'safe-objective'
      || this.sceneElevenStage === 'safe-swimming'
      || this.sceneElevenStage === 'safe-arrival'
      || this.sceneElevenStage === 'safe-narrator'
      || this.sceneElevenStage === 'complete';
    const gameplay = this.sceneElevenStage === 'swimming' || safeGameplay;
    const tigerLookBack = this.sceneElevenStage === 'safe-swimming'
      && this.sceneElevenTigerLookBackTimer > 0;
    const tortoiseFocus = this.sceneElevenStage === 'reveal'
      || this.sceneElevenStage === 'tortoise-thanks'
      || this.sceneElevenStage === 'tortoise-explains'
      || this.sceneElevenStage === 'objective';

    if (tigerLookBack) {
      this.sceneElevenTigerDirection
        .copy(this.tortoise.group.position)
        .sub(this.tiger.group.position)
        .setY(0)
        .normalize();
      this.sceneElevenTigerCameraSide.set(
        this.sceneElevenTigerDirection.z,
        0,
        -this.sceneElevenTigerDirection.x,
      );
      this.desiredCameraTarget.copy(this.tiger.group.position);
      this.desiredCameraTarget.y = 1.12;
      this.desiredCameraPosition
        .copy(this.tiger.group.position)
        .addScaledVector(
          this.sceneElevenTigerDirection,
          this.camera.aspect < 0.78 ? 11.4 : 9.15,
        )
        .addScaledVector(
          this.sceneElevenTigerCameraSide,
          this.camera.aspect < 0.78 ? 0.65 : 1.15,
        );
      this.desiredCameraPosition.y = this.camera.aspect < 0.78 ? 5.65 : 4.35;
    } else if (gameplay) {
      this.desiredCameraTarget.copy(this.tortoise.group.position);
      if (safeGameplay) {
        const safeProgress = this.safeRiverReach.getProgress(this.tortoise.group.position.z);
        this.desiredCameraTarget.x = THREE.MathUtils.lerp(
          this.tortoise.group.position.x,
          this.sceneElevenSafeZone.x,
          (this.camera.aspect < 0.78 ? 0.08 : 0.14) + safeProgress * 0.2,
        );
      } else {
        this.desiredCameraTarget.x = THREE.MathUtils.lerp(
          this.tortoise.group.position.x,
          this.tiger.group.position.x,
          this.camera.aspect < 0.78 ? 0.1 : 0.18,
        );
      }
      this.desiredCameraTarget.z -= this.camera.aspect < 0.78 ? 3.5 : 2.65;
      this.desiredCameraTarget.y = 0.48;
      this.desiredCameraPosition.copy(this.tortoise.group.position);
      this.desiredCameraPosition.x = this.desiredCameraTarget.x + (this.camera.aspect < 0.78 ? 1.05 : 1.35);
      this.desiredCameraPosition.y += this.camera.aspect < 0.78 ? 5.8 : 4.25;
      this.desiredCameraPosition.z += this.camera.aspect < 0.78 ? 8.4 : 6.45;
    } else {
      const focus = tortoiseFocus ? this.sceneElevenRevealPoint : this.sceneTenSplashPoint;
      this.desiredCameraTarget.copy(this.tiger.group.position).lerp(focus, tortoiseFocus ? 0.78 : 0.48);
      this.desiredCameraTarget.y = tortoiseFocus ? 0.72 : 0.88;
      this.desiredCameraPosition
        .copy(this.desiredCameraTarget)
        .addScaledVector(this.sceneTenCameraSide, tortoiseFocus ? 8 : 8.2)
        .addScaledVector(this.sceneTenThrowDirection, tortoiseFocus ? -0.4 : -0.85);
      this.desiredCameraPosition.y = tortoiseFocus ? 3.7 : 4.4;
      if (this.camera.aspect < 0.78) {
        this.desiredCameraPosition.addScaledVector(this.sceneTenCameraSide, tortoiseFocus ? 3.6 : 4.8);
        this.desiredCameraPosition.y += tortoiseFocus ? 0.75 : 1.1;
      }
    }

    if (immediate) {
      this.camera.position.copy(this.desiredCameraPosition);
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      const amount = 1 - Math.exp(-delta * (tigerLookBack ? 1.9 : gameplay ? 2.35 : 1.65));
      this.camera.position.lerp(this.desiredCameraPosition, amount);
      this.cameraTarget.lerp(this.desiredCameraTarget, amount);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private updateSceneThirteen(delta: number): void {
    this.sceneThirteenStageElapsed += delta;

    if (this.sceneThirteenStage === 'climbing') {
      const progress = THREE.MathUtils.smoothstep(
        this.sceneThirteenStageElapsed,
        0,
        SCENE_THIRTEEN_CLIMB_DURATION,
      );
      this.tortoise.group.position
        .copy(this.sceneThirteenSwimStart)
        .lerp(this.sceneThirteenRock, progress);
      this.tortoise.group.position.y += Math.sin(progress * Math.PI) * 0.12;
      if (progress >= 0.68) this.tortoise.setGrounded(true);
      if (this.sceneThirteenStageElapsed >= SCENE_THIRTEEN_CLIMB_DURATION) {
        this.setSceneThirteenStage('water-shake');
      }
    } else if (this.sceneThirteenStage === 'water-shake') {
      const facingTigerYaw = Math.atan2(
        -this.sceneThirteenAcrossRiver.x,
        -this.sceneThirteenAcrossRiver.z,
      );
      this.tortoise.group.rotation.y = lerpAngle(
        this.tortoise.group.rotation.y,
        facingTigerYaw,
        1 - Math.exp(-delta * 2.2),
      );
      if (this.sceneThirteenStageElapsed >= SCENE_THIRTEEN_SHAKE_DURATION) {
        this.setSceneThirteenStage('tiger-accuses');
      }
    } else if (this.sceneThirteenStage === 'brain-pause') {
      if (this.sceneThirteenStageElapsed >= SCENE_THIRTEEN_BRAIN_PAUSE_DURATION) {
        this.setSceneThirteenStage('tortoise-brain');
      }
    } else if (this.sceneThirteenStage === 'tiger-confused') {
      if (this.sceneThirteenStageElapsed >= SCENE_THIRTEEN_CONFUSED_DURATION) {
        this.setSceneThirteenStage('tiger-reflects');
      }
    } else if (this.sceneThirteenStage === 'tortoise-chuckles') {
      const progress = THREE.MathUtils.clamp(
        this.sceneThirteenStageElapsed / SCENE_THIRTEEN_CHUCKLE_DURATION,
        0,
        1,
      );
      const envelope = Math.sin(progress * Math.PI);
      this.tortoise.group.position.y = this.sceneThirteenTortoiseBaseY
        + Math.abs(Math.sin(progress * Math.PI * 4)) * 0.055 * envelope;
      this.tortoise.group.rotation.z = this.sceneThirteenTortoiseBaseRoll
        + Math.sin(progress * Math.PI * 4) * 0.045 * envelope;
      if (this.sceneThirteenStageElapsed >= SCENE_THIRTEEN_CHUCKLE_DURATION) {
        this.tortoise.group.position.y = this.sceneThirteenTortoiseBaseY;
        this.tortoise.group.rotation.z = this.sceneThirteenTortoiseBaseRoll;
        this.setSceneThirteenStage('complete');
      }
    }

    this.updateSceneThirteenCamera(delta, false);
  }

  private setSceneThirteenStage(stage: SceneThirteenStage): void {
    if (this.sceneThirteenStage === stage) return;
    this.sceneThirteenStage = stage;
    this.sceneThirteenStageElapsed = 0;

    if (stage === 'climbing') {
      this.ui.reset();
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.walk, 0.32, 0.66);
    } else if (stage === 'water-shake') {
      this.tortoise.group.position.copy(this.sceneThirteenRock);
      this.tortoise.setGrounded(true);
      this.tortoise.playAnimationOnce(TORTOISE_ANIMATIONS.headShake, 0.32, 0.78, false);
    } else if (stage === 'tiger-accuses') {
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.42, 0.74);
      this.audio.playAngryGrowl();
      this.ui.showDialogue('Tiger', SCENE_THIRTEEN_TIGER_ACCUSES, () => {
        if (this.activeScene === 'scene-13') this.setSceneThirteenStage('tortoise-strength');
      });
    } else if (stage === 'tortoise-strength') {
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.38, 0.74);
      this.ui.showDialogue('Tortoise', SCENE_THIRTEEN_TORTOISE_STRENGTH, () => {
        if (this.activeScene === 'scene-13') this.setSceneThirteenStage('brain-pause');
      });
    } else if (stage === 'brain-pause') {
      this.ui.reset();
      this.tortoise.setThinkingPose(0.1, true);
    } else if (stage === 'tortoise-brain') {
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.38, 0.78);
      this.ui.showDialogue('Tortoise', SCENE_THIRTEEN_TORTOISE_BRAIN, () => {
        if (this.activeScene === 'scene-13') this.setSceneThirteenStage('tiger-confused');
      });
    } else if (stage === 'tiger-confused') {
      this.ui.reset();
      this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0.42, 0.48);
    } else if (stage === 'tiger-reflects') {
      this.tiger.playAnimationOnce(TIGER_ANIMATIONS.disappointed, 0.58, 0.42, true);
      this.ui.showDialogue('Tiger', SCENE_THIRTEEN_TIGER_REFLECTS, () => {
        if (this.activeScene === 'scene-13') this.setSceneThirteenStage('tortoise-chuckles');
      });
    } else if (stage === 'tortoise-chuckles') {
      this.ui.reset();
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.38, 0.82);
      this.sceneThirteenTortoiseBaseY = this.tortoise.group.position.y;
      this.sceneThirteenTortoiseBaseRoll = this.tortoise.group.rotation.z;
    } else if (stage === 'complete') {
      this.ui.reset();
      this.queueStoryScene('scene-14', 0.65);
    }
  }

  private updateSceneThirteenCamera(delta: number, immediate: boolean): void {
    const tigerFocus = this.sceneThirteenStage === 'tiger-accuses'
      || this.sceneThirteenStage === 'tiger-confused'
      || this.sceneThirteenStage === 'tiger-reflects';
    const wideShot = this.sceneThirteenStage === 'climbing'
      || this.sceneThirteenStage === 'water-shake';
    const mobile = this.camera.aspect < 0.78;

    if (wideShot) {
      this.desiredCameraTarget.copy(this.sceneThirteenMidpoint);
      this.desiredCameraTarget.lerp(this.tortoise.group.position, 0.26);
      this.desiredCameraTarget.y = 0.68;
      this.desiredCameraPosition
        .copy(this.sceneThirteenMidpoint)
        .addScaledVector(this.sceneThirteenCameraSide, mobile ? 14.2 : 11.1)
        .addScaledVector(this.sceneThirteenAcrossRiver, -0.8);
      this.desiredCameraPosition.y = mobile ? 6.15 : 4.65;
    } else {
      const focus = tigerFocus ? this.tiger.group.position : this.tortoise.group.position;
      this.desiredCameraTarget.copy(focus);
      this.desiredCameraTarget.y += tigerFocus ? 1.05 : 0.68;
      this.desiredCameraPosition
        .copy(focus)
        .addScaledVector(
          this.sceneThirteenAcrossRiver,
          tigerFocus ? (mobile ? 8.9 : 6.2) : (mobile ? -8.2 : -5.35),
        )
        .addScaledVector(this.sceneThirteenCameraSide, mobile ? 5.1 : 4.15);
      this.desiredCameraPosition.y = tigerFocus
        ? (mobile ? 5.25 : 3.65)
        : (mobile ? 4.75 : 3.25);
    }

    if (immediate) {
      this.camera.position.copy(this.desiredCameraPosition);
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      const amount = 1 - Math.exp(-delta * (wideShot ? 1.45 : 1.62));
      this.camera.position.lerp(this.desiredCameraPosition, amount);
      this.cameraTarget.lerp(this.desiredCameraTarget, amount);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private updateSceneFourteen(delta: number): void {
    this.sceneFourteenElapsed += delta;
    this.sceneFourteenStageElapsed += delta;
    if (
      this.sceneFourteenStage === 'establishing'
      && this.sceneFourteenStageElapsed >= SCENE_FOURTEEN_NARRATOR_DELAY
    ) {
      this.setSceneFourteenStage('narrator');
    }
    this.updateSceneFourteenCamera(delta, false);
  }

  private setSceneFourteenStage(stage: SceneFourteenStage): void {
    if (this.sceneFourteenStage === stage) return;
    this.sceneFourteenStage = stage;
    this.sceneFourteenStageElapsed = 0;
    if (stage === 'establishing') {
      this.ui.reset();
    } else if (stage === 'narrator') {
      this.ui.showNarrator(SCENE_FOURTEEN_NARRATION, () => {
        if (this.activeScene === 'scene-14') this.setSceneFourteenStage('complete');
      });
    } else if (stage === 'complete') {
      this.ui.reset();
      if (!this.storyComplete) {
        this.storyComplete = true;
        this.onComplete?.();
      }
    }
  }

  private updateSceneFourteenCamera(delta: number, immediate: boolean): void {
    const progress = this.reducedMotion
      ? 1
      : THREE.MathUtils.smoothstep(this.sceneFourteenElapsed, 0, SCENE_FOURTEEN_PULL_DURATION);
    const mobile = this.camera.aspect < 0.78;
    this.desiredCameraTarget.copy(this.sceneThirteenMidpoint);
    // Aim below the actors as the camera rises so the centered storybook
    // narrator panel leaves the tortoise and tiger visible above it.
    this.desiredCameraTarget.y = THREE.MathUtils.lerp(
      0.45,
      mobile ? -9 : -5.5,
      THREE.MathUtils.smoothstep(progress, 0.12, 0.48),
    );
    this.desiredCameraTarget.z -= progress * 1.4;
    this.desiredCameraPosition
      .copy(this.sceneThirteenMidpoint)
      .addScaledVector(
        this.sceneThirteenCameraSide,
        THREE.MathUtils.lerp(mobile ? 15.5 : 12.4, mobile ? 25.5 : 22.5, progress),
      )
      .addScaledVector(this.sceneThirteenAcrossRiver, -0.35);
    this.desiredCameraPosition.y = THREE.MathUtils.lerp(
      mobile ? 7.2 : 5.4,
      mobile ? 21.5 : 18.2,
      progress,
    );

    if (immediate) {
      this.camera.position.copy(this.desiredCameraPosition);
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      const amount = 1 - Math.exp(-delta * 1.15);
      this.camera.position.lerp(this.desiredCameraPosition, amount);
      this.cameraTarget.lerp(this.desiredCameraTarget, amount);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private setSceneTwoMotionBeat(beat: SceneTwoMotionBeat): void {
    if (this.sceneTwoMotionBeat === beat) return;
    this.sceneTwoMotionBeat = beat;
    if (beat === 'butterfly-pause') {
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0.45, 0.82);
    } else {
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.walk, 0.42, 0.56);
    }
  }

  private showSceneTwoNarrator(): void {
    this.sceneTwoPopupStage = 'narrator';
    this.ui.showNarrator(SCENE_TWO_NARRATION, () => {
      if (this.activeScene !== 'scene-2') return;
      this.sceneTwoPopupStage = 'between-popups';
      this.sceneTwoDialogueDelay = 0;
    });
  }

  private showSceneTwoDialogue(): void {
    this.sceneTwoPopupStage = 'dialogue';
    this.ui.showDialogue('Tortoise', SCENE_TWO_DIALOGUE, () => {
      if (this.activeScene !== 'scene-2') return;
      this.sceneTwoPopupStage = 'complete';
      this.queueStoryScene('scene-3', 0.65);
    });
  }

  private moveTortoiseAlongBank(delta: number, speed: number): void {
    const nextZ = this.tortoise.group.position.z - speed * delta;
    this.tortoise.group.position.z = nextZ;
    this.tortoise.group.position.x = this.world.leftBankPathAt(nextZ);
    const aheadZ = nextZ - 0.4;
    const headingX = this.world.leftBankPathAt(aheadZ) - this.tortoise.group.position.x;
    const heading = Math.atan2(headingX, -0.4);
    this.tortoise.group.rotation.y = lerpAngle(
      this.tortoise.group.rotation.y,
      heading,
      1 - Math.exp(-delta * 5),
    );
  }

  private positionSceneTwoTortoiseAt(time: number): void {
    const walkingSeconds = Math.min(time, SCENE_TWO_PAUSE_AT) + Math.max(0, time - SCENE_TWO_RESUME_AT);
    const z = this.sceneTwoStartZ - SCENE_TWO_TORTOISE_SPEED * walkingSeconds;
    const x = this.world.leftBankPathAt(z);
    const aheadZ = z - 0.4;
    const headingX = this.world.leftBankPathAt(aheadZ) - x;
    this.tortoise.group.position.set(x, -0.18, z);
    this.tortoise.group.rotation.y = Math.atan2(headingX, -0.4);
  }

  private updateSceneTwoCamera(delta: number, immediate: boolean): void {
    const closeProgress = THREE.MathUtils.smoothstep(this.sceneElapsed, 0, 3.5);
    let offsetX = THREE.MathUtils.lerp(5.8, 4.25, closeProgress);
    let offsetY = THREE.MathUtils.lerp(3.8, 2.85, closeProgress);
    let offsetZ = THREE.MathUtils.lerp(-5.7, -3.65, closeProgress);
    let targetX = this.tortoise.group.position.x;
    let targetY = 0.66;
    let targetZ = this.tortoise.group.position.z + 0.1;

    if (this.sceneTwoMotionBeat === 'butterfly-pause') {
      offsetX = 3.9;
      offsetY = 2.65;
      offsetZ = -3.2;
      targetX = THREE.MathUtils.lerp(targetX, this.butterfly.group.position.x, 0.34);
      targetY = 0.86;
      targetZ = THREE.MathUtils.lerp(targetZ, this.butterfly.group.position.z, 0.28);
    } else if (this.sceneTwoPopupStage === 'dialogue' || this.sceneTwoPopupStage === 'complete') {
      offsetX = 3.65;
      offsetY = 2.48;
      offsetZ = -3.08;
      targetY = 0.78;
    }

    if (this.camera.aspect < 0.78) {
      offsetX += 1.05;
      offsetY += 0.42;
      offsetZ -= 0.9;
      targetZ -= 0.5;
    }

    this.desiredCameraPosition.set(
      this.tortoise.group.position.x + offsetX,
      offsetY,
      this.tortoise.group.position.z + offsetZ,
    );
    this.desiredCameraTarget.set(targetX, targetY, targetZ);
    if (immediate) {
      this.camera.position.copy(this.desiredCameraPosition);
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      const amount = 1 - Math.exp(-delta * 1.8);
      this.camera.position.lerp(this.desiredCameraPosition, amount);
      this.cameraTarget.lerp(this.desiredCameraTarget, amount);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private resize(): void {
    applyResponsiveViewport(this.renderer, this.camera, this.root);
    this.camera.fov = this.camera.aspect < 0.78 ? 68 : this.camera.aspect < 1.15 ? 51 : 43;
    this.camera.updateProjectionMatrix();
  }

  private applySceneEightCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-8';
    this.ui.reset();
    this.shellUi.reset();
    this.resetSceneEight();

    if (checkpoint === 'soft' || checkpoint === 'tiger-soft') {
      this.sceneElapsed = 1.45;
      this.setSceneEightStage('tiger-soft');
    } else if (checkpoint === 'proud' || checkpoint === 'tiger-proud') {
      this.sceneElapsed = 4.25;
      this.setSceneEightStage('tiger-proud');
    } else if (checkpoint === 'tortoise' || checkpoint === 'close' || checkpoint === 'tortoise-close') {
      this.sceneElapsed = SCENE_EIGHT_TORTOISE_CLOSE_AT + 0.05;
      this.setSceneEightStage('tortoise-close');
    } else if (checkpoint === 'arriving' || checkpoint === 'river') {
      this.setSceneEightStage('tortoise-close');
      this.tortoise.setCurrentAnimationProgress(SCENE_EIGHT_TORTOISE_PEEK_PROGRESS);
      this.sceneElapsed = 9.3;
      this.setSceneEightStage('arriving');
    } else if (checkpoint === 'complete') {
      this.setSceneEightStage('tortoise-close');
      this.tortoise.setCurrentAnimationProgress(SCENE_EIGHT_TORTOISE_PEEK_PROGRESS);
      this.sceneElapsed = SCENE_EIGHT_DURATION;
      this.setSceneEightStage('arriving');
    }

    this.updateSceneEight(0);
    this.updateSceneEightCamera(0, true);
  }

  private applySceneNineCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-9';
    this.ui.reset();
    this.shellUi.reset();
    this.resetSceneNine();

    if (checkpoint === 'tortoise' || checkpoint === 'deep' || checkpoint === 'tortoise-deep') {
      this.setSceneNineStage('tortoise-deep');
    } else if (checkpoint === 'question' || checkpoint === 'tiger-question') {
      this.setSceneNineStage('tiger-question');
    } else if (checkpoint === 'explain' || checkpoint === 'tortoise-explain') {
      this.setSceneNineStage('tortoise-explain');
    } else if (checkpoint === 'agree' || checkpoint === 'tiger-agrees') {
      this.setSceneNineStage('tiger-agrees');
    } else if (checkpoint === 'complete') {
      this.setSceneNineStage('complete');
    }

    this.updateSceneNine(0);
    this.updateSceneNineCamera(0, true);
  }

  private applySceneTenCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-10';
    this.ui.reset();
    this.shellUi.reset();
    this.resetSceneTen();

    if (checkpoint === 'backswing' || checkpoint === 'back') {
      this.setSceneTenStage('backswing');
      this.sceneTenStageElapsed = SCENE_TEN_BACKSWING_DURATION * 0.58;
    } else if (checkpoint === 'forward' || checkpoint === 'forward-swing') {
      this.setSceneTenStage('backswing');
      this.setSceneTenStage('forward-swing');
      this.sceneTenStageElapsed = SCENE_TEN_FORWARD_SWING_DURATION * 0.62;
    } else if (checkpoint === 'flight' || checkpoint === 'flying') {
      this.setSceneTenStage('flight');
      this.sceneTenStageElapsed = SCENE_TEN_FLIGHT_DURATION * 0.54;
    } else if (checkpoint === 'splash') {
      this.setSceneTenStage('flight');
      this.sceneTenStageElapsed = SCENE_TEN_FLIGHT_DURATION;
    } else if (checkpoint === 'waiting' || checkpoint === 'tiger-waits') {
      this.setSceneTenStage('splash');
      this.sceneTenStageElapsed = SCENE_TEN_SPLASH_DURATION;
    } else if (checkpoint === 'complete') {
      this.setSceneTenStage('waiting');
      this.sceneTenStageElapsed = SCENE_TEN_WAIT_DURATION;
    }

    this.updateSceneTen(0);
    this.updateSceneTenCamera(0, true);
  }

  private applySceneElevenCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-11';
    this.ui.reset();
    this.shellUi.reset();
    this.resetSceneEleven();

    if (checkpoint === 'wonder' || checkpoint === 'tiger-wonders') {
      this.setSceneElevenStage('tiger-wonders');
    } else if (checkpoint === 'bubble' || checkpoint === 'bubble-one') {
      this.setSceneElevenStage('bubble-one');
    } else if (checkpoint === 'bubble-two') {
      this.setSceneElevenStage('bubble-two');
    } else if (checkpoint === 'reveal' || checkpoint === 'pop') {
      this.setSceneElevenStage('reveal');
      this.sceneElevenStageElapsed = SCENE_ELEVEN_REVEAL_DURATION * 0.62;
      this.updateSceneEleven(0);
    } else if (checkpoint === 'thanks' || checkpoint === 'tortoise-thanks') {
      this.setSceneElevenStage('reveal');
      this.sceneElevenStageElapsed = SCENE_ELEVEN_REVEAL_DURATION;
      this.updateSceneEleven(0);
    } else if (checkpoint === 'question' || checkpoint === 'tiger-question') {
      this.setSceneElevenStage('reveal');
      this.sceneElevenStageElapsed = SCENE_ELEVEN_REVEAL_DURATION;
      this.updateSceneEleven(0);
      this.setSceneElevenStage('tiger-question');
    } else if (checkpoint === 'escape-line' || checkpoint === 'tortoise-explains') {
      this.setSceneElevenStage('reveal');
      this.sceneElevenStageElapsed = SCENE_ELEVEN_REVEAL_DURATION;
      this.updateSceneEleven(0);
      this.setSceneElevenStage('tortoise-explains');
    } else if (checkpoint === 'objective') {
      this.setSceneElevenStage('reveal');
      this.sceneElevenStageElapsed = SCENE_ELEVEN_REVEAL_DURATION;
      this.updateSceneEleven(0);
      this.setSceneElevenStage('objective');
    } else if (checkpoint === 'gameplay' || checkpoint === 'active-play' || checkpoint === 'swimming') {
      this.positionSceneElevenGameplayAt(0.08);
    } else if (checkpoint === 'mid' || checkpoint === 'mid-river') {
      this.positionSceneElevenGameplayAt(0.52);
      this.shellUi.showSecondaryDialogue('Tortoise', SCENE_ELEVEN_SPEECH[1]);
      this.sceneElevenSpeechTimer = SCENE_ELEVEN_SPEECH_DURATION;
    } else if (checkpoint === 'almost') {
      this.positionSceneElevenGameplayAt(0.84);
      this.shellUi.showSecondaryDialogue('Tortoise', SCENE_ELEVEN_SPEECH[3]);
      this.sceneElevenSpeechTimer = SCENE_ELEVEN_SPEECH_DURATION;
    } else if (checkpoint === 'rock-contact' || checkpoint === 'collision') {
      this.positionSceneElevenGameplayAt(0.16);
      const rock = this.riverEscapeCourse.obstacles.find((obstacle) => obstacle.kind === 'rock');
      if (rock) {
        this.tortoise.group.position.x = rock.position.x;
        this.tortoise.group.position.z = rock.position.z + rock.radius * 0.72;
        this.updateRiverEscapeGameplay(1 / 60);
      }
    } else if (checkpoint === 'safe-objective' || checkpoint === 'reach-safe-side') {
      this.positionSceneElevenSafeAt(0);
      this.setSceneElevenStage('safe-objective');
    } else if (checkpoint === 'safe-gameplay' || checkpoint === 'safe-swimming') {
      this.positionSceneElevenSafeAt(0.08);
    } else if (checkpoint === 'tiger-call' || checkpoint === 'come-back') {
      this.positionSceneElevenSafeAt(0.1);
      this.sceneElevenSafeSpeechIndex = 1;
      this.sceneElevenSpeechTimer = SCENE_ELEVEN_SPEECH_DURATION;
      this.sceneElevenTigerLookBackTimer = SCENE_ELEVEN_TIGER_LOOK_BACK_DURATION;
      this.shellUi.showSecondaryDialogue('Tiger', SCENE_ELEVEN_TIGER_SAFE_SPEECH[0]);
      this.faceSceneElevenTigerTowardTortoise(0);
    } else if (checkpoint === 'safe-rock') {
      this.positionSceneElevenSafeAt(0.18);
    } else if (checkpoint === 'safe-branch' || checkpoint === 'under-branch') {
      this.positionSceneElevenSafeAt(0.42);
    } else if (checkpoint === 'safe-lilies' || checkpoint === 'lily-gate') {
      this.positionSceneElevenSafeAt(0.64);
    } else if (checkpoint === 'safe-zone' || checkpoint === 'safe-bank') {
      this.positionSceneElevenSafeAt(0.91);
    } else if (checkpoint === 'safe-narrator' || checkpoint === 'narrator') {
      this.positionSceneElevenSafeAt(1);
      this.tortoise.group.position.copy(this.sceneElevenSafeZone);
      this.tortoise.group.position.y = SCENE_ELEVEN_SWIM_Y;
      this.setSceneElevenStage('safe-arrival');
      this.setSceneElevenStage('safe-narrator');
    } else if (checkpoint === 'complete') {
      this.positionSceneElevenSafeAt(1);
      this.tortoise.group.position.copy(this.sceneElevenSafeZone);
      this.tortoise.group.position.y = SCENE_ELEVEN_SWIM_Y;
      this.setSceneElevenStage('complete');
    }

    if (this.sceneElevenStage === 'swimming'
      || this.sceneElevenStage === 'safe-swimming'
      || this.sceneElevenStage === 'safe-arrival'
      || this.sceneElevenStage === 'safe-narrator'
      || this.sceneElevenStage === 'complete') {
      // Gameplay checkpoint helpers already author the character transforms.
    } else {
      this.faceSceneElevenTigerTowardWater(0);
    }
    this.updateSceneElevenCamera(0, true);
  }

  private applySceneThirteenCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-13';
    this.resetSceneThirteen();

    const postClimb = checkpoint !== ''
      && checkpoint !== 'climb'
      && checkpoint !== 'climbing';
    if (postClimb) {
      this.tortoise.group.position.copy(this.sceneThirteenRock);
      this.tortoise.setGrounded(true);
      this.tortoise.group.rotation.y = Math.atan2(
        -this.sceneThirteenAcrossRiver.x,
        -this.sceneThirteenAcrossRiver.z,
      );
    }

    if (checkpoint === 'shake' || checkpoint === 'water-shake') {
      this.setSceneThirteenStage('water-shake');
      this.sceneThirteenStageElapsed = SCENE_THIRTEEN_SHAKE_DURATION * 0.35;
    } else if (checkpoint === 'accuse' || checkpoint === 'tiger-accuses') {
      this.setSceneThirteenStage('tiger-accuses');
    } else if (checkpoint === 'strength' || checkpoint === 'tortoise-strength') {
      this.setSceneThirteenStage('tortoise-strength');
    } else if (checkpoint === 'brain' || checkpoint === 'tortoise-brain') {
      this.setSceneThirteenStage('tortoise-brain');
    } else if (checkpoint === 'reflect' || checkpoint === 'tiger-reflects') {
      this.setSceneThirteenStage('tiger-reflects');
    } else if (checkpoint === 'chuckle' || checkpoint === 'tortoise-chuckles') {
      this.setSceneThirteenStage('tortoise-chuckles');
    } else if (checkpoint === 'complete' || checkpoint === 'ending') {
      this.setSceneThirteenStage('complete');
      return;
    }
    this.updateSceneThirteenCamera(0, true);
  }

  private applySceneFourteenCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-14';
    this.resetSceneFourteen();
    if (checkpoint === 'narrator' || checkpoint === 'moral') {
      this.sceneFourteenElapsed = SCENE_FOURTEEN_PULL_DURATION * 0.42;
      this.setSceneFourteenStage('narrator');
    } else if (checkpoint === 'wide' || checkpoint === 'pullback') {
      this.sceneFourteenElapsed = SCENE_FOURTEEN_PULL_DURATION * 0.82;
    } else if (checkpoint === 'complete') {
      this.sceneFourteenElapsed = SCENE_FOURTEEN_PULL_DURATION;
      this.setSceneFourteenStage('complete');
    }
    this.updateSceneFourteenCamera(0, true);
  }

  private positionSceneElevenGameplayAt(progress: number): void {
    const clamped = THREE.MathUtils.clamp(progress, 0, 1);
    const z = THREE.MathUtils.lerp(
      this.riverEscapeCourse.getStartZ(),
      this.riverEscapeCourse.getFinishZ(),
      clamped,
    );
    this.tortoise.group.visible = true;
    this.tortoise.group.position.set(this.world.riverCenterAt(z), SCENE_ELEVEN_SWIM_Y, z);
    this.tortoise.group.rotation.set(0, Math.PI, 0);
    this.tortoise.setPeekOnly(false);
    this.tortoise.setGrounded(false);
    this.tortoise.setThinkingPose(0, true);
    this.tortoise.playAnimation(TORTOISE_ANIMATIONS.walk, 0, 0.9);
    this.riverEscapeCourse.setVisible(true);
    this.world.setGameplayRiverDecorVisible(false);
    this.setSceneElevenStage('swimming');
    this.sceneElevenSpeechIndex = SCENE_ELEVEN_SPEECH_PROGRESS.filter((threshold) => threshold < clamped).length;
    const tigerZ = z + SCENE_ELEVEN_TIGER_BANK_LEAD;
    this.tiger.group.position.set(
      this.world.leftBankPathAt(tigerZ),
      SCENE_FOUR_TIGER_GROUND_Y,
      tigerZ,
    );
    const aheadZ = tigerZ - 0.5;
    this.tiger.group.rotation.y = this.getTigerYawForDirection(
      this.world.leftBankPathAt(aheadZ) - this.tiger.group.position.x,
      aheadZ - tigerZ,
    );
  }

  private positionSceneElevenSafeAt(progress: number): void {
    const clamped = THREE.MathUtils.clamp(progress, 0, 1);
    const z = THREE.MathUtils.lerp(
      this.safeRiverReach.getStartZ(),
      this.safeRiverReach.getFinishZ(),
      clamped,
    );
    const routeX = THREE.MathUtils.lerp(
      this.world.riverCenterAt(z),
      this.sceneElevenSafeZone.x,
      THREE.MathUtils.smoothstep(clamped, 0.7, 1),
    );
    this.tortoise.group.visible = true;
    this.tortoise.group.position.set(routeX, SCENE_ELEVEN_SWIM_Y, z);
    this.tortoise.group.rotation.set(0, Math.PI, 0);
    this.tortoise.setPeekOnly(false);
    this.tortoise.setGrounded(false);
    this.tortoise.setThinkingPose(0, true);
    this.tortoise.playAnimation(TORTOISE_ANIMATIONS.walk, 0, 0.94);
    this.riverEscapeCourse.setVisible(true);
    this.safeRiverReach.setVisible(true);
    this.safeRiverReach.setSafeZoneGlowVisible(true);
    this.world.setGameplayRiverDecorVisible(false);
    this.setSceneElevenStage('safe-swimming');
    this.sceneElevenSafeSpeechIndex = SCENE_ELEVEN_TIGER_SAFE_PROGRESS
      .filter((threshold) => threshold < clamped).length;
    this.sceneElevenSpeechTimer = 0;

    const tigerZ = this.safeRiverReach.getStartZ() + SCENE_ELEVEN_TIGER_BANK_LEAD;
    this.tiger.group.position.set(
      this.world.leftBankPathAt(tigerZ),
      SCENE_FOUR_TIGER_GROUND_Y,
      tigerZ,
    );
    this.sceneElevenTigerDirection.copy(this.tortoise.group.position).sub(this.tiger.group.position).setY(0);
    this.tiger.group.rotation.y = this.getTigerYawForDirection(
      this.sceneElevenTigerDirection.x,
      this.sceneElevenTigerDirection.z,
    );
    this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0, 0.62);
  }

  private applySceneSixCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-6';
    this.ui.reset();
    this.shellUi.reset();
    this.resetSceneSix();

    if (checkpoint === 'way' || checkpoint === 'tortoise-way') {
      this.setSceneSixStage('tortoise-way');
    } else if (checkpoint === 'interest' || checkpoint === 'tiger-interest') {
      this.setSceneSixStage('tiger-interest');
    } else if (checkpoint === 'sun' || checkpoint === 'tortoise-sun') {
      this.setSceneSixStage('tortoise-sun');
    } else if (checkpoint === 'pause') {
      this.setSceneSixStage('pause');
      this.sceneSixStageElapsed = SCENE_SIX_PAUSE_DURATION * 0.5;
    } else if (checkpoint === 'river' || checkpoint === 'soak' || checkpoint === 'tortoise-river') {
      this.setSceneSixStage('tortoise-river');
    } else if (checkpoint === 'think' || checkpoint === 'thinks' || checkpoint === 'tiger-thinks') {
      this.setSceneSixStage('tiger-thinks');
      this.sceneSixStageElapsed = SCENE_SIX_THINK_DURATION * 0.48;
      this.updateSceneSix(0);
    } else if (checkpoint === 'complete') {
      this.setSceneSixStage('tiger-thinks');
      this.sceneSixStageElapsed = SCENE_SIX_THINK_DURATION;
      this.updateSceneSix(0);
    }

    this.updateSceneSixCamera(0, true);
  }

  private applySceneSevenCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-7';
    this.ui.reset();
    this.shellUi.reset();
    this.resetSceneSeven();

    if (checkpoint === 'flatter' || checkpoint === 'tortoise-flatter') {
      this.setSceneSevenStage('tortoise-flatter');
    } else if (checkpoint === 'laugh' || checkpoint === 'holding-laugh') {
      this.setSceneSevenStage('holding-laugh');
      this.sceneSevenStageElapsed = SCENE_SEVEN_LAUGH_DURATION * 0.42;
      this.updateSceneSeven(0);
    } else if (checkpoint === 'narrator') {
      this.setSceneSevenStage('narrator');
    } else if (checkpoint === 'pickup-camera' || checkpoint === 'camera') {
      this.setSceneSevenStage('pickup-camera');
      this.sceneSevenStageElapsed = SCENE_SEVEN_CAMERA_SETUP_DURATION * 0.72;
      this.updateSceneSeven(0);
    } else if (checkpoint === 'pickup' || checkpoint === 'carry') {
      this.setSceneSevenStage('pickup');
      this.sceneSevenStageElapsed = SCENE_SEVEN_PICKUP_DURATION * 0.58;
      this.updateSceneSeven(0);
    } else if (checkpoint === 'reveal' || checkpoint === 'pickup-reveal') {
      this.setSceneSevenStage('pickup');
      this.sceneSevenStageElapsed = SCENE_SEVEN_PICKUP_DURATION;
      this.updateSceneSeven(0);
    } else if (checkpoint === 'complete') {
      this.setSceneSevenStage('pickup');
      this.sceneSevenStageElapsed = SCENE_SEVEN_PICKUP_DURATION;
      this.updateSceneSeven(0);
      this.sceneSevenStageElapsed = SCENE_SEVEN_REVEAL_DURATION;
      this.updateSceneSeven(0);
    }

    this.updateSceneSevenCamera(0, true);
  }

  private applySceneFiveBCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-5b';
    this.ui.reset();
    this.shellUi.reset();
    this.resetSceneFiveB();

    if (checkpoint === 'continuity') {
      // Preserve the exact reset frame for comparing Scene 5 -> Scene 5b.
    } else if (checkpoint === 'start' || checkpoint === 'approach' || checkpoint === 'approaching') {
      this.sceneFiveBStageElapsed = SCENE_FIVE_B_APPROACH_DURATION * 0.46;
      this.updateSceneFiveB(0);
    } else {
      this.tiger.group.position.copy(this.sceneFiveBAttackPosition);
      this.faceTigerTowardTortoise();

      if (checkpoint === 'push' || checkpoint === 'pushing') {
        this.setSceneFiveBStage('pushing');
        this.sceneFiveBStageElapsed = SCENE_FIVE_B_PUSH_DURATION * 0.52;
        this.updateSceneFiveB(0);
      } else if (checkpoint === 'bite' || checkpoint === 'biting') {
        this.setSceneFiveBStage('pushing');
        this.setSceneFiveBStage('biting');
        this.tiger.setCurrentAnimationProgress(0.48);
        this.sceneFiveBStageElapsed = 1.45;
        this.updateSceneFiveB(0);
      } else if (checkpoint === 'narrator') {
        this.sceneFiveBBiteStart.copy(this.sceneFiveBAttackPosition);
        this.setSceneFiveBStage('narrator');
      } else if (checkpoint === 'annoyed') {
        this.setSceneFiveBStage('annoyed');
        this.tiger.setCurrentAnimationProgress(0.34);
      } else if (checkpoint === 'tiger' || checkpoint === 'complaint' || checkpoint === 'tiger-complaint') {
        this.setSceneFiveBStage('tiger-complaint');
      } else if (checkpoint === 'peek' || checkpoint === 'peeking') {
        this.setSceneFiveBStage('peeking');
        this.tortoise.setCurrentAnimationProgress(0.58);
      } else if (checkpoint === 'tortoise' || checkpoint === 'reply' || checkpoint === 'tortoise-reply') {
        this.setSceneFiveBStage('peeking');
        this.tortoise.setCurrentAnimationProgress(0.999);
        this.setSceneFiveBStage('tortoise-reply');
      } else if (checkpoint === 'scratch' || checkpoint === 'scratching') {
        this.setSceneFiveBStage('peeking');
        this.tortoise.setCurrentAnimationProgress(0.999);
        this.setSceneFiveBStage('scratching');
        this.sceneFiveBStageElapsed = SCENE_FIVE_B_SCRATCH_DURATION * 0.5;
        this.updateSceneFiveB(0);
      } else if (checkpoint === 'question' || checkpoint === 'tiger-question') {
        this.setSceneFiveBStage('peeking');
        this.tortoise.setCurrentAnimationProgress(0.999);
        this.setSceneFiveBStage('tiger-question');
      } else if (checkpoint === 'thinking' || checkpoint === 'smile') {
        this.setSceneFiveBStage('peeking');
        this.tortoise.setCurrentAnimationProgress(0.999);
        this.setSceneFiveBStage('thinking');
        this.sceneFiveBStageElapsed = SCENE_FIVE_B_THINK_DURATION * 0.48;
      } else if (checkpoint === 'complete') {
        this.setSceneFiveBStage('peeking');
        this.tortoise.setCurrentAnimationProgress(0.999);
        this.setSceneFiveBStage('complete');
      }
    }

    this.faceTigerTowardTortoise();
    this.updateSceneFiveBCamera(0, true);
  }

  private applySceneFiveCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-5';
    this.ui.reset();
    this.shellUi.reset();
    this.resetSceneFive();

    if (checkpoint === 'progress' || checkpoint === 'half') {
      this.sceneFiveTapCount = 3;
      this.shellUi.hideObjective();
      this.shellUi.setProgress(this.sceneFiveTapCount);
    } else if (checkpoint === 'tuck' || checkpoint === 'tucking') {
      this.setSceneFiveStage('tucking');
    } else if (checkpoint === 'hidden' || checkpoint === 'surprised') {
      this.setSceneFiveStage('tucking');
      this.tortoise.setCurrentAnimationProgress(1);
      this.setSceneFiveStage('surprised');
    } else if (checkpoint === 'tok' || checkpoint === 'shell-tap') {
      this.setSceneFiveStage('tucking');
      this.tortoise.setCurrentAnimationProgress(1);
      this.setSceneFiveStage('shell-tap');
      // Freeze the visual checkpoint at the second point of contact so scene
      // captures verify the paw against the shell instead of between knocks.
      this.sceneFiveStageElapsed = 0.91;
      this.updateSceneFive(0);
    } else if (checkpoint === 'sniff' || checkpoint === 'sniffing') {
      this.setSceneFiveStage('tucking');
      this.tortoise.setCurrentAnimationProgress(1);
      this.setSceneFiveStage('sniffing');
    } else if (checkpoint === 'side' || checkpoint === 'changing-side') {
      this.setSceneFiveStage('tucking');
      this.tortoise.setCurrentAnimationProgress(1);
      this.setSceneFiveStage('changing-side');
      this.sceneFiveStageElapsed = SCENE_FIVE_CHANGE_SIDE_DURATION * 0.46;
      this.positionSceneFiveTigerAtSide(0.46);
    } else if (
      checkpoint === 'second-tap'
      || checkpoint === 'tap-again'
      || checkpoint === 'bite'
      || checkpoint === 'biting'
      || checkpoint === 'chomp'
    ) {
      this.setSceneFiveStage('tucking');
      this.tortoise.setCurrentAnimationProgress(1);
      this.positionSceneFiveTigerAtSide(1);
      this.setSceneFiveStage('second-tap');
      this.sceneFiveStageElapsed = 0.48;
      this.updateSceneFive(0);
    } else if (checkpoint === 'retreat' || checkpoint === 'retreating' || checkpoint === 'hurt') {
      this.setSceneFiveStage('tucking');
      this.tortoise.setCurrentAnimationProgress(1);
      this.positionSceneFiveTigerAtSide(1);
      this.setSceneFiveStage('second-tap');
      this.sceneFiveStageElapsed = SCENE_FIVE_SECOND_TAP_DURATION;
      this.updateSceneFive(0);
      this.sceneFiveStageElapsed = SCENE_FIVE_RETREAT_DURATION * 0.42;
      this.updateSceneFive(0);
    } else if (checkpoint === 'disappointed' || checkpoint === 'disappointment') {
      this.setSceneFiveStage('tucking');
      this.tortoise.setCurrentAnimationProgress(1);
      this.positionSceneFiveTigerAtSide(1);
      this.setSceneFiveStage('second-tap');
      this.sceneFiveStageElapsed = SCENE_FIVE_SECOND_TAP_DURATION;
      this.updateSceneFive(0);
      this.sceneFiveStageElapsed = SCENE_FIVE_RETREAT_DURATION;
      this.updateSceneFive(0);
      this.tiger.setCurrentAnimationProgress(0.46);
    } else if (checkpoint === 'complete') {
      this.setSceneFiveStage('tucking');
      this.tortoise.setCurrentAnimationProgress(1);
      this.positionSceneFiveTigerAtSide(1);
      this.setSceneFiveStage('second-tap');
      this.sceneFiveStageElapsed = SCENE_FIVE_SECOND_TAP_DURATION;
      this.updateSceneFive(0);
      this.sceneFiveStageElapsed = SCENE_FIVE_RETREAT_DURATION;
      this.updateSceneFive(0);
      this.tiger.setCurrentAnimationProgress(0.999);
      this.setSceneFiveStage('complete');
    }

    this.faceTigerTowardTortoise();
    this.updateSceneFiveCamera(0, true);
  }

  private applySceneThreeCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-3';
    this.ui.reset();
    this.resetSceneThree();

    const times: Record<string, number> = {
      start: 0,
      peace: 1.2,
      growl: SCENE_THREE_GROWL_AT + 0.1,
      approach: 5.3,
      tail: SCENE_THREE_TAIL_AT + 0.2,
      paw: SCENE_THREE_PAW_AT + 0.2,
      stripes: SCENE_THREE_STRIPES_AT + 0.2,
      face: SCENE_THREE_FACE_AT + 0.2,
      hungry: SCENE_THREE_HUNGRY_AT + 0.1,
      sniff: SCENE_THREE_HUNGRY_AT + 1.5,
      pov: SCENE_THREE_HUNGRY_AT + 2.5,
      reaction: SCENE_THREE_HUNGRY_AT + 5.8,
      lunch: SCENE_THREE_HUNGRY_AT + 6.6,
      complete: SCENE_THREE_HUNGRY_AT + 7.2,
      'active-play': SCENE_THREE_HUNGRY_AT + 2.5,
    };
    const stageForCheckpoint: Record<string, SceneThreeStage> = {
      start: 'peace',
      peace: 'peace',
      growl: 'peace',
      approach: 'approach',
      tail: 'tail',
      paw: 'paw',
      stripes: 'stripes',
      face: 'face',
      hungry: 'hungry',
      sniff: 'sniff-dialogue',
      pov: 'pov',
      reaction: 'reaction',
      lunch: 'lunch',
      complete: 'complete',
      'active-play': 'pov',
    };
    const time = times[checkpoint] ?? 0;
    this.sceneElapsed = time;
    this.positionSceneThreeTortoiseAt(time);
    this.setSceneThreeStage(stageForCheckpoint[checkpoint] ?? 'peace');
    this.tiger.playAnimation(TIGER_ANIMATIONS.calmIdle, 0, SCENE_THREE_TIGER_ANIMATION_SPEED);

    if (checkpoint === 'hungry') this.showSceneThreeHungryDialogue();
    else if (checkpoint === 'sniff') this.showSceneThreeSniffDialogue();
    else if (checkpoint === 'lunch') this.showSceneThreeLunchDialogue();

    this.updateSceneThreeCamera(0, true);
  }

  private applySceneFourCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-4';
    this.ui.reset();
    this.resetSceneFour();

    if (checkpoint === 'narrator') {
      this.sceneFourStageElapsed = 1.1;
      this.sceneElapsed = 1.1;
      this.positionSceneFourTigerOnApproach(0.16);
      this.showSceneFourNarrator();
    } else if (checkpoint === 'greeting') {
      this.sceneFourNarratorShown = true;
      this.sceneFourNarratorDismissed = true;
      this.sceneFourApproachComplete = true;
      this.positionSceneFourTigerOnApproach(1);
      this.tryShowSceneFourTigerGreeting();
    } else if (checkpoint === 'reply') {
      this.sceneFourNarratorShown = true;
      this.sceneFourNarratorDismissed = true;
      this.sceneFourApproachComplete = true;
      this.positionSceneFourTigerOnApproach(1);
      this.setSceneFourStage('tortoise-reply');
      this.ui.showDialogue('Tortoise', SCENE_FOUR_TORTOISE_REPLY, () => {
        if (this.activeScene === 'scene-4') this.setSceneFourStage('circling');
      });
    } else if (checkpoint === 'circle' || checkpoint === 'circling') {
      this.positionSceneFourTigerOnApproach(1);
      this.setSceneFourStage('circling');
      this.sceneFourStageElapsed = SCENE_FOUR_CIRCLE_DURATION * 0.48;
      this.positionSceneFourTigerOnCircle(0.48);
    } else if (checkpoint === 'snack') {
      this.positionSceneFourTigerOnApproach(1);
      this.setSceneFourStage('circling');
      this.positionSceneFourTigerOnCircle(1);
      this.showSceneFourTigerSnack();
    } else if (checkpoint === 'worried') {
      this.positionSceneFourTigerOnApproach(1);
      this.setSceneFourStage('circling');
      this.positionSceneFourTigerOnCircle(1);
      this.setSceneFourStage('worried');
    } else if (checkpoint === 'shell' || checkpoint === 'shell-look') {
      this.positionSceneFourTigerOnApproach(1);
      this.setSceneFourStage('circling');
      this.positionSceneFourTigerOnCircle(1);
      this.setSceneFourStage('shell-look');
    } else if (checkpoint === 'complete') {
      this.positionSceneFourTigerOnApproach(1);
      this.setSceneFourStage('circling');
      this.positionSceneFourTigerOnCircle(1);
      this.setSceneFourStage('complete');
    }

    this.faceTigerTowardTortoise();
    if (this.sceneFourStage === 'shell-look' || this.sceneFourStage === 'complete') {
      this.faceTortoiseTowardShell(1);
    } else {
      this.faceTortoiseTowardTiger(1);
    }
    this.updateSceneFourCamera(0, true);
  }

  private applySceneTwoCheckpoint(checkpoint: string): void {
    this.activeScene = 'scene-2';
    this.ui.reset();
    this.resetSceneTwo();

    const times: Record<string, number> = {
      start: 0,
      approach: 2.2,
      butterfly: 5,
      'second-walk': 8.4,
      narrator: SCENE_TWO_NARRATOR_AT + 0.1,
      dialogue: SCENE_TWO_NARRATOR_AT + 1,
      complete: SCENE_TWO_NARRATOR_AT + 2,
      'active-play': 5,
    };
    const time = times[checkpoint] ?? 0;
    this.sceneElapsed = time;
    this.positionSceneTwoTortoiseAt(time);

    if (time >= SCENE_TWO_PAUSE_AT && time < SCENE_TWO_RESUME_AT) {
      this.sceneTwoMotionBeat = 'butterfly-pause';
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.idle, 0, 0.82);
      const dx = this.sceneTwoButterflyOrigin.x - this.tortoise.group.position.x;
      const dz = this.sceneTwoButterflyOrigin.z - this.tortoise.group.position.z;
      this.tortoise.group.rotation.y = Math.atan2(dx, dz);
    } else if (time >= SCENE_TWO_RESUME_AT) {
      this.sceneTwoMotionBeat = 'second-walk';
      this.tortoise.playAnimation(TORTOISE_ANIMATIONS.walk, 0, 0.56);
    }

    if (checkpoint === 'narrator') this.showSceneTwoNarrator();
    else if (checkpoint === 'dialogue') this.showSceneTwoDialogue();
    else if (checkpoint === 'complete') this.sceneTwoPopupStage = 'complete';

    this.updateSceneTwoCamera(0, true);
  }

  private setTestState(name: string): void {
    if (name.startsWith('scene-14:')) {
      this.applySceneFourteenCheckpoint(name.slice('scene-14:'.length));
      return;
    }
    if (name.startsWith('scene-13:')) {
      this.applySceneThirteenCheckpoint(name.slice('scene-13:'.length));
      return;
    }
    if (name.startsWith('scene-11:')) {
      this.applySceneElevenCheckpoint(name.slice('scene-11:'.length));
      return;
    }
    if (name.startsWith('scene-10:')) {
      this.applySceneTenCheckpoint(name.slice('scene-10:'.length));
      return;
    }
    if (name.startsWith('scene-9:')) {
      this.applySceneNineCheckpoint(name.slice('scene-9:'.length));
      return;
    }
    if (name.startsWith('scene-8:')) {
      this.applySceneEightCheckpoint(name.slice('scene-8:'.length));
      return;
    }
    if (name.startsWith('scene-7:')) {
      this.applySceneSevenCheckpoint(name.slice('scene-7:'.length));
      return;
    }
    if (name.startsWith('scene-6:')) {
      this.applySceneSixCheckpoint(name.slice('scene-6:'.length));
      return;
    }
    if (name.startsWith('scene-5b:')) {
      this.applySceneFiveBCheckpoint(name.slice('scene-5b:'.length));
      return;
    }
    if (name.startsWith('scene-5:')) {
      this.applySceneFiveCheckpoint(name.slice('scene-5:'.length));
      return;
    }
    if (name.startsWith('scene-4:')) {
      this.applySceneFourCheckpoint(name.slice('scene-4:'.length));
      return;
    }
    if (name.startsWith('scene-3:')) {
      this.applySceneThreeCheckpoint(name.slice('scene-3:'.length));
      return;
    }
    if (name.startsWith('scene-2:')) {
      this.applySceneTwoCheckpoint(name.slice('scene-2:'.length));
      return;
    }
    if (name === 'opening-settled' || name === 'active-play') {
      if (this.activeScene === 'scene-14') {
        this.applySceneFourteenCheckpoint('narrator');
        return;
      }
      if (this.activeScene === 'scene-13') {
        this.applySceneThirteenCheckpoint('brain');
        return;
      }
      if (this.activeScene === 'scene-11') {
        this.applySceneElevenCheckpoint('gameplay');
        return;
      }
      if (this.activeScene === 'scene-10') {
        this.applySceneTenCheckpoint('flight');
        return;
      }
      if (this.activeScene === 'scene-9') {
        this.applySceneNineCheckpoint('deep');
        return;
      }
      if (this.activeScene === 'scene-8') {
        this.applySceneEightCheckpoint('tortoise-close');
        return;
      }
      if (this.activeScene === 'scene-7') {
        this.applySceneSevenCheckpoint('pickup');
        return;
      }
      if (this.activeScene === 'scene-6') {
        this.applySceneSixCheckpoint('think');
        return;
      }
      if (this.activeScene === 'scene-5b') {
        this.applySceneFiveBCheckpoint('bite');
        return;
      }
      if (this.activeScene === 'scene-5') {
        this.applySceneFiveCheckpoint('progress');
        return;
      }
      if (this.activeScene === 'scene-4') {
        this.applySceneFourCheckpoint('circle');
        return;
      }
      if (this.activeScene === 'scene-3') {
        this.applySceneThreeCheckpoint('pov');
        return;
      }
      if (this.activeScene === 'scene-2') {
        this.applySceneTwoCheckpoint('butterfly');
        return;
      }
      this.sceneElapsed = SCENE_ONE_OPENING_DURATION + 0.25;
      this.sceneOneNarratorShown = true;
      this.ui.showNarrator('Once upon a time, beside a beautiful forest river, lived a small but very clever tortoise.');
      this.camera.position.set(
        this.tortoise.group.position.x + 5.4,
        4.5,
        this.tortoise.group.position.z - 5.1,
      );
      this.camera.lookAt(
        this.tortoise.group.position.x,
        0.58,
        this.tortoise.group.position.z + 0.15,
      );
      return;
    }
    if (name.startsWith('tortoise-animation:')) {
      this.tortoise.playAnimation(name.slice('tortoise-animation:'.length), 0, 1);
    }
  }

  private installDiagnostics(): void {
    const diagnosticWindow = window as DiagnosticWindow;
    diagnosticWindow.__THREE_GAME_DIAGNOSTICS__ = {
      renderer: this.renderer.info,
      scene: () => ({
        scene: this.activeScene,
        storyMode: this.storyMode ? 'continuous' : 'isolated',
        storyComplete: this.storyComplete,
        sceneIndex: STORY_SCENE_ORDER.indexOf(this.activeScene),
        sceneHistory: [...this.storySceneHistory],
        transitionCount: this.storyTransitionCount,
        transition: {
          active: this.pendingStoryScene !== undefined
            || this.storyCameraBlendElapsed < (this.reducedMotion ? 0.35 : STORY_CAMERA_BLEND_DURATION),
          from: this.storyTransitionFrom,
          to: this.pendingStoryScene ?? this.activeScene,
          pendingDelay: Number(Math.max(0, this.pendingStoryDelay).toFixed(3)),
          cameraBlendProgress: Number(THREE.MathUtils.clamp(
            this.storyCameraBlendElapsed / (this.reducedMotion ? 0.35 : STORY_CAMERA_BLEND_DURATION),
            0,
            1,
          ).toFixed(3)),
        },
        elapsed: Number(this.elapsed.toFixed(2)),
        sceneElapsed: Number(this.sceneElapsed.toFixed(2)),
        openingProgress: this.activeScene === 'scene-1'
          ? Number(Math.min(1, this.sceneElapsed / SCENE_ONE_OPENING_DURATION).toFixed(3))
          : undefined,
        sceneTwo: this.activeScene === 'scene-2' ? {
          motionBeat: this.sceneTwoMotionBeat,
          popupStage: this.sceneTwoPopupStage,
          checkpoint: `scene-2:${this.sceneTwoPopupStage === 'waiting' ? this.sceneTwoMotionBeat : this.sceneTwoPopupStage}`,
          butterflyVisible: this.butterfly.group.visible,
          butterflyPosition: {
            x: Number(this.butterfly.group.position.x.toFixed(2)),
            y: Number(this.butterfly.group.position.y.toFixed(2)),
            z: Number(this.butterfly.group.position.z.toFixed(2)),
          },
        } : undefined,
        sceneThree: this.activeScene === 'scene-3' ? {
          stage: this.sceneThreeStage,
          checkpoint: `scene-3:${this.sceneThreeStage}`,
          growlPlayed: this.sceneThreeGrowlPlayed,
          cameraSetup: this.sceneThreeStage === 'peace'
            ? 'riverbank'
            : this.sceneThreeStage === 'approach'
              ? 'single-dolly'
              : this.sceneThreeStage === 'tail' || this.sceneThreeStage === 'paw' || this.sceneThreeStage === 'stripes'
                ? 'wide-reveal'
                : this.isSceneThreeTortoiseView()
                  ? 'tiger-pov'
                  : 'single-reveal',
          tigerPosition: {
            x: Number(this.tiger.group.position.x.toFixed(2)),
            y: Number(this.tiger.group.position.y.toFixed(2)),
            z: Number(this.tiger.group.position.z.toFixed(2)),
          },
        } : undefined,
        sceneFour: this.activeScene === 'scene-4' ? {
          stage: this.sceneFourStage,
          checkpoint: `scene-4:${this.sceneFourStage}`,
          narratorShown: this.sceneFourNarratorShown,
          approachComplete: this.sceneFourApproachComplete,
          cameraSetup: this.sceneFourStage === 'emerging' ? 'two-shot-dolly' : 'encounter-two-shot',
          tigerPosition: {
            x: Number(this.tiger.group.position.x.toFixed(2)),
            y: Number(this.tiger.group.position.y.toFixed(2)),
            z: Number(this.tiger.group.position.z.toFixed(2)),
          },
        } : undefined,
        sceneFive: this.activeScene === 'scene-5' ? {
          stage: this.sceneFiveStage,
          checkpoint: `scene-5:${this.sceneFiveStage}`,
          hideTaps: this.sceneFiveTapCount,
          requiredTaps: SCENE_FIVE_REQUIRED_TAPS,
          actionVisible: this.shellUi.isActionVisible(),
          pawContactDistance: this.sceneFivePawContactDistance === undefined
            ? undefined
            : Number(this.sceneFivePawContactDistance.toFixed(3)),
          cameraSetup: 'encounter-two-shot',
          tigerPosition: {
            x: Number(this.tiger.group.position.x.toFixed(2)),
            y: Number(this.tiger.group.position.y.toFixed(2)),
            z: Number(this.tiger.group.position.z.toFixed(2)),
          },
        } : undefined,
        sceneFiveB: this.activeScene === 'scene-5b' ? {
          stage: this.sceneFiveBStage,
          checkpoint: `scene-5b:${this.sceneFiveBStage}`,
          cameraSetup: this.sceneFiveBStage === 'thinking' || this.sceneFiveBStage === 'complete'
            ? 'tortoise-thinking-closeup'
            : this.sceneFiveBStage === 'tiger-complaint'
              || this.sceneFiveBStage === 'scratching'
              || this.sceneFiveBStage === 'tiger-question'
              ? 'tiger-speaker-medium'
              : 'shell-encounter-two-shot',
          pawContactDistance: this.sceneFivePawContactDistance === undefined
            ? undefined
            : Number(this.sceneFivePawContactDistance.toFixed(3)),
          biteDistance: this.sceneFiveBBiteDistance === undefined
            ? undefined
            : Number(this.sceneFiveBBiteDistance.toFixed(3)),
          tigerShellDistance: Number(this.tiger.group.position.distanceTo(this.tortoise.group.position).toFixed(3)),
          tigerPosition: {
            x: Number(this.tiger.group.position.x.toFixed(2)),
            y: Number(this.tiger.group.position.y.toFixed(2)),
            z: Number(this.tiger.group.position.z.toFixed(2)),
          },
        } : undefined,
        sceneSix: this.activeScene === 'scene-6' ? {
          stage: this.sceneSixStage,
          checkpoint: `scene-6:${this.sceneSixStage}`,
          cameraSetup: this.sceneSixStage === 'tiger-interest' || this.sceneSixStage === 'tiger-thinks'
            ? 'tiger-medium-river-reaction'
            : 'tortoise-river-closeup',
          ideaSparkleVisible: this.ideaSparkle.group.visible,
          tigerPosition: {
            x: Number(this.tiger.group.position.x.toFixed(2)),
            y: Number(this.tiger.group.position.y.toFixed(2)),
            z: Number(this.tiger.group.position.z.toFixed(2)),
          },
        } : undefined,
        sceneSeven: this.activeScene === 'scene-7' ? {
          stage: this.sceneSevenStage,
          checkpoint: `scene-7:${this.sceneSevenStage}`,
          cameraSetup: this.sceneSevenStage === 'tiger-proud'
            ? 'tiger-proud-medium'
            : this.sceneSevenStage === 'tortoise-flatter' || this.sceneSevenStage === 'holding-laugh'
              ? 'tortoise-reaction-medium'
              : this.sceneSevenStage === 'pickup-camera' || this.sceneSevenStage === 'pickup'
                ? 'tiger-rear-occluded-pickup'
                : 'pickup-final-reveal',
          pickupProgress: this.sceneSevenStage === 'pickup-camera'
            ? 0
            : this.sceneSevenStage === 'pickup'
            ? Number(THREE.MathUtils.clamp(this.sceneSevenStageElapsed / SCENE_SEVEN_PICKUP_DURATION, 0, 1).toFixed(3))
            : this.sceneSevenStage === 'pickup-reveal' || this.sceneSevenStage === 'complete' ? 1 : 0,
          tigerTortoiseDistance: Number(this.tiger.group.position.distanceTo(this.tortoise.group.position).toFixed(3)),
          tigerPosition: {
            x: Number(this.tiger.group.position.x.toFixed(2)),
            y: Number(this.tiger.group.position.y.toFixed(2)),
            z: Number(this.tiger.group.position.z.toFixed(2)),
          },
        } : undefined,
        sceneEight: this.activeScene === 'scene-8' ? {
          stage: this.sceneEightStage,
          checkpoint: `scene-8:${this.sceneEightStage}`,
          cameraSetup: 'carrying-side-follow',
          routeProgress: Number(THREE.MathUtils.clamp(this.sceneElapsed / SCENE_EIGHT_DURATION, 0, 1).toFixed(3)),
          tigerTortoiseDistance: Number(this.tiger.group.position.distanceTo(this.tortoise.group.position).toFixed(3)),
          tigerGroundY: Number(this.tiger.group.position.y.toFixed(3)),
          carryY: Number(this.tortoise.group.position.y.toFixed(3)),
          carryRoll: Number(this.tortoise.group.rotation.z.toFixed(4)),
        } : undefined,
        sceneNine: this.activeScene === 'scene-9' ? {
          stage: this.sceneNineStage,
          checkpoint: `scene-9:${this.sceneNineStage}`,
          cameraSetup: this.sceneNineStage === 'tiger-arrival'
            || this.sceneNineStage === 'tiger-question'
            || this.sceneNineStage === 'tiger-agrees'
            ? 'riverbank-tiger-medium'
            : 'riverbank-tortoise-medium',
          tigerTortoiseDistance: Number(this.tiger.group.position.distanceTo(this.tortoise.group.position).toFixed(3)),
        } : undefined,
        sceneTen: this.activeScene === 'scene-10' ? {
          stage: this.sceneTenStage,
          checkpoint: `scene-10:${this.sceneTenStage}`,
          cameraSetup: 'river-throw-side-shot',
          tortoiseVisible: this.tortoise.group.visible,
          splashVisible: this.riverSplash.isVisible(),
          tigerThrowPose: Number(this.tiger.getThrowPose().toFixed(3)),
        } : undefined,
        sceneEleven: this.activeScene === 'scene-11' ? {
          stage: this.sceneElevenStage,
          checkpoint: `scene-11:${this.sceneElevenStage}`,
          cameraSetup: this.sceneElevenTigerLookBackTimer > 0
            ? 'tiger-riverbank-look-back'
            : this.sceneElevenStage === 'swimming'
            || this.sceneElevenStage === 'safe-objective'
            || this.sceneElevenStage === 'safe-swimming'
            || this.sceneElevenStage === 'safe-arrival'
            || this.sceneElevenStage === 'safe-narrator'
            || this.sceneElevenStage === 'complete'
            ? 'tortoise-third-person-river-follow'
            : this.sceneElevenStage === 'reveal'
              || this.sceneElevenStage === 'tortoise-thanks'
              || this.sceneElevenStage === 'tortoise-explains'
              || this.sceneElevenStage === 'objective'
              ? 'river-reveal-two-shot'
              : 'tiger-water-watch',
          bubblesActive: this.riverStoryBubbles.getActiveCount(),
          controlsEnabled: this.input.isMovementEnabled(),
          riverProgress: Number(this.riverEscapeCourse.getProgress(this.tortoise.group.position.z).toFixed(3)),
          safeProgress: Number(this.safeRiverReach.getProgress(this.tortoise.group.position.z).toFixed(3)),
          safeZoneDistance: Number(this.safeRiverReach.distanceToSafeZone(this.tortoise.group.position).toFixed(3)),
          safeCourseVisible: this.safeRiverReach.isVisible(),
          safeObstacleCount: this.safeRiverReach.obstacles.length,
          tigerSafeSpeechIndex: this.sceneElevenSafeSpeechIndex,
          tigerLookBackRemaining: Number(this.sceneElevenTigerLookBackTimer.toFixed(3)),
          riverCompassVisible: this.riverCompass.isVisible(),
          riverCompassDistance: Number(this.riverCompass.getDistance().toFixed(2)),
          swimVelocityX: Number(this.sceneElevenSwimVelocityX.toFixed(3)),
          collisionCount: this.sceneElevenCollisionCount,
          lastObstacle: this.sceneElevenLastObstacle,
          obstacleCount: this.riverEscapeCourse.obstacles.length,
          tigerGroundY: Number(this.tiger.group.position.y.toFixed(3)),
          tortoiseVisible: this.tortoise.group.visible,
          tortoiseY: Number(this.tortoise.group.position.y.toFixed(3)),
          waterlineY: 0.01,
          swimWakeVisible: this.tortoiseSwimWake.isVisible(),
          camera: {
            x: Number(this.camera.position.x.toFixed(2)),
            y: Number(this.camera.position.y.toFixed(2)),
            z: Number(this.camera.position.z.toFixed(2)),
          },
          cameraTarget: {
            x: Number(this.cameraTarget.x.toFixed(2)),
            y: Number(this.cameraTarget.y.toFixed(2)),
            z: Number(this.cameraTarget.z.toFixed(2)),
          },
        } : undefined,
        sceneThirteen: this.activeScene === 'scene-13' ? {
          stage: this.sceneThirteenStage,
          checkpoint: `scene-13:${this.sceneThirteenStage}`,
          cameraSetup: this.sceneThirteenStage === 'tiger-accuses'
            || this.sceneThirteenStage === 'tiger-confused'
            || this.sceneThirteenStage === 'tiger-reflects'
            ? 'opposite-bank-tiger-medium'
            : this.sceneThirteenStage === 'climbing' || this.sceneThirteenStage === 'water-shake'
              ? 'safe-rock-river-two-shot'
              : 'safe-rock-tortoise-medium',
          tortoiseOnRock: this.tortoise.group.position.distanceTo(this.sceneThirteenRock) < 0.18,
          riverSeparation: Number(this.tiger.group.position.distanceTo(this.tortoise.group.position).toFixed(2)),
          tortoiseGrounded: this.sceneThirteenStage !== 'climbing',
        } : undefined,
        sceneFourteen: this.activeScene === 'scene-14' ? {
          stage: this.sceneFourteenStage,
          checkpoint: `scene-14:${this.sceneFourteenStage}`,
          cameraSetup: 'warm-river-aerial-pullback',
          pullbackProgress: Number(THREE.MathUtils.clamp(
            this.sceneFourteenElapsed / SCENE_FOURTEEN_PULL_DURATION,
            0,
            1,
          ).toFixed(3)),
          birdsVisible: this.endingBirdFlock.isVisible(),
        } : undefined,
        river: {
          widthAtStoryPool: Number(this.world.riverWidthAt(5).toFixed(2)),
          widthAtTortoise: Number(this.world.riverWidthAt(this.tortoise.group.position.z).toFixed(2)),
        },
        popup: this.ui.getVisibleKind(),
        camera: {
          position: {
            x: Number(this.camera.position.x.toFixed(3)),
            y: Number(this.camera.position.y.toFixed(3)),
            z: Number(this.camera.position.z.toFixed(3)),
          },
          target: {
            x: Number(this.cameraTarget.x.toFixed(3)),
            y: Number(this.cameraTarget.y.toFixed(3)),
            z: Number(this.cameraTarget.z.toFixed(3)),
          },
        },
        tortoise: {
          x: Number(this.tortoise.group.position.x.toFixed(2)),
          y: Number(this.tortoise.group.position.y.toFixed(2)),
          z: Number(this.tortoise.group.position.z.toFixed(2)),
          visible: this.tortoise.group.visible,
          activeAnimation: this.tortoise.getCurrentAnimation(),
          asset: this.tortoise.diagnostics,
        },
        tiger: this.activeScene === 'scene-3'
          || this.activeScene === 'scene-4'
          || this.activeScene === 'scene-5'
          || this.activeScene === 'scene-5b'
          || this.activeScene === 'scene-6'
          || this.activeScene === 'scene-7'
          || this.activeScene === 'scene-8'
          || this.activeScene === 'scene-9'
          || this.activeScene === 'scene-10'
          || this.activeScene === 'scene-11'
          || this.activeScene === 'scene-13'
          || this.activeScene === 'scene-14' ? {
          x: Number(this.tiger.group.position.x.toFixed(2)),
          y: Number(this.tiger.group.position.y.toFixed(2)),
          z: Number(this.tiger.group.position.z.toFixed(2)),
          visible: this.tiger.group.visible,
          activeAnimation: this.tiger.getCurrentAnimation(),
          asset: this.tiger.diagnostics,
        } : undefined,
        meshes: this.renderer.info.memory.geometries,
        textures: this.renderer.info.memory.textures,
        calls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        dpr: this.renderer.getPixelRatio(),
        shadows: this.renderer.shadowMap.enabled,
        toneMapping: 'ACESFilmic',
      }),
    };
    diagnosticWindow.__THREE_GAME_TEST_HOOKS__ = {
      seed: () => undefined,
      setState: (name: string) => this.setTestState(name),
      advanceStory: () => this.advanceStoryForTest(),
      advanceTime: (seconds: number) => this.advanceTimeForTest(seconds),
      setPausedForScreenshot: (paused: boolean) => {
        if (paused) this.pause();
        else this.resume();
      },
      setReducedMotion: (enabled: boolean) => {
        this.reducedMotion = enabled;
      },
      hideDebugUi: () => undefined,
    };
  }

  private render = (): void => {
    if (!this.running || this.disposed) return;
    const now = performance.now();
    const delta = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.render);
  };
}
