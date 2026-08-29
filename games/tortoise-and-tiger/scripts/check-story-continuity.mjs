const [, , endpoint, navigateUrl = 'http://localhost:5173/games/tortoise-and-tiger/'] = process.argv;

if (!endpoint) {
  throw new Error('Usage: node check-story-continuity.mjs <websocket> [url]');
}

const expectedScenes = [
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

const socket = new WebSocket(endpoint);
let nextId = 0;
const pending = new Map();
const pageErrors = [];

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') {
    pageErrors.push(message.params.exceptionDetails.text);
  }
  const handler = pending.get(message.id);
  if (!handler) return;
  pending.delete(message.id);
  handler(message);
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, (message) => {
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = await evaluate(`Boolean(
      window.__THREE_GAME_TEST_HOOKS__
      && window.__THREE_GAME_DIAGNOSTICS__
      && !document.querySelector('#game-loader:not(.is-complete)')
    )`);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Game did not become ready.');
}

async function diagnostics() {
  return JSON.parse(await evaluate('JSON.stringify(window.__THREE_GAME_DIAGNOSTICS__.scene())'));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: navigateUrl });
await waitUntilReady();
await evaluate(`(() => {
  window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true);
  window.__THREE_GAME_TEST_HOOKS__.setReducedMotion(false);
})()`);

let state = await diagnostics();
if (state.storyMode !== 'continuous' || state.scene !== expectedScenes[0]) {
  throw new Error(`Expected continuous Scene 1 start, got ${state.storyMode} ${state.scene}.`);
}

const cameraSteps = [];
for (const expectedScene of expectedScenes.slice(1)) {
  const before = await diagnostics();
  await evaluate('window.__THREE_GAME_TEST_HOOKS__.advanceStory()');
  const entered = await diagnostics();
  if (entered.scene !== expectedScene) {
    throw new Error(`Expected ${expectedScene}, got ${entered.scene}.`);
  }
  const cameraStep = distance(before.camera.position, entered.camera.position);
  const targetStep = distance(before.camera.target, entered.camera.target);
  cameraSteps.push({ from: before.scene, to: entered.scene, cameraStep, targetStep });
  if (cameraStep > 0.01 || targetStep > 0.01) {
    throw new Error(`Camera cut detected at ${before.scene} -> ${entered.scene}.`);
  }
  await evaluate('window.__THREE_GAME_TEST_HOOKS__.advanceTime(1.5)');
  state = await diagnostics();
  if (state.transition.active) throw new Error(`Camera blend did not settle in ${state.scene}.`);
}

if (JSON.stringify(state.sceneHistory) !== JSON.stringify(expectedScenes)) {
  throw new Error(`Unexpected story history: ${JSON.stringify(state.sceneHistory)}`);
}
if (state.transitionCount !== expectedScenes.length - 1) {
  throw new Error(`Expected ${expectedScenes.length - 1} transitions, got ${state.transitionCount}.`);
}

await send('Page.navigate', { url: navigateUrl });
await waitUntilReady();
await evaluate(`(() => {
  window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true);
  window.__THREE_GAME_TEST_HOOKS__.advanceTime(10.3);
  window.dispatchEvent(new PointerEvent('pointerdown'));
  window.__THREE_GAME_TEST_HOOKS__.advanceTime(0.8);
})()`);
let naturalState = await diagnostics();
if (naturalState.scene !== 'scene-2') {
  throw new Error(`Opening narrator did not naturally continue to Scene 2: ${naturalState.scene}.`);
}
await evaluate(`(() => {
  window.__THREE_GAME_TEST_HOOKS__.advanceTime(11.3);
  window.dispatchEvent(new PointerEvent('pointerdown'));
  window.__THREE_GAME_TEST_HOOKS__.advanceTime(0.5);
  window.dispatchEvent(new PointerEvent('pointerdown'));
  window.__THREE_GAME_TEST_HOOKS__.advanceTime(0.8);
})()`);
naturalState = await diagnostics();
if (naturalState.scene !== 'scene-3') {
  throw new Error(`Scene 2 dialogue did not naturally continue to Scene 3: ${naturalState.scene}.`);
}

await send('Page.navigate', { url: `${navigateUrl}?scene=4` });
await waitUntilReady();
await evaluate(`(() => {
  window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true);
  window.__THREE_GAME_TEST_HOOKS__.advanceStory();
})()`);
const isolated = await diagnostics();
if (isolated.storyMode !== 'isolated' || isolated.scene !== 'scene-4') {
  throw new Error(`Scene URL did not remain isolated: ${isolated.storyMode} ${isolated.scene}.`);
}

await send('Page.navigate', { url: `${navigateUrl}?scene=11&state=safe-narrator` });
await waitUntilReady();
await evaluate(`(() => {
  window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true);
  window.dispatchEvent(new PointerEvent('pointerdown'));
  window.__THREE_GAME_TEST_HOOKS__.advanceTime(0.8);
})()`);
const isolatedEnding = await diagnostics();
if (isolatedEnding.storyMode !== 'isolated'
  || isolatedEnding.scene !== 'scene-11'
  || isolatedEnding.sceneEleven?.stage !== 'complete') {
  throw new Error(`Scene 11 debug ending did not stay isolated: ${JSON.stringify(isolatedEnding)}`);
}
if (pageErrors.length > 0) throw new Error(`Page errors: ${JSON.stringify(pageErrors)}`);

process.stdout.write(`${JSON.stringify({
  ok: true,
  sceneOrder: expectedScenes,
  transitionCount: state.transitionCount,
  maxCameraEntryStep: Math.max(...cameraSteps.map((item) => item.cameraStep)),
  maxTargetEntryStep: Math.max(...cameraSteps.map((item) => item.targetStep)),
  naturalOpeningReached: naturalState.scene,
  isolatedSceneUrl: isolated.scene,
  isolatedEnding: `${isolatedEnding.scene}:${isolatedEnding.sceneEleven.stage}`,
}, null, 2)}\n`);
socket.close();
