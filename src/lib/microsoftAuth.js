import * as desktop from './desktopAuth';
import * as web from './webAuth';

function isTauri() {
	try {
		return typeof window !== 'undefined' && !!window.__TAURI__;
	} catch (_) {
		return false;
	}
}

const impl = isTauri() ? desktop : web;

export const ensureInitialized = impl.ensureInitialized;
export const getMsalInstance = impl.getMsalInstance;
export const loginWithMicrosoft = impl.login;
export const getAccessToken = impl.getAccessToken;
export const logoutFromMicrosoft = impl.logout;
export const isMicrosoftLoggedIn = impl.isLoggedIn;
