# Moonlit Stories

A calm library of interactive bedtime stories for children and their grown-ups.

## Development

```bash
npm install
npm run build:games
npm run dev
```

Open `http://localhost:3000`. The game build is copied into the website's public directory, so run `npm run build:games` after changing a game.

To work on the Mouse and Lion game independently:

```bash
npm run dev:game
```

## Production

```bash
npm run build
```

The complete static website is generated in `apps/web/out`.

## Vercel

Import the repository with the **Root Directory left blank** so Vercel builds
from the monorepo root. The committed `vercel.json` installs the root npm
workspace, builds the games before the website, and deploys `apps/web/out`.

If the project was previously configured with `apps/web` as its Root Directory,
change it under **Settings → Build and Deployment → Root Directory**, then
redeploy without the previous build cache.
