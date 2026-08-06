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
- A restart path and a clear story ending.

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

Test the complete story inside the website iframe on desktop, iPad Safari, and a mobile-sized screen. Confirm touch movement, audio, rotation, fullscreen, restart, and leaving the story all work.
