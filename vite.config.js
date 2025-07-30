import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	clearScreen: false,
	server: {
		port: 5173, // The default SvelteKit port
		strictPort: true
	},
	ssr: {
		noExternal: ['@tauri-apps/api']
	},
	optimizeDeps: {
		exclude: ['@tauri-apps/api']
	}
});
