import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html'
		}),
		// Default to root paths; Electron intercepts requests and serves
		// files from the build directory so these don't need to be relative
		paths: {
			base: '',
			assets: ''
		}
	}
};

export default config;
