import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'logo.png'],
      manifest: {
        name: 'X Vistoria',
        short_name: 'X Vistoria',
        description: 'Vistorias condominiais em tempo real',
        theme_color: '#0B1D35',
        background_color: '#0B1D35',
        display: 'standalone',
        start_url: '/x-vistoria',
        scope: '/',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /^\/v\//, /^\/sindico\//, /^\/portal\//, /^\/ponto\//, /^\/questionario\//, /^\/checklist-report\//, /^\/contrato/, /^\/excluir-conta/, /^\/politica-privacidade/],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'fontes', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'uploads', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
