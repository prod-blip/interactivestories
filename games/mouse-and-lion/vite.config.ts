export default {
  base: '/games/mouse-and-lion/',
  build: {
    outDir: '../../apps/web/public/games/mouse-and-lion',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        game: 'index.html',
        characterLab: 'character-lab.html',
      },
    },
  },
};
