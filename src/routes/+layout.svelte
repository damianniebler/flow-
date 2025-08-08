<script>
	import { onMount } from 'svelte';
	import Header from './Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import { getCurrentUser, user } from '$lib/auth';
	import { ensureInitialized } from '$lib/microsoftAuth';
	import { sidebarVisible, darkMode, overlayShown } from '$lib/stores/sidebarStore';
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { initCalendarService } from '$lib/services/calendarService';

	// Imports for event listeners & popup
	import { listen } from '@tauri-apps/api/event';
	import { popupStore } from '$lib/stores/popupStore.js';
	import EventPopup from '$lib/components/EventPopup.svelte';

	let authReady = false;
	let isLoading = false;
	let hasShownOverlayLocally = false;

	onMount(async () => {
		// Ensure MSAL redirect is processed before rendering UI
		if (browser) {
			try {
				const msalInstance = await ensureInitialized();
				if (msalInstance?.config?.auth) {
					msalInstance.config.auth.redirectUri = window.location.origin;
					msalInstance.config.auth.postLogoutRedirectUri = window.location.origin;
					msalInstance.config.auth.navigateToLoginRequestUrl = false;
				}
				if (msalInstance?.handleRedirectPromise) {
					await msalInstance.handleRedirectPromise();
				}
			} catch (err) {
				console.error('Error handling Microsoft auth redirect:', err);
			} finally {
				authReady = true;
			}
		}
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
			// Listen for "event-starting-soon" popup events from Rust
			const unlistenEventSoon = await listen('event-starting-soon', (event) => {
				console.log('Received event from Rust:', event.payload);
				popupStore.set({ visible: true, title: event.payload.title });
			});

			// Dark mode setup
			const savedMode = localStorage.getItem('darkMode');
			if (savedMode) {
				darkMode.set(savedMode === 'true');
			}
			darkMode.subscribe((value) => {
				localStorage.setItem('darkMode', value.toString());
			});

			// Tutorial script
			if (!$page.url.pathname.includes('reset-password')) {
				const script = document.createElement('script');
				script.src = '/tutorial.js';
				document.body.appendChild(script);
			}

			// Overlay first-time logic
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

			// Cleanup
			return () => {
				unlistenEventSoon();
			};
		}
	});

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

{#if authReady}
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
{/if}
