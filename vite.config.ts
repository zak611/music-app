import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Chemins relatifs : l'app fonctionne aussi bien à la racine d'un domaine
  // que dans un sous-dossier (ex. GitHub Pages : /music-app/).
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Music App',
        short_name: 'Music',
        description: 'Lecteur de musique hors ligne pour tes fichiers audio.',
        lang: 'fr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#0f0f14',
        theme_color: '#0f0f14',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
