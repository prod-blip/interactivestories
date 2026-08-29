import { writeFile } from 'node:fs/promises';

const [, , endpoint, output, navigateUrl, widthArg = '1440', heightArg = '900', dprArg = '1', mode = 'narrator'] = process.argv;
const requestedState = process.argv[9] ?? 'opening-settled';
const advanceCount = Number(process.argv[10] ?? (mode === 'world' ? '1' : '0'));
if (!endpoint || !output || !navigateUrl) {
  throw new Error('Usage: node capture-scene.mjs <websocket> <output> <url> [width] [height] [dpr]');
}

const socket = new WebSocket(endpoint);
let nextId = 0;
const pending = new Map();
const consoleMessages = [];
const pageErrors = [];

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.consoleAPICalled') {
    consoleMessages.push({
      type: message.params.type,
      values: message.params.args.map((arg) => arg.value ?? arg.description),
    });
  }
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

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(widthArg),
  height: Number(heightArg),
  deviceScaleFactor: Number(dprArg),
  mobile: Number(widthArg) < 600,
});
await send('Page.navigate', { url: navigateUrl });
for (let attempt = 0; attempt < 80; attempt += 1) {
  const readiness = await send('Runtime.evaluate', {
    expression: `Boolean(window.__THREE_GAME_TEST_HOOKS__ && window.__THREE_GAME_DIAGNOSTICS__ && !document.querySelector('#game-loader:not(.is-complete)'))`,
    returnByValue: true,
  });
  if (readiness.result.value) break;
  if (attempt === 79) {
    const debugState = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        bodyText: document.body?.innerText,
        loaderClass: document.querySelector('#game-loader')?.className,
        diagnosticsReady: Boolean(window.__THREE_GAME_DIAGNOSTICS__),
        hooksReady: Boolean(window.__THREE_GAME_TEST_HOOKS__)
      })`,
      returnByValue: true,
    });
    throw new Error(`Game did not become ready for deterministic capture. ${debugState.result.value} Console: ${JSON.stringify(consoleMessages)} Page errors: ${JSON.stringify(pageErrors)}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
await send('Runtime.evaluate', {
  expression: `(() => {
    window.__THREE_GAME_TEST_HOOKS__?.setReducedMotion(true);
    window.__THREE_GAME_TEST_HOOKS__?.setState('opening-settled');
    window.__THREE_GAME_TEST_HOOKS__?.setState(${JSON.stringify(requestedState)});
  })()`,
});
await new Promise((resolve) => setTimeout(resolve, 900));
for (let advance = 0; advance < advanceCount; advance += 1) {
  await send('Runtime.evaluate', {
    expression: `(() => {
      const shellButton = document.querySelector('.shell-action.is-visible .shell-action__button');
      (shellButton ?? window).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    })()`,
  });
  if (advance + 1 < advanceCount) {
    const shellAction = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.shell-action')?.classList.contains('is-visible'))`,
      returnByValue: true,
    });
    if (shellAction.result.value) {
      await new Promise((resolve) => setTimeout(resolve, 90));
      continue;
    }
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const result = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.encounter-dialogue')?.classList.contains('is-visible'))`,
        returnByValue: true,
      });
      if (result.result.value) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } else {
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
}

const state = await send('Runtime.evaluate', {
  expression: `JSON.stringify((() => {
    const canvas = document.querySelector('canvas');
    const rect = canvas?.getBoundingClientRect();
    let pixelMetrics = null;
    if (canvas) {
      const sample = document.createElement('canvas');
      sample.width = 64;
      sample.height = 40;
      const context = sample.getContext('2d', { willReadFrequently: true });
      context.drawImage(canvas, 0, 0, sample.width, sample.height);
      const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
      const colors = new Set();
      let luminanceMin = 255;
      let luminanceMax = 0;
      let nonTransparent = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2], a = pixels[index + 3];
        if (a > 0) nonTransparent += 1;
        colors.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
        const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
        luminanceMin = Math.min(luminanceMin, luminance);
        luminanceMax = Math.max(luminanceMax, luminance);
      }
      pixelMetrics = { sampled: pixels.length / 4, nonTransparent, quantizedColors: colors.size, luminanceMin, luminanceMax, luminanceContrast: luminanceMax - luminanceMin };
    }
    return {
      title: document.title,
      narratorVisible: document.querySelector('.narrator-card')?.classList.contains('is-visible'),
      narratorText: document.querySelector('.narrator-card__text')?.textContent,
      dialogueVisible: document.querySelector('.encounter-dialogue')?.classList.contains('is-visible'),
      dialogueSpeaker: document.querySelector('.encounter-dialogue__speaker')?.textContent,
      dialogueText: document.querySelector('.encounter-dialogue__text')?.textContent,
      secondaryDialogueVisible: document.querySelector('.shell-secondary-dialogue')?.classList.contains('is-visible'),
      secondaryDialogueSpeaker: document.querySelector('.shell-secondary-dialogue strong')?.textContent,
      secondaryDialogueText: document.querySelector('.shell-secondary-dialogue span')?.textContent,
      loaderPresent: Boolean(document.querySelector('#game-loader:not(.is-complete)')),
      canvas: canvas ? { width: canvas.width, height: canvas.height, cssWidth: rect.width, cssHeight: rect.height } : null,
      pixelMetrics,
      diagnostics: window.__THREE_GAME_DIAGNOSTICS__?.scene(),
    };
  })())`,
  returnByValue: true,
});

const screenshot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
});
const screenshotMetrics = await send('Runtime.evaluate', {
  expression: `(async () => {
    const image = new Image();
    image.src = 'data:image/png;base64,${screenshot.data}';
    await image.decode();
    const sample = document.createElement('canvas');
    sample.width = 64;
    sample.height = 40;
    const context = sample.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    const colors = new Set();
    let luminanceMin = 255;
    let luminanceMax = 0;
    let nonTransparent = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2], a = pixels[index + 3];
      if (a > 0) nonTransparent += 1;
      colors.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
      const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
      luminanceMin = Math.min(luminanceMin, luminance);
      luminanceMax = Math.max(luminanceMax, luminance);
    }
    return { sampled: pixels.length / 4, nonTransparent, quantizedColors: colors.size, luminanceMin, luminanceMax, luminanceContrast: luminanceMax - luminanceMin };
  })()`,
  awaitPromise: true,
  returnByValue: true,
});
await writeFile(output, Buffer.from(screenshot.data, 'base64'));
process.stdout.write(`${JSON.stringify({ ...JSON.parse(state.result.value), screenshotMetrics: screenshotMetrics.result.value, consoleMessages, pageErrors }, null, 2)}\n`);
socket.close();
