# Scene 1 Implementation Report

## Result

Scene 1 is implemented as a bright storybook forest-river cinematic. The camera descends from above the forest, follows the curved river, settles beside the walking tortoise, and reveals the requested narrator popup without pausing scene motion.

## Skill-loading ledger

- Director: active — `/Users/apple/.codex/skills/threejs-game-director/SKILL.md`
- Gameplay systems: loaded — `/Users/apple/.codex/skills/threejs-gameplay-systems/SKILL.md`
- AAA graphics: loaded and used as visual-production guidance; no AAA claim — `/Users/apple/.codex/skills/threejs-aaa-graphics-builder/SKILL.md`
- UI: loaded and executed — `/Users/apple/.codex/skills/threejs-game-ui-designer/SKILL.md`
- Debug/profile: loaded and executed — `/Users/apple/.codex/skills/threejs-debug-profiler/SKILL.md`
- QA/release: loaded and executed — `/Users/apple/.codex/skills/threejs-qa-release/SKILL.md`
- 3D generator: loaded and used for GLB/rig/animation inspection and Three.js integration; provider generation was not needed because the user supplied the finished asset — `/Users/apple/.codex/skills/threejs-3d-generator/SKILL.md`
- Image generator: loaded by the director; provider generation blocked by missing credential — `/Users/apple/.codex/skills/threejs-image-generator/SKILL.md`
- Audio generator: loaded; provider generation blocked by missing credential — `/Users/apple/.codex/skills/threejs-audio-generator/SKILL.md`

## Reference ledger

- Director phase playbook: yes — `threejs-game-director/references/phase-playbook.md`
- Gameplay workflows: yes — `threejs-gameplay-systems/references/gameplay-workflows.md`
- Game design/level design and new-game checklists: yes — `threejs-gameplay-systems/references/game-design-level-design.md` and applicable checklists
- Visual scorecard, implementation blueprint, model recipes, render recipes, and technical art: yes — `threejs-aaa-graphics-builder/references/`
- Procedural model, material/lighting, and performance-safe detail checklists: yes — `threejs-aaa-graphics-builder/references/checklists/`
- UI patterns, game UI, HUD readability, responsive fit, and mobile input: yes — `threejs-game-ui-designer/references/`
- Debug/profile, scene debugging, and performance profile checklists: yes — `threejs-debug-profiler/references/`
- QA/release, visual verification, playtest, release, and visual test harness references: yes — `threejs-qa-release/references/`
- 3D API notes, Three.js integration, and image-generator pairing: yes — `threejs-3d-generator/references/`
- Audio workflows: yes — `threejs-audio-generator/references/audio-workflows.md`
- Physics references: not needed — Scene 1 contains no collision or physics gameplay.
- Shader cookbook: not needed — no custom GLSL or post-processing chain was introduced.
- Bot playtest references: not needed — this cinematic scene has no challenge/difficulty loop.

## External asset sourcing

Credential probe output:

```text
TRIPO_API_KEY=MISSING
GEMINI_API_KEY=MISSING
ELEVENLABS_API_KEY=MISSING
```

- Hero/player source: user-supplied `/Users/apple/Downloads/turtle_all_animations.glb`, copied to `public/models/Tortoise.glb`; imported through `GLTFLoader`, normalized to scene scale, and played with `Turtle_Walk`.
- Enemies/vehicles/weapons source: not needed; the tiger does not appear in Scene 1.
- Signature props/pickups source: procedural Three.js world kit.
- World/sky/background source: procedural curved ribbon river, banks, trees, bushes, rocks, branches, reeds, flowers, mushrooms, lily pads, logs, fish, butterflies, birds, sparkles, and storybook sun.
- Materials/textures/decals source: shared procedural `MeshStandardMaterial`/`MeshPhysicalMaterial` roles; no external texture API.
- Logos/icons/GUI art source: CSS and typographic ornament; no generated raster UI.
- Audio/SFX/voice source: procedural Web Audio river bed and cheerful melodic score; provider audio generation blocked by `ELEVENLABS_API_KEY=MISSING`.
- Chosen sources: user-supplied rigged GLB hero + procedural supporting world/UI/audio.
- External assets generated: no; Tripo and Gemini were blocked by the literal credential probe output above.
- Audio assets generated: no file output; ElevenLabs was blocked, so audio is synthesized at runtime after browser gesture unlock.

## Game design brief

- Player promise: enter a warm illustrated river world and meet a small, clever tortoise.
- Target feeling: calm, cheerful, safe, and gently wondrous.
- Primary verb: watch the camera journey, then dismiss the narrator panel intuitively.
- Objective: understand the setting and identify the tortoise as the story's clever hero.
- Pressure: none in Scene 1; threat begins in a later scene.
- Reward: the camera resolves from landscape scale to an intimate character view.
- Fail/retry: not applicable to this cinematic scene; runtime restart resets the opening.
- Skill expression: not applicable yet.
- Non-goals: tiger encounter, shell action, river escape controls, win/lose state, and ending.

## Core loop

For Scene 1: watch the river journey -> discover the tortoise -> read the narrator line -> click/touch/Enter/Space to dismiss while the living world continues. This is a cinematic story beat rather than the later gameplay loop.

## Level/encounter plan

- Start: aerial forest view with the river as the orientation anchor.
- Route: the camera follows the river's curve toward the near bank.
- Landmark: the sandy left bank and animated tortoise.
- Motion beats: tree sway, sparkles, floating debris/leaves, butterflies, birds, and periodic fish jumps.
- Resolution: camera settles beside the tortoise before the narrator panel appears.
- Readability: the river direction remains visible on desktop and portrait mobile; the tortoise stays fully framed after the portrait FOV correction.
- First threat/reward/escalation: not applicable until later scenes.

## Technical art

- Art direction: rounded geometry, sunny high-key palette, soft rough materials, clear water/land value separation, and forest-green/gold UI motifs.
- Hero surface: animated tortoise GLB, 4.30 MB, 9 mesh primitives/materials, 153,104 source triangles, a coherent 16-joint custom rig, and 7 animation clips.
- Animation set: `Turtle_Walk`, `Turtle_Idle_Breathing`, `Turtle_Head_Shake`, `Turtle_Peek_From_Shell`, `Turtle_Scared_Breathing`, `Turtle_Tuck_Into_Shell`, and `Turtle_Happy_Escape_Celebration`.
- Scene 1 behavior: `Turtle_Walk` runs during the riverbank journey. `Turtle_Idle_Breathing` is bound and verified for stationary/rest beats, with cross-fading available to later scenes.
- Facial-expression pass: GLB channel inspection showed that `Turtle_Walk` and `Turtle_Head_Shake` retain the jaw's wide-open rest rotation. After the mixer update, those two calm clips now reuse the closed jaw angle authored into `Turtle_Idle_Breathing`, producing a small relaxed smile while leaving expressive/scared/tuck/celebration clips untouched.
- Shadow policy: the dense skinned hero receives lighting but does not enter the directional shadow map; a lightweight contact-shadow mesh grounds it without duplicating its 153k-triangle shadow cost.
- Support surfaces: procedural and shared; flowers, reeds, mushrooms, bushes, and tree contact shadows use instancing.
- Lighting: warm directional key, cool hemisphere fill, ACES filmic tone mapping, one shadow-casting light.
- VFX readability: river sparkles and ripple rings stay below the character and popup focal hierarchy.
- DPR: capped at 2; portrait FOV is widened to preserve the tortoise and river composition.
- Post passes: none.

Render budget target vs measured production view:

| Metric | Desktop target | Actual | Result |
| --- | ---: | ---: | --- |
| Draw calls | 300 | 119–127 | Pass |
| Triangles | 750,000 desktop / 300,000 mobile | 407,844–409,620 | Pass desktop; over mobile starting target |
| Geometries | 300 | 119–127 | Pass |
| Textures | 60 | 5 | Pass |
| Shadow lights | 2 | 1 | Pass |
| DPR cap | 2 | 2 | Pass |
| Post passes | 2 | 0 | Pass |

The imported character is substantially denser than the previous placeholder. Disabling its shadow-map render keeps draw calls low, but its visible geometry still puts the scene above the mobile starting triangle target. This is recorded as a physical-device performance risk rather than hidden.

## UI intent and state checklist

- Loading: implemented with story-world progress stages.
- Narrator: implemented by matching the canonical `mouse-and-lion` narrator markup and CSS treatment: Georgia typography, dark translucent panel, gold border/name, central placement, identical fade/slide timing, responsive sizing, and no explicit “click to continue” copy.
- Dismissed/world: implemented; gameplay/world motion does not pause while the narrator is visible.
- Pause/restart/mute: handled through the shared story runtime.
- Gameplay HUD, objective, touch controls, win/fail: intentionally not needed in Scene 1.
- Text fit/overlap: passes at 1440x900 and 390x844; the full narrator line fits without clipping.
- Touch target: the scene uses whole-screen pointer dismissal, so there is no small target.

## Phase ledger

- Gameplay systems: done for Scene 1 — deterministic cinematic timeline, tortoise path motion, restart, and dismissal interaction.
- External asset sourcing: done with blocker evidence — all provider credentials reported missing; existing GLB plus procedural fallback used.
- AAA graphics: executed as graphics guidance and done for this scene; no premium/AAA completion claim.
- UI: done — narrator and loading states verified at desktop and mobile.
- Debug/profile: done — build, asset path, page/console, camera, renderer, and responsive framing checked.
- QA/release: done for the scene — development and production preview captured; later game scenes remain out of scope.

## QA/release evidence

- Build: `npm run build --workspace=@moonlit/tortoise-and-tiger` passes.
- Production URL: `http://127.0.0.1:9280/games/tortoise-and-tiger/`.
- Production model request: HTTP 200, `Content-Type: model/gltf-binary`, 4,511,072 bytes.
- Desktop viewport: 1440x900, DPR 1.
- Mobile viewport: 390x844, DPR 2, 780x1688 drawing buffer.
- Console/page error: none in final production captures.
- Screenshot pixel evidence for the replacement hero: 2,560/2,560 nontransparent sampled pixels; 157–197 quantized colors and 206.43–221.71 luminance contrast.
- Character diagnostics: all 7 named animation clips loaded; the 16 rig joints were discovered; `Turtle_Walk` and `Turtle_Idle_Breathing` were each activated and captured without console or page errors.
- Interaction: test harness dispatches the real pointer dismissal; narrator becomes hidden while the render loop remains active.
- Audio: pointer gesture unlock path ran without console/page error; autoplay means direct-page audio begins only after a user gesture.

Screenshots/artifacts:

- `artifacts/scene-1-production.png`
- `artifacts/scene-1-production-world.png`
- `artifacts/scene-1-mobile.png`
- `artifacts/scene-1-world-mobile.png`
- `artifacts/tortoise-new-walk.png`
- `artifacts/tortoise-new-idle.png`
- `artifacts/tortoise-new-mobile.png`
- `artifacts/tortoise-calm-smile-walk.png`
- `artifacts/tortoise-calm-smile-idle.png`
- `artifacts/popup-mouse-lion-parity-desktop.png`
- `artifacts/popup-mouse-lion-parity-mobile.png`
- `artifacts/popup-dismissed-check.png`

## Visual test harness

- Decision: added a lightweight Chrome DevTools capture harness because the popup and portrait framing are valuable regression surfaces.
- Script: `scripts/capture-scene.mjs`.
- States: narrator-visible, dismissed world, and explicit named tortoise animation selection; desktop and mobile viewports.
- Determinism: test hook jumps to the settled camera state and can enable reduced motion.
- Baseline comparison: not added because `@playwright/test` is not installed and the world intentionally contains continuous animation; current harness records screenshots, UI state, renderer diagnostics, errors, and sampled screenshot pixels.

## Remaining risks

- The user-supplied hero raises the world to roughly 408k rendered triangles, above the 300k mobile starting target; physical-device FPS/frame time is unmeasured.
- The bundled JS chunk is about 655 KB (169 KB gzip), producing Vite's 500 KB warning; most is Three.js plus the story runtime.
- Provider-generated 3D/audio could not be produced without Tripo/ElevenLabs credentials.
- Browser autoplay rules delay music until the first pointer or keyboard gesture in a direct page load.
- Scene 2 onward, gameplay controls, the tiger, escape mechanics, and ending are not implemented by this request.
