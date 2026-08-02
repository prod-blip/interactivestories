import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './character-lab.css';
import { MouseMarker } from './game/objects/MouseMarker';
import { PilgrimRatReconstruction } from './game/objects/PilgrimRatReconstruction';
import { SleepingLion } from './game/objects/SleepingLion';
import { TrappedLion } from './game/objects/TrappedLion';
import { resizeRendererToDisplaySize } from './game/responsive';
import { addDefaultLighting, createRenderer } from './game/scene/rendering';
import type { InputState } from './game/types';

type CharacterKind = 'reconstruction' | 'lion' | 'trappedLion' | 'mouse';
type LabCharacter = SleepingLion | TrappedLion | MouseMarker | PilgrimRatReconstruction;

const root = document.querySelector<HTMLDivElement>('#character-lab');
if (!root) throw new Error('Missing #character-lab root');
const labRoot: HTMLDivElement = root;

labRoot.innerHTML = `
  <main class="lab">
    <section class="lab__panel">
      <p class="lab__eyebrow">Shared game-code preview</p>
      <h1>Character Lab</h1>
      <label class="lab__field">
        Character
        <select id="lab-character">
          <option value="reconstruction">Pilgrim Rat Reconstruction</option>
          <option value="lion">Sleeping Lion</option>
          <option value="trappedLion">Trapped Lion</option>
          <option value="mouse">Pilgrim Mouse</option>
        </select>
      </label>
      <label class="lab__field">
        <span>Animation speed: <output id="lab-speed-value">1.0×</output></span>
        <input id="lab-speed" type="range" min="0.2" max="2" step="0.1" value="1" />
      </label>
      <div id="lab-actions" class="lab__actions"></div>
      <div class="lab__footer">
        <span id="lab-status">Sleeping</span>
        <a href="/">Return to game</a>
      </div>
    </section>
    <p class="lab__help">Drag to orbit · Scroll to zoom</p>
  </main>
`;

function requireElement<T extends Element>(selector: string): T {
  const element = labRoot.querySelector<T>(selector);
  if (!element) throw new Error(`Missing Character Lab element: ${selector}`);
  return element;
}

const stage = requireElement<HTMLElement>('.lab');
const characterSelect = requireElement<HTMLSelectElement>('#lab-character');
const speedInput = requireElement<HTMLInputElement>('#lab-speed');
const speedValue = requireElement<HTMLOutputElement>('#lab-speed-value');
const actions = requireElement<HTMLDivElement>('#lab-actions');
const status = requireElement<HTMLElement>('#lab-status');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10150f);
scene.fog = new THREE.Fog(0x10150f, 14, 34);
addDefaultLighting(scene);
const warmKey = new THREE.DirectionalLight(0xffd9a8, 2.15);
warmKey.position.set(-4.5, 8, -5);
warmKey.castShadow = true;
warmKey.shadow.mapSize.setScalar(1024);
scene.add(warmKey);
const warmAmbient = new THREE.HemisphereLight(0xd8c8a6, 0x182019, 0.95);
scene.add(warmAmbient);
const forestRim = new THREE.DirectionalLight(0x8ca58b, 1.1);
forestRim.position.set(5, 5, 4);
scene.add(forestRim);

const renderer = createRenderer();
stage.prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
const reconstructionReviewView = new URLSearchParams(window.location.search).get('review');
camera.position.set(
  reconstructionReviewView === 'rear' ? -4.8 : 0.8,
  reconstructionReviewView === 'rear' ? 3.5 : 3.75,
  reconstructionReviewView === 'rear' ? 8.2 : -9,
);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 2.1, 0);
controls.minDistance = 2.4;
controls.maxDistance = 15;

const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x253d2d, roughness: 1 });
const ground = new THREE.Mesh(new THREE.CircleGeometry(7, 48), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xbda96a, transparent: true, opacity: 0.28 });
const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.63, 64), ringMaterial);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.006;
scene.add(ring);

const clock = new THREE.Clock();
const mouseInput: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  action: false,
  moveX: 0,
  moveY: 0,
  pointerX: 0,
  pointerY: 0,
};

let characterKind: CharacterKind = 'reconstruction';
let character: LabCharacter = new PilgrimRatReconstruction();
let animationSpeed = 1;
let paused = false;
let mouseMode: 'idle' | 'walk' | 'action' | 'plead' = 'idle';
let mousePleaDistance = 0;
scene.add(character.group);

function actionNames(kind: CharacterKind): Array<[string, string]> {
  if (kind === 'reconstruction') return [['idle', 'Idle study']];
  if (kind === 'lion') return [['sleep', 'Sleeping'], ['wake', 'Wake up'], ['laugh', 'Laugh'], ['leave', 'Leave']];
  if (kind === 'trappedLion') return [['struggle', 'Struggle'], ['calm', 'Calm']];
  return [['idle', 'Idle'], ['walk', 'Walk'], ['action', 'Action'], ['plead', 'Plead / Tremble']];
}

function rebuildActions(): void {
  actions.replaceChildren();
  for (const [action, label] of actionNames(characterKind)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.textContent = label;
    actions.appendChild(button);
  }
  const pauseButton = document.createElement('button');
  pauseButton.type = 'button';
  pauseButton.dataset.action = 'pause';
  pauseButton.textContent = 'Pause';
  actions.appendChild(pauseButton);
  setActiveButton(characterKind === 'lion' ? 'sleep' : characterKind === 'trappedLion' ? 'struggle' : 'idle');
}

function setActiveButton(action: string): void {
  for (const button of actions.querySelectorAll('button')) {
    button.classList.toggle('is-active', button.dataset.action === action);
  }
}

function replaceCharacter(kind: CharacterKind): void {
  scene.remove(character.group);
  character.dispose();
  characterKind = kind;
  character = kind === 'reconstruction'
    ? new PilgrimRatReconstruction()
    : kind === 'lion'
      ? new SleepingLion()
    : kind === 'trappedLion'
      ? new TrappedLion()
      : new MouseMarker();
  if (kind === 'mouse') character.group.position.set(0, 0.02, 0);
  if (kind === 'reconstruction') {
    camera.position.set(
      reconstructionReviewView === 'rear' ? -4.8 : 0.8,
      reconstructionReviewView === 'rear' ? 3.5 : 3.75,
      reconstructionReviewView === 'rear' ? 8.2 : -9,
    );
    controls.target.set(0, 2.1, 0);
  } else {
    camera.position.set(4.4, 2.9, -5.4);
    controls.target.set(0, 0.75, 0);
  }
  scene.add(character.group);
  mouseMode = 'idle';
  mousePleaDistance = 0;
  paused = false;
  status.textContent = kind === 'reconstruction'
    ? 'Sandbox reconstruction'
    : kind === 'lion'
      ? 'Sleeping'
      : kind === 'trappedLion'
        ? 'Struggling'
        : 'Idle';
  rebuildActions();
}

function playAction(action: string): void {
  if (action === 'pause') {
    paused = !paused;
    status.textContent = paused ? 'Paused' : 'Playing';
    setActiveButton(paused ? 'pause' : '');
    return;
  }

  paused = false;
  if (character instanceof TrappedLion) {
    if (action === 'struggle') character.struggle();
    if (action === 'calm') character.calm();
  } else if (character instanceof SleepingLion) {
    if (action === 'sleep') {
      replaceCharacter('lion');
      return;
    }
    if (action === 'wake') character.wake();
    if (action === 'laugh') {
      character.wake();
      character.laugh();
    }
    if (action === 'leave') {
      character.wake();
      character.leave();
    }
  } else if (character instanceof PilgrimRatReconstruction) {
    status.textContent = 'Idle material study';
  } else {
    mouseMode = action as typeof mouseMode;
    character.setTrembling(mouseMode === 'plead');
    if (mouseMode === 'plead') mousePleaDistance = 0;
  }
  status.textContent = action.charAt(0).toUpperCase() + action.slice(1);
  setActiveButton(action);
}

actions.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if (button?.dataset.action) playAction(button.dataset.action);
});

characterSelect.addEventListener('change', () => replaceCharacter(characterSelect.value as CharacterKind));
speedInput.addEventListener('input', () => {
  animationSpeed = Number(speedInput.value);
  speedValue.value = `${animationSpeed.toFixed(1)}×`;
});

function updateCharacter(delta: number): void {
  if (character instanceof PilgrimRatReconstruction) {
    character.update(delta);
    return;
  }
  if (character instanceof SleepingLion) {
    character.update(delta);
    return;
  }
  if (character instanceof TrappedLion) {
    character.update(delta);
    return;
  }

  mouseInput.up = mouseMode === 'walk';
  mouseInput.action = mouseMode === 'action';
  character.update(delta, mouseInput);
  mousePleaDistance = THREE.MathUtils.damp(mousePleaDistance, mouseMode === 'plead' ? 0.65 : 0, 5.5, delta);
  character.group.position.x = 0;
  character.group.position.z = mousePleaDistance;
}

function animate(): void {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05) * animationSpeed;
  resizeRendererToDisplaySize(renderer, camera);
  if (!paused) updateCharacter(delta);
  controls.update();
  renderer.render(scene, camera);
}

rebuildActions();
status.textContent = 'Sandbox reconstruction';
animate();

window.addEventListener('beforeunload', () => {
  controls.dispose();
  character.dispose();
  ground.geometry.dispose();
  groundMaterial.dispose();
  ring.geometry.dispose();
  ringMaterial.dispose();
  renderer.dispose();
});
