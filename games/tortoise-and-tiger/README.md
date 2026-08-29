# The Tortoise and the Tiger

Vite + TypeScript + Three.js implementation of the first seven forest-river
story scenes. The current slice introduces the tortoise, follows his butterfly
walk, reveals the hungry tiger through the bushes, and stages their first
face-to-face encounter, first interactive shell escape, and the tiger's second
attempt to defeat the shell, the tortoise's river trick, and the tiger picking
up the shell. The final continuous
scene-stitching pass remains to be implemented.

## Development

From the repository root:

```bash
npm run dev:tortoise-and-tiger
```

Scene-wise development URLs:

```text
?scene=1
?scene=2&state=butterfly
?scene=3&state=tail
?scene=3&state=paw
?scene=3&state=stripes
?scene=3&state=face
?scene=3&state=hungry
?scene=3&state=sniff
?scene=3&state=pov
?scene=3&state=lunch
?scene=4&state=narrator
?scene=4&state=greeting
?scene=4&state=reply
?scene=4&state=circle
?scene=4&state=snack
?scene=4&state=worried
?scene=4&state=shell
?scene=5
?scene=5&state=progress
?scene=5&state=tuck
?scene=5&state=hidden
?scene=5&state=tok
?scene=5&state=sniff
?scene=5&state=side
?scene=5&state=second-tap
?scene=5&state=retreat
?scene=5&state=disappointed
?scene=5b
?scene=5b&state=continuity
?scene=5b&state=push
?scene=5b&state=bite
?scene=5b&state=narrator
?scene=5b&state=complaint
?scene=5b&state=peek
?scene=5b&state=reply
?scene=5b&state=scratch
?scene=5b&state=question
?scene=5b&state=thinking
?scene=6
?scene=6&state=way
?scene=6&state=interest
?scene=6&state=sun
?scene=6&state=pause
?scene=6&state=river
?scene=6&state=think
?scene=6&state=complete
?scene=7
?scene=7&state=flatter
?scene=7&state=laugh
?scene=7&state=narrator
?scene=7&state=pickup
?scene=7&state=complete
```

## Validation

```bash
npm run typecheck
npm run build
```
