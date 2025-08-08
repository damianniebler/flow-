import { PublicClientApplication } from '@azure/msal-browser';
import { MICROSOFT_CLIENT_ID } from '$lib/env';

const msalConfig = {
	auth: {
		clientId: MICROSOFT_CLIENT_ID,
		authority: 'https://login.microsoftonline.com/common',
		redirectUri: typeof window !== 'undefined' ? window.location.origin : undefined,
		navigateToLoginRequestUrl: false
	},
	cache: {
		cacheLocation: 'localStorage',
		storeAuthStateInCookie: true
	}
};

let msalInstance = null;
let initializePromise = null;
let isInitializing = false;

function getMsalInstance() {
	if (!msalInstance) {
		msalInstance = new PublicClientApplication(msalConfig);
	}
	return msalInstance;
}

export async function ensureInitialized() {
	const instance = getMsalInstance();
	if (!isInitializing && !initializePromise) {
		isInitializing = true;
		initializePromise = instance.initialize().finally(() => {
			isInitializing = false;
		});
	}
	await initializePromise;
	return instance;
}

export function isLoggedIn() {
	const instance = getMsalInstance();
	return instance.getAllAccounts().length > 0;
}

export async function login() {
	const instance = getMsalInstance();
	await ensureInitialized();
	const loginRequest = {
		scopes: ['User.Read', 'Calendars.Read'],
		prompt: 'select_account'
	};
	await instance.loginRedirect(loginRequest);
}

export async function getAccessToken() {
	const instance = getMsalInstance();
	await ensureInitialized();
	const accounts = instance.getAllAccounts();
	if (accounts.length === 0) return null;
	try {
		const response = await instance.acquireTokenSilent({
			scopes: ['User.Read', 'Calendars.Read'],
			account: accounts[0]
		});
		return response.accessToken;
	} catch (e) {
		console.error('Token acquisition failed silently:', e);
		return null;
	}
}

export async function logout() {
	const instance = getMsalInstance();
	await ensureInitialized();
	const accounts = instance.getAllAccounts();
	if (accounts.length === 0) return;
	await instance.logoutRedirect({
		account: accounts[0],
		postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : undefined
	});
}

export { getMsalInstance };
