# Tortoise and Tiger project instructions

- Treat `../mouse-and-lion` as the canonical visual and interaction reference for every story popup.
- Narrator, character-dialogue, gameplay-speech, and objective popups must reuse its font, border treatment, background, speaker-name placement, entrance/exit motion, and click/touch behavior unless the user explicitly requests a divergence.
- Inspect the corresponding `mouse-and-lion` markup and CSS before adding or changing a popup.
- Build and debug the story scene-by-scene. Every scene must support an isolated developer entry and useful deterministic checkpoints, while the normal player flow remains one continuous stitched story.
- Use `/Users/apple/Downloads/tiger_rigged_lowpoly.glb` as the canonical tiger character asset. Preserve its rig and supplied animation clips; use `Tiger_Calm_Idle` for every visible tiger state in Scene 3 unless the user explicitly requests another animation. Do not replace it with a procedural or generated tiger unless the user explicitly requests that.
