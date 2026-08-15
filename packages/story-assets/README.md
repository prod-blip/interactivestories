# Moonlit Story Assets

Reusable visual and audio assets shared by more than one Moonlit story live in `assets/`.

- `audio/` — shared interface sounds and ambience
- `fonts/` — locally hosted shared typefaces and licences
- `icons/` — Moonlit and common story-player icons
- `textures/` — reusable neutral textures
- `tokens/` — shared soft colour and design tokens
- `ui/` — loading and common interface artwork

Each game synchronizes this directory to its generated `public/shared/` folder before development and production builds. Character art, environments, narration, dialogue, and story-specific sounds remain in the individual game's `public/` directory.

Shared forest ambience recordings live in `audio/birds/`. Games should load these through their generated `public/shared/audio/birds/` path rather than maintaining story-local duplicates.
