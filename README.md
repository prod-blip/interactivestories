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
