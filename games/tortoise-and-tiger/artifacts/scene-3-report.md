# Scene 3 Implementation Report

## Result

Scene 3 is implemented as an isolated cinematic scene. It preserves the peaceful riverbank, triggers a muted procedural stomach growl, makes one gentle move to a stable tiger hideout composition, holds that exact camera through the tiger dialogue, and then makes one purposeful cut to a bush-framed view of the tortoise. “Aha! / Lunch!” remains in that same tortoise frame.

All hideout bushes, branches, and grass live in world space, so they stay rooted to the ground while the camera moves. The hideout is now a taller, denser ring of 14 shrub lobes with a deliberate sightline toward the tortoise. Two instanced grass layers add 190 varied blades while keeping repeated foliage to five draw-call layers (three shrub colors and two grass colors).

Scene 3 is intentionally not stitched into Scenes 1 and 2 yet. The final story-stitching pass will connect the isolated scenes.

## Skill and reference ledger

- Director: loaded and executed — `threejs-game-director/SKILL.md` and `references/phase-playbook.md`.
- Gameplay systems: loaded and executed — `threejs-gameplay-systems/SKILL.md` and `references/gameplay-workflows.md`.
- UI designer: loaded and executed — `threejs-game-ui-designer/SKILL.md`, `references/ui-patterns.md`, and the UI quality/readability/responsive checklists.
- 3D generator: loaded and used for supplied-GLB intake guidance — `threejs-3d-generator/SKILL.md` and `references/threejs-integration.md`.
- Audio generator: loaded for audio integration guidance — `threejs-audio-generator/SKILL.md` and `references/audio-workflows.md`; external generation was unnecessary because this one short non-hero growl is procedural.
- QA/release: loaded and executed — `threejs-qa-release/SKILL.md`, `references/qa-release-checklists.md`, and visual/playtest checklists.
- AAA graphics builder: loaded and executed for camera composition, foliage modeling, instancing, and render-budget review — `threejs-aaa-graphics-builder/SKILL.md` plus its implementation, model, render, technical-art, and visual-scorecard references.
- UI, image generation, physics, combat, and release/bot-playtest phases: not needed for this focused revision; the existing canonical popup implementation was preserved unchanged.

## External asset intake

- Canonical source: `/Users/apple/Downloads/tiger_rigged_lowpoly.glb`.
- Runtime copy: `public/models/TigerLowPoly.glb` (12,801,140 bytes; SHA-256 `4ac3dced0cc27fa865eb0797be12a371755d459ee1c4173a54b92fb05beda74a`, matching the supplied source).
- Runtime diagnostics: 1 mesh, 1 material, 3 textures, approximately 236,012 triangles, one skin with 37 joints, and five clips.
- Scene 3 uses `Tiger_Calm_Idle` at 0.8× speed for every checkpoint where the tiger is visible.
- The tiger wrapper now normalizes the imported character to 2.62 world units tall (down from 2.85), centers and grounds its pivot, preserves the animation mixer/rig, and uses the world lighting rig for its shadow.

## Scene pacing and UI

- 0.0–3.15 seconds: tortoise continues walking peacefully; stomach growl triggers at 2.45 seconds without alerting him.
- 3.15–7.0 seconds: one gentle camera move leaves the riverbank and settles at the tiger hideout.
- 7.0–13.2 seconds: the reveal and all tiger dialogue use the same medium-wide composition; there is no abrupt switch to a second face angle.
- First popup: `Tiger — Ohhh... I am so hungry!`
- Dismissal keeps the same calm idle animation and then shows: `Sniff... sniff... / What's that?`
- Next dismissal enters one clean tiger POV through an authored opening in the shrubs, with the distant tortoise clearly readable.
- The POV holds through `reaction`, `lunch`, and `complete`; `Aha! / Lunch!` therefore appears while the tortoise remains visible in the same frame.
- Popup appearance and pointer/touch/Enter/Space behavior remain the canonical `mouse-and-lion` treatment. `white-space: pre-line` preserves authored line breaks without changing the panel design.

## Scene-wise debug interface

Base URL: `http://localhost:5173/games/tortoise-and-tiger/?scene=3`

Checkpoints: `start`, `peace`, `growl`, `approach`, `tail`, `paw`, `stripes`, `face`, `hungry`, `sniff`, `pov`, `reaction`, `lunch`, and `complete`.

Example: `?scene=3&state=pov`. The same checkpoint is available through `window.__THREE_GAME_TEST_HOOKS__.setState('scene-3:pov')`.

The capture harness now waits for the game, diagnostics, and loader completion instead of relying on a fixed delay, eliminating the imported-model readiness race found during Scene 3 QA.

## QA evidence

- Production build/typecheck: passed.
- Production preview: `http://127.0.0.1:9280/games/tortoise-and-tiger/?scene=3`.
- Desktop checked at 1280x800; mobile checked at 390x844.
- No page/application errors. Headless SwiftShader only reported its expected unsupported `KHR_parallel_shader_compile` warning.
- Imported tiger diagnostics and all six animation names are exposed through `window.__THREE_GAME_DIAGNOSTICS__`.
- Interaction test: two real pointer events advanced `hungry -> sniff-dialogue -> POV` while the tortoise and world continued updating.
- Scene 1 narrator and Scene 2 butterfly checkpoints were recaptured successfully after Scene 3.
- Visual regression decision: the deterministic screenshot harness was extended rather than adding Playwright baselines; moving butterflies, fish, water sparkles, and foliage make exact pixel baselines unnecessarily flaky at this stage.
- Final reveal diagnostics: 118 calls, approximately 795,608 triangles, 58 geometries, 9 textures, DPR 1.
- Final bush POV diagnostics: 401 calls and approximately 411,936 triangles on desktop; the mobile lunch frame measured 289 calls and approximately 404,928 triangles. Both frames were nonblank and visually varied, with no page errors.

Key artifacts:

- `scene-3-camera-reveal-desktop.png`
- `scene-3-bush-pov-desktop.png`
- `scene-3-bush-pov-mobile.png`
- `scene-3-lunch-desktop.png`
- `scene-3-lunch-mobile.png`

- `scene-3-tail-desktop.png`
- `scene-3-paw-desktop.png`
- `scene-3-stripes-desktop.png`
- `scene-3-hungry-desktop.png`
- `scene-3-sniff-desktop.png`
- `scene-3-pov-desktop.png`
- `scene-3-lunch-desktop.png`
- `scene-3-hungry-mobile.png`
- `scene-3-pov-mobile.png`
- `scene-3-lunch-mobile.png`
- `scene-3-popup-sequence-pov.png`
- `scene-3-simple-tail-desktop.png`
- `scene-3-simple-face-desktop.png`
- `scene-3-simple-pov-desktop.png`
- `scene-3-simple-tail-mobile.png`
- `scene-3-simple-face-mobile.png`
- `scene-3-simple-pov-mobile.png`
- `scene-3-panther-wide-desktop.png`
- `scene-3-panther-medium-desktop.png`
- `scene-3-panther-wide-mobile.png`
- `scene-3-panther-medium-mobile.png`
- `scene-3-clutch-wide-desktop.png`
- `scene-3-clutch-face-desktop.png`
- `scene-3-clutch-wide-mobile.png`
- `scene-3-clutch-face-mobile.png`
- `scene-3-static-panther-desktop.png`
- `scene-3-static-panther-mobile.png`
- `scene-3-static-panther-lunch.png`
- `scene-3-original-glb-pose.png`
- `scene-3-lowpoly-tiger-wide-desktop.png`
- `scene-3-lowpoly-tiger-face-desktop.png`
- `scene-3-lowpoly-tiger-wide-mobile.png`
- `scene-3-lowpoly-tiger-face-mobile.png`
- `scene-3-lowpoly-tiger-diagnostic.png`
- `scene-1-regression-after-scene-3.png`
- `scene-2-regression-after-scene-3.png`

## Remaining risks

- Scene 3 deliberately keeps `Tiger_Calm_Idle` through the final reaction; later scenes can opt into the supplied sniff, bite, disappointed, or walk clips when their story actions require them.
- Physical-device audio playback should still be checked because browsers require a prior user gesture before the stomach growl can be heard.
- Despite its filename, the supplied tiger contains approximately 236,012 triangles; the reveal is above the 750k desktop starting budget, and the foliage-framed mobile view is above the 150-call/300k-triangle starting targets. Lower-end physical-device performance should be checked before release.
- The built JavaScript chunk remains about 687 KB (176 KB gzip), retaining Vite’s 500 KB warning.
- Scene 3 remains isolated by design until the final stitching pass.
