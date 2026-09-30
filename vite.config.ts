import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the game from https://<user>.github.io/leviathan/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/leviathan/' : '/',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Leviatano',
        short_name: 'Leviatano',
        description: 'Esplora il mare oscuro, doma le bestie degli abissi.',
        lang: 'it',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: '#02070c',
        theme_color: '#02070c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // precache everything the game needs, so it plays with no connection
        globPatterns: ['**/*.{js,css,html,webp,png,jpg,svg,ico,json,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
}));
