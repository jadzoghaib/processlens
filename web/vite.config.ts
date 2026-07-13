import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base matches the GitHub Pages project path
export default defineConfig({
  base: '/processlens-studio/',
  plugins: [react(), tailwindcss()],
});
