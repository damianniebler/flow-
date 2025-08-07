<script>
	import { onMount } from 'svelte';
	import Header from './Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import { getCurrentUser, user } from '$lib/auth';
	import { sidebarVisible, darkMode, overlayShown } from '$lib/stores/sidebarStore';
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { initCalendarService } from '$lib/services/calendarService';

	// --- NEW: Imports for the event listener and popup ---
	import { listen } from '@tauri-apps/api/event';
	import { popupStore } from '$lib/stores/popupStore.js';
	import EventPopup from '$lib/components/EventPopup.svelte';

	let isLoading = false;
	let hasShownOverlayLocally = false;

	// The onMount function needs to be async to set up the listener
	onMount(async () => {
		getCurrentUser();
		if (window.innerWidth <= 768) {
			sidebarVisible.set(false);
		}

		document.addEventListener('SidebarShowRequest', () => {
			if (window.innerWidth <= 768) {
				sidebarVisible.set(true);
			}
		});

		if (browser) {
			// --- NEW: Listen for the 'event-starting-soon' event from Rust ---
			const unlisten = await listen('event-starting-soon', (event) => {
				console.log('Received event from Rust:', event.payload);
				// Update the store to show the popup with the event title
				popupStore.set({ visible: true, title: event.payload.title });
			});

			const savedMode = localStorage.getItem('darkMode');
			if (savedMode) {
				darkMode.set(savedMode === 'true');
			}

			darkMode.subscribe((value) => {
				localStorage.setItem('darkMode', value.toString());
			});

			if (!$page.url.pathname.includes('reset-password')) {
				const script = document.createElement('script');
				script.src = '/tutorial.js';
				document.body.appendChild(script);
			}

			const hasShownOverlay = localStorage.getItem('overlayShown') === 'true';
			if (!hasShownOverlay && $page.url.pathname !== '/notepad') {
				isLoading = true;
				hasShownOverlayLocally = true;
				localStorage.setItem('overlayShown', 'true');
				setTimeout(() => {
					isLoading = false;
					overlayShown.set(true);
				}, 1500);
			} else {
				overlayShown.set(true);
			}

			// NEW: Return a cleanup function for the listener
			return () => {
				unlisten();
			};
		}
	});

	// Your existing reactive statements are perfect
	$: if (
		browser &&
		!hasShownOverlayLocally &&
		!$overlayShown &&
		$page.url.pathname !== '/notepad'
	) {
		isLoading = true;
		hasShownOverlayLocally = true;
		setTimeout(() => {
			isLoading = false;
			overlayShown.set(true);
			localStorage.setItem('overlayShown', 'true');
		}, 1500);
	}

	$: if ($user) {
		document.dispatchEvent(new Event('UserLoggedIn'));
	}

	$: if (browser) {
		$darkMode
			? document.body.classList.add('dark-mode')
			: document.body.classList.remove('dark-mode');
	}

	$: if (browser && window.innerWidth <= 768 && $page) {
		sidebarVisible.set(false);
	}

	$: if ($user && browser) {
		initCalendarService();
	}
</script>

<EventPopup />

{#if $page.url.pathname !== '/notepad' && isLoading}
	<LoadingScreen bind:isLoading />
{/if}

<div class="app">
	<Header />
	<div class="content">
		{#if $user}
			<Sidebar />
		{/if}
		<main>
			<slot />
		</main>
	</div>
	<div id="overlay" class="overlay hidden"></div>
</div>
