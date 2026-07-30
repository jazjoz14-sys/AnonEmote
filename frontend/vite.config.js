import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
