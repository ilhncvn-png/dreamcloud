import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    __VITE_API_URL__: JSON.stringify(
      process.env['VITE_API_URL'] ?? 'https://api.dreamclaude.org/api/v1',
    ),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
