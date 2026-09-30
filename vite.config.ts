import { defineConfig } from 'vite';

// GitHub Pages serves the game from https://<user>.github.io/leviathan/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/leviathan/' : '/',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
}));
