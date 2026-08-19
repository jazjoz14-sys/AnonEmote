import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              plugins: [
                {
                  handlerDidError: async () =>
                    new Response(
                      JSON.stringify({
                        offline: true,
                        message: 'You appear to be offline.',
                      }),
                      { headers: { 'Content-Type': 'application/json' } }
                    ),
                },
              ],
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: { maxEntries: 10 },
            },
          },
        ],
      },
      manifest: false,
    }),
  ],
  server: {
    port: 5173,
    // Listen on all interfaces so the dev server is reachable over the LAN
    // and through tunnels, not just localhost.
    host: true,
    proxy: {
      // Requests to /api are proxied server-side to the backend, so exposing
      // only port 5173 is enough — the API rides along on the same origin.
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
    },
    // Allow tunnel hostnames (Cloudflare / localtunnel / ngrok) to reach the
    // dev server without being rejected as an unknown host.
    allowedHosts: true,
    hmr: {
      // Let HMR work through a tunnel's HTTPS connection
      clientPort: 5173,
    },
  },
})
