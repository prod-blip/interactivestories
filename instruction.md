# Starting a New Story Game

## What we are creating

Moonlit Stories is a collection of gentle interactive bedtime tales for young children and the grown-ups beside them. We create each story as a small, explorable world that combines simple movement, read-aloud narration, character moments, and meaningful interactions that help the story unfold.

The aim is to make screen time feel calmer and more connected. Stories should encourage children to listen, notice, imagine, ask questions, and participate with a grown-up—without scores, ads, frantic rewards, flashing prompts, or noisy surprises.

Use soft, harmonious colour palettes, warm readable text, unhurried pacing, gentle sound, and uncluttered scenes. This lower sensory load gives children room to process what they see and hear, supports attention and emotional understanding, and keeps the focus on curiosity, conversation, kindness, and time spent together. Every interaction should serve the narrative rather than exist only to demand attention.

## How stories are built

Each story is created as an independent Vite + TypeScript game, usually using Three.js for its explorable world, and is embedded inside the Moonlit Stories website. The website introduces the tale and provides the shared library experience; the game contains its own characters, environments, narration, dialogue, controls, audio, story progression, and ending.

Create each story as an independent Vite + TypeScript game under:

```text
games/<story-slug>/
```

Use a lowercase URL-safe slug such as `tortoise-and-hare`; avoid spaces and symbols.

## Create the boilerplate

From the repository root:

```bash
npm create vite@latest games/<story-slug> -- --template vanilla-ts
```

Change the generated package name to `@moonlit/<story-slug>`, then install the shared runtime and game dependencies through the root workspace:

```bash
npm install @moonlit/story-runtime @moonlit/story-assets three @types/three --workspace=games/<story-slug>
```

Add the shared-asset synchronization hooks to the game's scripts:

```json
{
  "scripts": {
    "sync:shared": "node ../../packages/story-assets/scripts/sync-to-game.mjs",
    "predev": "npm run sync:shared",
    "dev": "vite",
    "prebuild": "npm run sync:shared",
    "build": "tsc && vite build"
  }
}
```

Remove Vite's demo counter, logos, and example CSS. Start with this structure:

```text
games/<story-slug>/
├── public/
│   ├── audio/
│   ├── models/
│   └── textures/
├── src/
│   ├── game/
│   │   ├── Game.ts              # renderer and lifecycle
│   │   ├── input.ts             # keyboard and touch
│   │   ├── responsive.ts        # viewport and pixel ratio
│   │   ├── audio/AudioDirector.ts
│   │   ├── scenes/              # environments and levels
│   │   ├── characters/          # story-specific actors
│   │   └── ui/                  # HUD and prompts
│   ├── story/                    # dialogue and story sequence
│   ├── main.ts                  # bootstrap only
│   └── style.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Use the shared story runtime

`@moonlit/story-runtime` is the contract between the website player and every story. It standardizes loading progress, ready and completion states, recoverable errors, pause/resume, restart, mute, visibility changes, and responsive viewport information. Do not recreate these platform messages separately in each game.

Keep `main.ts` small. It should create the game and runtime, report preparation progress, start the story, and dispose both when the page closes:

```ts
import { createStoryRuntime } from '@moonlit/story-runtime';

let game: Game | undefined;
const runtime = createStoryRuntime('<story-slug>', {
  pause: () => game?.pause(),
  resume: () => game?.resume(),
  restart: () => {
    if (game) game.restart();
    else window.location.reload();
  },
  setMuted: (muted) => game?.setMuted(muted),
});

try {
  game = new Game(document.querySelector('#app')!);
  await game.prepare((progress, stage) => runtime.reportLoading(progress, stage));
  game.start();
  runtime.markReady();
} catch (error) {
  runtime.reportError(error);
}

window.addEventListener('beforeunload', () => {
  runtime.dispose();
  game?.dispose();
});
```

At minimum, `Game` should provide `prepare()`, `start()`, `pause()`, `resume()`, `restart()`, `setMuted()`, and `dispose()` methods. Call `runtime.markCompleted()` when the ending is reached. Core gameplay, characters, scenes, camera composition, and story progression remain specific to each game.

The runtime sends every story a standardized viewport containing its usable width and height, pixel ratio, orientation, input mode, reduced-motion preference, and safe-area insets. It also exposes these values through CSS variables and document attributes. The game must still adapt its own renderer, camera, HUD, dialogue, and touch controls to that information because each story has different visual composition.

The website player owns shared loading/error presentation, mute, restart, fullscreen, and leave-story navigation. Register the capabilities supported by the story in `apps/web/lib/stories.ts`; keep story-specific narration and interactions inside the game.

## Shared assets

Assets used by more than one story belong in `packages/story-assets/assets/`, organized into `audio`, `fonts`, `icons`, `textures`, `tokens`, and `ui`. Soft colour tokens and the Moonlit mark are provided there as the initial shared foundation.

Before development and production builds, the synchronization script copies these assets into the game's generated `public/shared/` directory. Do not edit or commit files inside `public/shared/`; change their source in `packages/story-assets/assets/` instead.

Reference a shared asset through the game's Vite base path:

```ts
const sharedSound = `${import.meta.env.BASE_URL}shared/audio/story-advance.ogg`;
```

Import shared colour tokens at the top of the game's main stylesheet:

```css
@import "../../../packages/story-assets/assets/tokens/soft-palette.css";
```

For copied files referenced by a game HTML entry point, use a relative shared path:

```html
<link rel="icon" href="./shared/icons/moonlit-mark.svg" />
```

Only genuinely reusable assets should be shared. Story-specific characters, environments, narration, dialogue recordings, models, and special sound effects stay inside `games/<story-slug>/public/` so each story remains self-contained.

## Standard audio implementation

Every story must use the mobile-safe audio utilities exported by `@moonlit/story-runtime`. Do not implement a separate `AudioContext.resume()` lifecycle or raw audio `fetch()` helper inside an individual game. This keeps file loading, iPhone/iPad gesture activation, and Safari interruption recovery consistent across all stories.

Import the standard utilities in the story's `AudioDirector`:

```ts
import {
  createStoryAudioContext,
  loadStoryAudioBuffer,
  StoryAudioSession,
} from '@moonlit/story-runtime';
```

The director owns one session and asks it to unlock from a trusted gesture:

```ts
private readonly audioSession = new StoryAudioSession();
private context: AudioContext | null = null;

async start(): Promise<void> {
  const context = await this.audioSession.unlock({
    getContext: () => this.context,
    createContext: () => {
      this.context = createStoryAudioContext();
      this.createMixGraph(this.context);
      return this.context;
    },
    abandonContext: () => this.abandonInterruptedContext(),
  });
  if (!context) return;

  // Start or restore this story's ambience and cues here.
}
```

`abandonInterruptedContext()` must stop active sources, clear nodes and decoded `AudioBuffer` references, reset in-flight decode promises, and set the director's context to `null`. Preserve story state such as whether a character is walking, flying, sleeping, or drinking so the appropriate loop can restart after reconstruction. The shared loader retains encoded file data, so rebuilding the context decodes again without downloading the same sound again.

Load a complete sound through the standard cached fetch/decode path:

```ts
const sound = await loadStoryAudioBuffer(
  context,
  `${import.meta.env.BASE_URL}audio/story-cue.wav`,
);
```

When encoded data needs to be prefetched before an audio context exists, use `fetchStoryAudioData()`, then use `decodeStoryAudioData()` after the session is running. Never create an `AudioContext` merely to preload a file.

Every game must retry its public `enableAudio()` method from the same global trusted gestures:

```ts
const unlockGameAudio = () => game?.enableAudio();
window.addEventListener('pointerdown', unlockGameAudio, { passive: true });
window.addEventListener('touchend', unlockGameAudio, { passive: true });
window.addEventListener('keydown', unlockGameAudio);
```

Remove those listeners during disposal. Keep `allow="autoplay; fullscreen"` on the website's game iframe.

All stories must route their final output through `STORY_MASTER_GAIN` and implement the runtime's `setVolume(volume)` adapter. Do not choose a story-specific master gain to compensate for an individual cue; balance that cue or its ambience/effects bus instead. The shelf owns the persistent 0–100% player preference and sends it through `moonlit:set-volume` whenever a game connects or reloads. Preserve the separate mute command so muting never destroys the chosen volume.

Do not await `AudioContext.resume()` directly in story code. On iOS Safari, especially after opening a link from another app, entering fullscreen, switching tabs, or interrupting the device audio session, WebKit can leave a context in its non-standard `interrupted` state and keep the resume promise pending forever. `StoryAudioSession` primes the hardware output, applies a bounded resume attempt, releases stalled attempts, and rebuilds an interrupted context from the next trusted tap.

Before publishing, test sound on desktop Chrome, mobile Chrome, iPhone Safari, and iPad Safari. On iOS, also open the deployed game from another app such as Messages or Notes, interact with it, switch away and back, and confirm sound recovers on a subsequent tap.

## Standard Three.js rendering architecture

Every Three.js story must use `@moonlit/story-rendering` for renderer sizing, adaptive pixel ratio, shadow quality, instance bounds, and development diagnostics. Do not create story-specific device thresholds or silently raise rendering quality above the shared profile.

Repeated environmental details must be spatially batched:

- Use `THREE.InstancedMesh` for repeated objects that share geometry and material. Merge the parts of a logical prop first when that turns a multi-mesh tree, plant, rock, or decoration into one reusable instance.
- Partition large batches by tile or another bounded spatial zone. Do not create one world-sized batch whose bounds remain in the camera frustum everywhere.
- After assigning or changing instance matrices, calculate the batch bounding box and bounding sphere with `refreshInstancedMeshBounds()`. Keep frustum culling enabled.
- A dynamic batch may disable culling only when recalculating safe bounds every frame is measurably more expensive. Document the reason beside the exception and keep the batch small.
- Use a 3×3 active tile or chunk grid by default. A larger active world requires a measured performance justification and a visual test showing that fog, horizon scenery, or recycling cannot cover the boundary.
- Prefer a finite, bounded world whenever the story does not require continuous travel. Do not add tile recycling merely to imply an endless background. For a finite world, batch repeated scenery globally or in a small number of measured spatial regions, compute bounds once, and conceal the boundary with fog, terrain, and horizon scenery.

Large ambient animation sets must use shader animation driven by one shared time uniform, or update only nearby visible batches. Do not walk hundreds of individual plants or allocate temporary vectors on every animation frame. Reduced-motion mode must freeze nonessential environmental motion.

Limit real-time shadows to characters and visually important large objects. Small foliage, flowers, grass, stones, particles, audience details, and distant scenery should not cast shadows. Use the shared 512 px constrained-device and 1024 px standard shadow profiles; higher-resolution maps require a documented visual and device benchmark.

Hide inactive scene groups and skip all of their update work. Story transitions must not leave a previous environment rendering or animating behind the active scene.

Target 60 FPS and verify a sustained average of at least 50 FPS on the reference OnePlus 6 after the device has cooled. Record frame pacing, draw calls, triangles, memory, pixel ratio, and shadow settings for representative gameplay. Investigate recurring frames above 33 ms and any uncontrolled growth in renderer memory or scene objects before publishing.

## Required foundation

Every game must include:

- Responsive rendering for desktop, tablet, and mobile, including orientation and dynamic viewport changes.
- Keyboard controls and visible touch controls with a brief first-movement prompt.
- Audio unlocked by a direct user gesture, with iPad/Safari resume handling.
- Audio and assets loaded through `import.meta.env.BASE_URL`, never root-absolute paths.
- A lightweight loading screen, progress feedback, and a recoverable error state.
- Pause/resume behavior when the page becomes hidden or visible.
- Support for fullscreen iframe playback without page scrolling or black unused areas.
- Calm visuals and sound: no flashing prompts, loud surprises, frantic reward loops, or unnecessary clutter.
- Accessible text, readable contrast, large touch targets, and reduced-motion support.
- Cleanup for animation frames, event listeners, audio, geometries, materials, and textures.
- Shared rendering quality, spatial instancing, correct instance bounds, selective shadows, and inactive-scene suspension as defined above.
- A restart path and a clear story ending.

Every completed story must use the shared Moonlit ending template: one moral headline, one short supporting line, and exactly two actions—`Play Again` and `Main Menu`. Do not add an eyebrow/status line, “The End”, free-explore action, score, or intermediary completion screen. Use the shared `story-ending.css` asset and the `moonlit-ending` class so every game remains visually and behaviorally consistent.

## Build configuration

Give the workspace a unique package name:

```json
"name": "@moonlit/<story-slug>"
```

Configure Vite to build into the website:

```ts
base: '/games/<story-slug>/',
build: {
  outDir: '../../apps/web/public/games/<story-slug>',
  emptyOutDir: true,
}
```

Add its workspace build to the root `build:games` script, then register its title, description, age range, duration, and entry URL in `apps/web/lib/stories.ts`.

## Completion checklist

Before publishing, verify:

```bash
npm run typecheck
npm run build
```

Test the complete story inside the website iframe on desktop, iPad Safari, and a mobile-sized screen. Confirm touch movement, audio, rotation, fullscreen, restart, leaving the story, instance culling, adaptive resolution, and sustained performance all work.
