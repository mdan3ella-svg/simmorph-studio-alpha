import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * SIMMORPH VITE CONFIG v7.9.70
 * Optimized for GitHub Pages subfolder deployment.
 */
export default defineConfig({
  plugins: [react()],
  // Matches your repository name exactly for asset routing
  base: '/simmorph-studio-alpha/',
  build: {
    outDir: 'dist',
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          vendor: ['react', 'react-dom', 'lucide-react', 'firebase/app']
        }
      }
    }
  }
});
