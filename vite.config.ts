import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Changé de 'autoUpdate' à 'prompt' pour éviter l'enregistrement automatique
      manifest: {
        name: 'Simulateur Solaire',
        short_name: 'Simulateur',
        description: 'Votre simulateur solaire intelligent',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/logo-simulateur.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // Désactiver complètement l'enregistrement automatique du service worker
      injectRegister: false,
      // Désactiver le service worker en développement
      devOptions: {
        enabled: false
      }
    })
  ],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable', 'pdf-lib']
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    // Désactiver complètement le HMR pour éviter les rechargements en boucle
    hmr: false
  },
  envPrefix: 'VITE_'
});
