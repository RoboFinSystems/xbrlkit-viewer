/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Load .env / .env.local (plus inline shell vars) so the local-package link
  // can live in a file rather than a command-line prefix: copy .env.example to
  // .env. Inline vars still override the file.
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // Opt-in local link to a sibling checkout of @robosystems/report-components:
  // `VITE_LOCAL_REPORT_COMPONENTS=true` resolves the package (and its /adapters
  // subpath) to ../robosystems-report-components/dist so unpublished render
  // changes can be exercised against live SEC data. Requires a fresh
  // `npm run build` in that repo. Off by default, so CI/prod builds are unaffected.
  const useLocalRC = env.VITE_LOCAL_REPORT_COMPONENTS === 'true'
  const rcDist = (p: string): string =>
    fileURLToPath(new URL(`../robosystems-report-components/dist/${p}`, import.meta.url))

  return {
    plugins: [react()],
    resolve: {
      // A single React instance across the app and the (aliased) local package.
      dedupe: ['react', 'react-dom'],
      alias: useLocalRC
        ? [
            {
              find: '@robosystems/report-components/adapters',
              replacement: rcDist('adapters/index.js'),
            },
            { find: '@robosystems/report-components', replacement: rcDist('index.js') },
          ]
        : [],
    },
    // Don't pre-bundle the aliased local build — pick up rebuilds without cache.
    optimizeDeps: useLocalRC ? { exclude: ['@robosystems/report-components'] } : undefined,
    server: {
      proxy: {
        // ElevenLabs TTS (voice): strip the prefix so `/eleven/v1/...` reaches
        // `api.elevenlabs.io/v1/...`. The SEC catalog and the report files come
        // from the public data CDN, which allows cross-origin reads, so they need
        // no proxy.
        '/eleven': {
          target: 'https://api.elevenlabs.io',
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/eleven/, ''),
        },
      },
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      include: ['test/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    },
  }
})
