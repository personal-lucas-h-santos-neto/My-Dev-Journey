import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/My-Dev-Journey/',
  server: {
    port: 4173,
  },
});
