import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

// `vite build --mode artifact` makes a one-file trial build that runs inside a Claude artifact:
// no service worker, no code splitting, and the map worker embedded in the page.
// SEED_TSV points at an itinerary file to preload; it is not part of the repository.
export default defineConfig(({ mode }) => {
  if (mode === 'artifact') {
    return {
      base: './',
      plugins: [react()],
      resolve: {
        alias: [
          { find: /^\.\.\/platform\/mapWorker$/, replacement: src('platform/mapWorker.artifact.ts') },
          { find: /^\.\/platform\/seed$/, replacement: src('platform/seed.artifact.ts') },
          { find: /^seed-itinerary/, replacement: process.env.SEED_TSV ?? src('platform/empty.tsv') },
        ],
      },
      build: {
        outDir: 'dist-artifact',
        assetsInlineLimit: Number.MAX_SAFE_INTEGER,
        rolldownOptions: { output: { codeSplitting: false } },
      },
    }
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'World Travel',
          short_name: '세계여행',
          description: '세계여행 계획, 지도, 가계부, 기록',
          lang: 'ko',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '.',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          // Map tiles and styles seen once stay available offline.
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
              handler: 'CacheFirst',
              options: {
                cacheName: 'map-tiles',
                expiration: { maxEntries: 5000, maxAgeSeconds: 60 * 60 * 24 * 180 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  }
})
