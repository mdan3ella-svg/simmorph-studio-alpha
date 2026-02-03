import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // TARGET: https://mdan3ella-svg.github.io/simmorph-studio-alpha/
  base: '/simmorph-studio-alpha/', 
  build: {
    target: 'esnext', 
    outDir: 'dist',
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          vendor: ['react', 'react-dom', 'lucide-react']
        }
      }
    }
  }
});
