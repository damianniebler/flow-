console.log('>>> Vite config loaded with base: ./');

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [sveltekit()],
  build: {
    assetsInlineLimit: 0
  }
});
