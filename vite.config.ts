/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import {
  CLONED_LANES,
  fillRouteHead,
  injectBeacon,
  routeFileName,
  swapRouteHead,
} from './src/pages/routeMeta'

/**
 * Each lane's static HTML. The apex `index.html` gets the SEC lane's head in
 * place of its marker (and the analytics beacon when a token is set); after
 * Vite has written it, `file/index.html` and `mcp/index.html` are emitted as
 * the same page with their own head, so the hashed asset paths and the body
 * have one source. CloudFront maps `/file` and `/mcp` to those files.
 * `enforce: 'post'` puts `generateBundle` after Vite's HTML plugin, which is
 * what emits `index.html` into the bundle.
 */
function siteHead(analyticsToken: string | undefined): Plugin {
  return {
    name: 'xbrlkit-site-head',
    enforce: 'post',
    transformIndexHtml(html) {
      return injectBeacon(fillRouteHead(html), analyticsToken)
    },
    generateBundle(_options, bundle) {
      const apex = bundle['index.html']
      if (!apex || apex.type !== 'asset') throw new Error('The build emitted no index.html')
      const html = String(apex.source)
      for (const lane of CLONED_LANES) {
        this.emitFile({
          type: 'asset',
          fileName: routeFileName(lane),
          source: swapRouteHead(html, lane),
        })
      }
    },
  }
}

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
    plugins: [react(), siteHead(env.VITE_CF_ANALYTICS_TOKEN)],
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
