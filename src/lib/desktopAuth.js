import { open } from '@tauri-apps/api/shell';
import { fetch, Body } from '@tauri-apps/api/http';
import { start, onUrl, cancel } from '@fabianlars/tauri-plugin-oauth';
import { MICROSOFT_CLIENT_ID } from '$lib/env';

const TENANT = 'common';
const AUTH_ENDPOINT = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const SCOPES = ['openid', 'profile', 'offline_access', 'User.Read', 'Calendars.Read'];

function base64UrlEncode(bytes) {
	const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Base64Url(input) {
	const enc = new TextEncoder();
	const data = enc.encode(input);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return base64UrlEncode(new Uint8Array(hash));
}

function randomBase64Url(bytes = 32) {
	const arr = new Uint8Array(bytes);
	crypto.getRandomValues(arr);
	return base64UrlEncode(arr);
}

function savePkceState(state) {
	localStorage.setItem('ms_pkce_state', JSON.stringify(state));
}

function takePkceState() {
	const raw = localStorage.getItem('ms_pkce_state');
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		localStorage.removeItem('ms_pkce_state');
		return parsed;
	} catch (_) {
		localStorage.removeItem('ms_pkce_state');
		return null;
	}
}

function saveTokens(tokens) {
	localStorage.setItem('ms_tokens', JSON.stringify(tokens));
}

function loadTokens() {
	const raw = localStorage.getItem('ms_tokens');
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch (_) {
		localStorage.removeItem('ms_tokens');
		return null;
	}
}

export async function login() {
	const state = randomBase64Url(16);
	const verifier = randomBase64Url(64);
	const challenge = await sha256Base64Url(verifier);
	savePkceState({ state, verifier });

	const port = await start();
	const redirectUri = `http://localhost:${port}`;

	const params = new URLSearchParams({
		client_id: MICROSOFT_CLIENT_ID,
		response_type: 'code',
		redirect_uri: redirectUri,
		response_mode: 'query',
		scope: SCOPES.join(' '),
		code_challenge: challenge,
		code_challenge_method: 'S256',
		state
	});

	const authUrl = `${AUTH_ENDPOINT}?${params.toString()}`;

	const urlPromise = new Promise((resolve) => {
		onUrl((url) => resolve(url));
	});

	await open(authUrl);
	const urlStr = await urlPromise;
	await cancel();

	try {
		const u = new URL(urlStr);
		const code = u.searchParams.get('code');
		const cbState = u.searchParams.get('state');
		const saved = takePkceState();
		if (!saved || !code || saved.state !== cbState) {
			return;
		}
		const tokenResp = await fetch(TOKEN_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: Body.form({
				client_id: MICROSOFT_CLIENT_ID,
				grant_type: 'authorization_code',
				code,
				redirect_uri: redirectUri,
				code_verifier: saved.verifier
			})
		});
		const body = tokenResp.data;
		const now = Math.floor(Date.now() / 1000);
		const tokens = {
			accessToken: body.access_token,
			refreshToken: body.refresh_token,
			idToken: body.id_token,
			expiresAt: now + (body.expires_in || 3600)
		};
		saveTokens(tokens);
		window.location.reload();
	} catch (e) {
		console.error('Desktop login failed:', e);
	}
}

export async function getAccessToken() {
	let tokens = loadTokens();
	const now = Math.floor(Date.now() / 1000);
	if (!tokens || !tokens.accessToken || (tokens.expiresAt && tokens.expiresAt - 60 <= now)) {
		if (tokens && tokens.refreshToken) {
			try {
				const resp = await fetch(TOKEN_ENDPOINT, {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: Body.form({
						client_id: MICROSOFT_CLIENT_ID,
						grant_type: 'refresh_token',
						refresh_token: tokens.refreshToken,
						scope: SCOPES.join(' '),
						redirect_uri: `http://localhost`
					})
				});
				const body = resp.data;
				const updated = {
					accessToken: body.access_token,
					refreshToken: body.refresh_token || tokens.refreshToken,
					idToken: body.id_token || tokens.idToken,
					expiresAt: now + (body.expires_in || 3600)
				};
				saveTokens(updated);
				tokens = updated;
			} catch (e) {
				console.warn('Refresh token failed, starting new desktop login');
				await login();
				return null;
			}
		} else {
			await login();
			return null;
		}
	}
	return tokens?.accessToken || null;
}

export function logout() {
	localStorage.removeItem('ms_tokens');
}

export function isLoggedIn() {
	const tokens = loadTokens();
	return !!(tokens && tokens.accessToken);
}

export function ensureInitialized() {
	return Promise.resolve();
}

export function getMsalInstance() {
	return null;
}
