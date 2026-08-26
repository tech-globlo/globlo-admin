import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_URL || 'http://localhost:8000'

  return {
    base: './',
    build: {
      outDir: 'build',
    },
    preview: {
      allowedHosts: ['.up.railway.app', 'localhost', 'admin.globlo.app', 'dev.admin.globlo.app'],
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'globlo-icon.png', 'globlo-icon-1024.png'],
        manifest: {
          name: 'Globlo Admin',
          short_name: 'Globlo Admin',
          description: 'Globlo Travel Platform Admin Panel',
          theme_color: '#321fdb',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          // Chrome's installability check requires an explicit numeric size
          // >=192 and >=512 in both dimensions — a single `sizes: "any"`
          // icon silently fails that check (no error, install prompt just
          // never appears). Two concrete sizes fixes it.
          icons: [
            { src: 'globlo-icon.png', sizes: '192x192', type: 'image/png' },
            { src: 'globlo-icon-1024.png', sizes: '1024x1024', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/trpc\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            { urlPattern: /\/api\//, handler: 'NetworkOnly' },
            { urlPattern: /\/trpc\//, handler: 'NetworkOnly' },
          ],
        },
      }),
    ],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/trpc': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
