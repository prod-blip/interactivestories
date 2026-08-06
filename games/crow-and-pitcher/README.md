# The Crow and the Pitcher

A gentle first playable slice of Aesop's fable for Moonlit Stories.

## Run independently

```bash
npm run dev:crow-and-pitcher
```

For animation and scene inspection without the introduction overlay:

```text
http://localhost:5173/?mode=cinematic
```

## Controls

- Move: WASD or arrow keys
- Touch: drag the on-screen joystick
- Drop a pebble: Space, Enter, or the visible Drop button

## Current story loop

Guide the crow to three pebbles, carry each one to the pitcher, and drop it inside. The water rises after every pebble and the story closes with “Little by little does the trick.”

The crow uses the rigged Blender model in `public/models/crow.glb`, including its `Perched_Idle`, `Takeoff`, `Fly_Loop`, and `Land` clips. The garden and remaining objects use lightweight procedural Three.js geometry. Narration recordings and richer environmental audio can be added without changing the shared runtime contract.
