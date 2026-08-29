# Scene 4 Implementation Report

## Result

Scene 4 is implemented as an isolated, deterministic cinematic scene. The tiger walks out of the established Scene 3 hideout, the tortoise stops and faces him, both characters remain in one readable two-shot for the dialogue, and the tiger follows a land-side semicircular stalking path around the tortoise. The final beat transitions the tortoise from worried breathing to a three-quarter head-and-shell pose.

Scene 4 remains isolated until the final story-stitching pass.

## Skill and reference ledger

- Director: loaded and executed — `threejs-game-director/SKILL.md` and `references/phase-playbook.md`.
- Gameplay systems: loaded and executed — `threejs-gameplay-systems/SKILL.md` and `references/gameplay-workflows.md`.
- UI designer: loaded and executed — `threejs-game-ui-designer/SKILL.md`, `references/ui-patterns.md`, and the UI quality/readability/responsive checklists.
- 3D generator: loaded for supplied-rig intake and animation integration guidance — `threejs-3d-generator/SKILL.md`, `references/api-notes.md`, and `references/threejs-integration.md`. No external generation was needed because the canonical tiger and tortoise GLBs already contain the required clips.
- QA/release: loaded and executed — `threejs-qa-release/SKILL.md`, `references/qa-release-checklists.md`, and the visual/playtest checklists.
- AAA graphics, debug/profile, image generation, audio generation, physics, and release/bot-playtest phases: skipped as outside this focused cinematic-scene implementation.

## Scene contract

- Player promise: watch the friendly tortoise remain composed while a much larger tiger becomes an immediate threat.
- Primary interaction: dismiss each storybook popup by pointer/touch, Enter, or Space while the world continues moving.
- Pressure: the tiger closes the distance, towers over the tortoise, and circles him.
- Progression: narrator → tiger greeting → tortoise reply → circling → snack threat → worried reaction → shell-thinking beat.
- Non-goals: no combat, collision, fail state, or scene stitching in this pass.

## Animation and camera

- Tiger emergence: `Tiger_Simple_Walk` at 0.78× speed.
- Tiger circle: `Tiger_Simple_Walk` at 0.72× speed.
- Tiger dialogue/holds: `Tiger_Calm_Idle` at 0.8× speed.
- Tortoise stop/dialogue: `Turtle_Idle_Breathing`.
- Tortoise worried beat: `Turtle_Scared_Breathing` at 0.78× speed.
- Tortoise shell-thinking beat: `Turtle_Head_Shake` at 0.62× speed with a three-quarter body turn.
- Camera: one gentle two-shot dolly during emergence, followed by a stable encounter angle. During the stalking path the camera translates with the characters' midpoint without orbiting, keeping both visible.
- The tiger path stays entirely on the grassy bank and never enters the river.

## Scene-wise debug interface

Base URL: `http://localhost:5173/games/tortoise-and-tiger/?scene=4`

Checkpoints: `start`, `narrator`, `greeting`, `reply`, `circle`, `snack`, `worried`, `shell`, and `complete`.

Example: `?scene=4&state=circle`. The same state is available through `window.__THREE_GAME_TEST_HOOKS__.setState('scene-4:circle')`.

## QA evidence

- TypeScript typecheck and production build: passed.
- Production preview: `http://127.0.0.1:9280/games/tortoise-and-tiger/?scene=4`.
- Desktop checked at 1280×800; mobile checked at 390×844.
- Narrator and all three dialogue strings were verified verbatim.
- Pointer callback transitions verified independently: greeting → tortoise reply, reply → circling, snack → worried.
- No page/application errors. Headless SwiftShader only reported the expected unsupported `KHR_parallel_shader_compile` warning.
- Worst captured desktop circle: 221 calls, approximately 1,101,560 triangles, 59 geometries, 9 textures, DPR 1.
- Captured mobile circle: 160 calls, approximately 1,099,624 triangles, 57 geometries, 9 textures, DPR 1.
- Visual regression decision: the existing deterministic state/capture harness was extended with Scene 4 checkpoints; exact pixel baselines remain unwarranted while the river, butterflies, fish, and other ambient motion are deliberately dynamic.

Key artifacts:

- `scene-4-narrator-desktop.png`
- `scene-4-greeting-desktop.png`
- `scene-4-reply-desktop.png`
- `scene-4-circle-desktop.png`
- `scene-4-snack-desktop.png`
- `scene-4-worried-desktop.png`
- `scene-4-shell-desktop.png`
- `scene-4-greeting-mobile.png`
- `scene-4-circle-mobile.png`
- `scene-4-snack-mobile.png`
- `scene-4-shell-mobile.png`
- `scene-4-interaction-reply.png`
- `scene-4-interaction-circle.png`
- `scene-4-interaction-worried.png`

## Remaining risks

- The two detailed imported characters together push the scene above the Three.js skill's starting mobile triangle budget; lower-end physical-device performance should be checked before release.
- The built JavaScript chunk remains above Vite's 500 KB warning threshold.
- Headless Chrome throttles real-time animation when backgrounded, so timed pacing should receive one foreground-browser playthrough on the target device even though every deterministic state and callback handoff passed.
- Scene 4 remains isolated by design until the final stitching pass.
