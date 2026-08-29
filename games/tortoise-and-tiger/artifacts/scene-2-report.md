# Scene 2 Implementation Report

## Result

Scene 2 is implemented as an isolated, deterministic story scene. The camera moves into a closer character framing while the tortoise walks, the tortoise pauses and turns toward a featured butterfly using `Turtle_Idle_Breathing`, then resumes `Turtle_Walk`. The narrator popup and the tortoise dialogue popup advance through real click/touch/Enter/Space input while the world and character continue moving.

Scene 2 is intentionally not stitched into the normal Scene 1 flow yet. It is available through the scene-development URL and will join the continuous story during the final stitching pass.

## Skill-loading ledger

- Director: active — `/Users/apple/.codex/skills/threejs-game-director/SKILL.md`
- Gameplay systems: loaded and executed — `/Users/apple/.codex/skills/threejs-gameplay-systems/SKILL.md`
- UI: loaded and executed — `/Users/apple/.codex/skills/threejs-game-ui-designer/SKILL.md`
- 3D generator: loaded and used for existing rig/clip integration guidance — `/Users/apple/.codex/skills/threejs-3d-generator/SKILL.md`
- Debug/profile: loaded and executed — `/Users/apple/.codex/skills/threejs-debug-profiler/SKILL.md`
- QA/release: loaded and executed — `/Users/apple/.codex/skills/threejs-qa-release/SKILL.md`
- AAA graphics, image generation, audio generation: not needed for this focused scene implementation; the established world/audio were retained, the user-supplied tortoise remained the hero, and the butterfly is a low-cost procedural support prop.

## Reference ledger

- Director phase playbook: yes — `threejs-game-director/references/phase-playbook.md`
- Gameplay workflow: yes — `threejs-gameplay-systems/references/gameplay-workflows.md`
- Game/level design and checklist: yes — `threejs-gameplay-systems/references/game-design-level-design.md` and `references/checklists/game-design-level-design.md`
- UI patterns and quality/readability/responsive/mobile checklists: yes — `threejs-game-ui-designer/references/ui-patterns.md` and applicable files under `references/checklists/`
- Three.js model integration: yes — `threejs-3d-generator/references/threejs-integration.md`
- Debug/profile and scene-debugging checklists: yes — `threejs-debug-profiler/references/debug-profile-checklists.md` and `references/checklists/scene-debugging.md`
- QA/release, visual verification, playtest, release, and visual-harness references: yes — `threejs-qa-release/references/`
- Physics, combat, generated-asset API, and bot-playtest references: not needed; Scene 2 is a cinematic story beat with no collision, challenge, generation request, or release-ready claim.

## External asset sourcing

- Hero/player: existing user-supplied `public/models/Tortoise.glb`, 4,511,072 bytes, 153,104 source triangles, 16-joint rig, seven named clips.
- Featured butterfly: procedural Three.js support prop with animated wing pivots and deterministic hover motion.
- World, materials, sky, UI, and audio: retained from Scene 1.
- Tiger: not loaded because the tiger is not part of Scene 2; `/Users/apple/Downloads/tiger_all_animations.glb` remains reserved as the canonical tiger asset for its introduction scene.
- External generation: not used; no new hero or premium asset surface was needed.

## Game design brief

- Player promise: spend a warm character moment learning that the small, slow tortoise is observant, thoughtful, and cheerful.
- Target feeling: gentle, friendly, calm, and affectionate.
- Primary verb: watch, notice the butterfly beat, and advance the two story panels.
- Objective: understand the tortoise's personality before the tiger enters the story.
- Pressure/failure: none; this is an introductory cinematic beat.
- Reward: a close character view, readable pause-and-look performance, and cheerful dialogue.
- Non-goals: tiger reveal, chase mechanics, shell interaction, swimming, fail/retry, and final scene stitching.

## Core loop contract

Watch the close camera and character motion -> notice the butterfly pause -> read and dismiss narration -> read and dismiss tortoise dialogue -> continue with the happy walk. There is no failure state because this scene is story delivery rather than a challenge.

## Level/encounter plan and pacing

- 0.0–3.8 seconds: tortoise walks slowly while the camera eases closer.
- 3.8–7.0 seconds: tortoise stops, cross-fades to `Turtle_Idle_Breathing`, and turns toward the featured butterfly.
- 7.0–11.2 seconds: tortoise turns back to the path, cross-fades to `Turtle_Walk`, and takes several more steps.
- 11.2 seconds onward: narrator panel appears while motion continues.
- Narrator dismissal: a short 0.42-second breathing gap leads into the tortoise dialogue.
- Tortoise dismissal: scene enters the complete checkpoint while the tortoise continues happily.

## UI intent and states

- Reusable `StoryPopupUI` owns narrator and character-dialogue state from one source of truth.
- Narrator treatment matches the canonical `mouse-and-lion` centered card.
- Tortoise treatment matches the canonical `mouse-and-lion` lower encounter-dialogue panel so the speaking character stays visible.
- No visible control instructions were added.
- Pointer, touch, Enter, and Space use the same dismissal path.
- Desktop 1440x900 and portrait mobile 390x844 at DPR 2 have no clipping or text overlap.

## Scene-wise debug interface

Base development URL:

```text
http://localhost:5173/games/tortoise-and-tiger/?scene=2
```

Direct deterministic checkpoints:

```text
?scene=2&state=start
?scene=2&state=approach
?scene=2&state=butterfly
?scene=2&state=second-walk
?scene=2&state=narrator
?scene=2&state=dialogue
?scene=2&state=complete
```

The same states are available to browser tests through `window.__THREE_GAME_TEST_HOOKS__.setState('scene-2:CHECKPOINT')`.

## Phase ledger

- Gameplay systems: done — isolated scene selection, timeline, camera, movement/idle transitions, popup progression, restart, diagnostics, and checkpoints.
- External asset sourcing: done — retained the supplied rigged hero and used a procedural support butterfly.
- AAA graphics: skipped — no premium/AAA visual-upgrade claim was requested.
- UI: done — reference-matched narrator and character panels verified on desktop/mobile.
- Debug/profile: done — checkpoints, canvas/camera, animations, errors, and renderer diagnostics checked.
- QA/release: done for Scene 2 — production build/preview and regression paths checked; full-game release remains out of scope.

## QA evidence

- Build: `npm run build --workspace=@moonlit/tortoise-and-tiger` passes.
- Production preview URL: `http://127.0.0.1:9280/games/tortoise-and-tiger/?scene=2`.
- Desktop viewport: 1440x900, DPR 1.
- Mobile viewport: 390x844, DPR 2, drawing buffer 780x1688.
- Renderer range in Scene 2 captures: 138–183 calls, approximately 409,060–411,820 triangles, 56–60 geometries, 5 textures.
- Canvas screenshots: 2,560/2,560 sampled pixels nontransparent, with 173–264 quantized colors and 185–231 luminance contrast across captured states.
- Animation checks: `Turtle_Idle_Breathing` active at the butterfly checkpoint; `Turtle_Walk` active before/after it and during dialogue.
- Interaction check: two real pointer events advanced `narrator -> dialogue -> complete`; final diagnostics reported `popupStage: complete` with both panels hidden.
- Errors: no page/application errors. Headless SwiftShader reported only its expected unsupported `KHR_parallel_shader_compile` warning.
- Regression: Scene 1 still reaches its settled narrator state with the correct asset and popup after the shared UI/game refactor.

Screenshots:

- `artifacts/scene-2-butterfly-desktop.png`
- `artifacts/scene-2-butterfly-mobile.png`
- `artifacts/scene-2-narrator-desktop.png`
- `artifacts/scene-2-narrator-mobile.png`
- `artifacts/scene-2-tortoise-dialogue-desktop.png`
- `artifacts/scene-2-tortoise-dialogue-mobile.png`
- `artifacts/scene-2-popup-sequence-complete.png`
- `artifacts/scene-1-regression-after-scene-2.png`

## Visual test harness

- Decision: extended the existing capture harness because scene-specific camera, animation, imported-hero visibility, popup layout, and mobile framing are regression-prone.
- Covered states: all named Scene 2 checkpoints through test hooks; captured butterfly, narrator, dialogue, and complete sequence states on desktop/mobile.
- Determinism: URL scene/state selection plus named test-hook checkpoints; reduced-motion hook remains supported.
- Interaction: optional state-aware pointer-advance count lets the harness wait for the next popup before advancing again.
- Baseline comparison: not added because Playwright screenshot dependencies are not installed; the current harness records screenshots, DOM state, dialogue copy, diagnostics, console/page errors, and screenshot pixel metrics.
- Flake risk: continuous water, butterflies, fish, and world animation change exact pixels; acceptance currently relies on state/diagnostic assertions and visual inspection rather than pixel-perfect diffs.

## Remaining risks

- The supplied hero keeps Scene 2 near 410k rendered triangles, above the 300k mobile starting target; physical-device FPS is unmeasured.
- The built JavaScript chunk is about 674 KB (174 KB gzip), retaining Vite's 500 KB warning.
- Direct scene/checkpoint query parameters are developer shortcuts and must remain undiscoverable in normal player UI during final stitching.
- Scene 2 is not yet connected after Scene 1 by design.
