import { supabase } from '../supabase';
import { writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { MICROSOFT_CLIENT_ID } from '$lib/env';
import { PublicClientApplication, BrowserAuthError } from '@azure/msal-browser';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/api/shell';

export const user = writable(null);

// Supabase Authentication Functions (unchanged)

export async function signUp(email, password, firstName) {
	const { data: authData, error: authError } = await supabase.auth.signUp({
		email,
		password
	});

	if (authError) throw authError;

	if (authData.user) {
		const { error: insertError } = await supabase.from('users').insert([
			{
				id: authData.user.id,
				email: authData.user.email,
				first_name: firstName,
				password: null
			}
		]);

		if (insertError) throw insertError;

		await supabase.auth.signOut();
	}

	return authData;
}

export async function signIn(email, password) {
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password
	});

	if (error) throw error;

	user.set(data.user);

	console.log('User signed in, dispatching UserLoggedIn event');

	document.dispatchEvent(new Event('UserLoggedIn'));

	return data;
}

export async function signOut() {
	const { error } = await supabase.auth.signOut();

	if (error) throw error;

	user.set(null);

	goto('/login');
}

export async function getCurrentUser() {
	const {
		data: { user: currentUser }
	} = await supabase.auth.getUser();

	user.set(currentUser);

	return currentUser;
}

export async function resetPassword(email) {
	const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${window.location.origin}/reset-password`
	});

	if (error) throw error;

	return data;
}

function logStorageState() {
	if (typeof window !== 'undefined') {
		console.log('localStorage keys:', Object.keys(localStorage));
		console.log('sessionStorage keys:', Object.keys(sessionStorage));
		console.log('cookies:', document.cookie);
	}
}

// Microsoft Authentication with MSAL

const msalConfig = {
	auth: {
		clientId: MICROSOFT_CLIENT_ID,
		authority: 'https://login.microsoftonline.com/common',
		redirectUri: 'flowscend://auth', // Changed for custom protocol
		navigateToLoginRequestUrl: false
	},
	cache: {
		cacheLocation: 'localStorage',
		storeAuthStateInCookie: true
	},
	system: {
		allowRedirectInIframe: true,
		loggerOptions: {
			loggerCallback: (level, message, containsPii) => {
				if (containsPii) {
					return;
				}
				switch (level) {
					case 0:
						console.error(message);
						return;
					case 1:
						console.warn(message);
						return;
					case 2:
						console.info(message);
						return;
					case 3:
						console.debug(message);
						return;
				}
			},
			logLevel: 3
		}
	}
};

let msalInstance = null;
let isInitializing = false;
let initializePromise = null;

export function getMsalInstance() {
	if (typeof window !== 'undefined') {
		if (!msalInstance) {
			msalInstance = new PublicClientApplication(msalConfig);
			if (!isInitializing) {
				isInitializing = true;
				initializePromise = msalInstance
					.initialize()
					.catch((error) => {
						console.error('Failed to initialize MSAL:', error);
						isInitializing = false;
						throw error;
					})
					.then(() => {
						isInitializing = false;
						return msalInstance;
					});
			}
		}
		return msalInstance;
	}
	return null;
}

export function isMicrosoftLoggedIn() {
	logStorageState();
	const instance = getMsalInstance();
	if (!instance) return false;
	const accounts = instance.getAllAccounts();
	return accounts.length > 0;
}

export async function ensureInitialized() {
	const instance = getMsalInstance();
	if (!instance) return null;
	if (initializePromise) {
		await initializePromise;
	} else if (!isInitializing) {
		isInitializing = true;
		initializePromise = instance
			.initialize()
			.catch((error) => {
				console.error('Failed to initialize MSAL:', error);
				isInitializing = false;
				throw error;
			})
			.then(() => {
				isInitializing = false;
				return instance;
			});
		await initializePromise;
	}
	return instance;
}

export async function loginWithMicrosoft() {
	const instance = getMsalInstance();
	if (!instance) return null;

	try {
		await ensureInitialized();

		const loginRequest = {
			scopes: ['User.Read', 'Calendars.Read'],
			prompt: 'select_account'
		};

		// Listen for the auth-callback event from Rust
		const unlisten = await listen('auth-callback', async (event) => {
			try {
				const url = event.payload.url;
				console.log('Received auth-callback event with URL:', url);
				await instance.handleRedirectPromise(url);
				window.location.reload(); // Reload to reflect login state
			} catch (error) {
				console.error('Error handling redirect promise:', error);
			} finally {
				unlisten(); // Clean up listener
			}
		});

		const authUrl = await instance.getAuthCodeUrl(loginRequest);
		await open(authUrl);
	} catch (error) {
		console.error('Login failed:', error);
		throw error;
	}
}

export async function getAccessToken() {
	const instance = getMsalInstance();
	if (!instance) return null;

	try {
		logStorageState();
		await ensureInitialized();

		const accounts = instance.getAllAccounts();
		console.log('Current accounts:', accounts);

		if (accounts.length === 0) {
			console.log('No accounts found.');
			return null;
		}

		const silentRequest = {
			scopes: ['User.Read', 'Calendars.Read'],
			account: accounts[0]
		};

		try {
			const response = await instance.acquireTokenSilent(silentRequest);
			console.log('Silent token acquisition response:', response);
			return response.accessToken;
		} catch (error) {
			console.error('Token acquisition failed silently:', error);
			if (error instanceof BrowserAuthError && error.errorCode === 'interaction_required') {
				console.log('Interaction required, user needs to login.');
			}
			return null;
		}
	} catch (error) {
		console.error('Error getting access token:', error);
		return null;
	}
}

export async function logoutFromMicrosoft() {
	const instance = getMsalInstance();
	if (!instance) return;

	try {
		await ensureInitialized();
		const accounts = instance.getAllAccounts();
		if (accounts.length === 0) return;

		const logoutRequest = {
			account: accounts[0],
			postLogoutRedirectUri: window.location.origin
		};

		await instance.logoutRedirect(logoutRequest);
	} catch (error) {
		console.error('Logout failed:', error);
	}
}
