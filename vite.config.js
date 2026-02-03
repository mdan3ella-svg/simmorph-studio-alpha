import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Ensures all assets are prefixed with your repository name for GitHub Pages
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
