import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',  // 🔥 Modifié pour le sous-domaine simulateur.abienergie.fr
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
    host: true
  },
  envPrefix: 'VITE_'
});
