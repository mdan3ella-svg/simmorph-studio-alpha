import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // FIXED: Matches your exact repository name for GitHub Pages routing
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
