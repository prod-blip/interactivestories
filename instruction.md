# Starting a New Story Game

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

Change the generated package name to `@moonlit/<story-slug>`, then install the game dependencies through the root workspace:

```bash
npm install three @types/three --workspace=games/<story-slug>
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

Keep `main.ts` small. It should create the game, prepare it, unlock audio from user input, and dispose it when the page closes:

```ts
const game = new Game(document.querySelector('#app')!);
await game.prepare();
game.start();

window.addEventListener('beforeunload', () => game.dispose());
```

At minimum, `Game` should provide `prepare()`, `start()`, `pause()`, `resume()`, and `dispose()` methods. Core gameplay, characters, scenes, and story progression remain specific to each game.

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
