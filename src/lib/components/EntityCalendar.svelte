<script>
	import { onMount } from 'svelte';
	import { supabase } from '../../supabase';
	import {
		getAccessToken,
		loginWithMicrosoft,
		isMicrosoftLoggedIn,
		ensureInitialized,
		logoutFromMicrosoft,
		getMsalInstance
	} from '$lib/microsoftAuth';
	import { InteractionRequiredAuthError } from '@azure/msal-browser';

	export let entityId;

	let calendarEvents = [];
	let linkedEvents = [];
	let loading = true;
	let error = null;
	let currentUser = null;
	let isMsLoggedIn = false; // --- ADD A STATE VARIABLE ---

	onMount(async () => {
		// ... your existing onMount code is fine ...
		try {
			console.log('Starting onMount');
			const { data } = await supabase.auth.getUser();
			currentUser = data.user;
			if (!currentUser) {
				error = 'You need to be logged in to access calendar';
				loading = false;
				return;
			}
			await ensureInitialized();
			isMsLoggedIn = isMicrosoftLoggedIn(); // --- UPDATE OUR STATE VARIABLE ---
			let token = await getAccessToken();
			if (!token) {
				if (!isMsLoggedIn) {
					error = 'You need to connect your Microsoft account to access calendar';
					loading = false;
					return;
				}
				try {
					const instance = getMsalInstance();
					const accounts = instance?.getAllAccounts?.() ?? [];
					if (accounts.length > 0) {
						const response = await instance.acquireTokenSilent({
							scopes: ['User.Read', 'Calendars.Read'],
							account: accounts[0]
						});
						token = response.accessToken;
					}
				} catch (e) {
					if (e instanceof InteractionRequiredAuthError || e.errorCode === 'interaction_required') {
						await getMsalInstance()?.acquireTokenRedirect({
							scopes: ['User.Read', 'Calendars.Read']
						});
						return;
					}
					console.error('Unexpected token error:', e);
					error = 'Failed to acquire Microsoft token';
					loading = false;
					return;
				}
			}
			await loadCalendarData();
		} catch (err) {
			console.error('Error in onMount:', err);
			error = err.message;
			loading = false;
		}
	});

	// --- ADD THIS LOGOUT FUNCTION ---
	async function handleMicrosoftLogout() {
		await logoutFromMicrosoft();
		// Reload the page to reset the state
		window.location.reload();
	}

	// ... all your other functions (loadCalendarData, etc.) are fine ...
	async function loadCalendarData() {
		try {
			console.log('Starting loadCalendarData');
			linkedEvents = await getEntityCalendarEvents(entityId);
			let accessToken = await getAccessToken();
			if (!accessToken) {
				try {
					const instance = getMsalInstance();
					const accounts = instance?.getAllAccounts?.() ?? [];
					if (accounts.length > 0) {
						const response = await instance.acquireTokenSilent({
							scopes: ['User.Read', 'Calendars.Read'],
							account: accounts[0]
						});
						accessToken = response.accessToken;
					}
				} catch (e) {
					if (e instanceof InteractionRequiredAuthError || e.errorCode === 'interaction_required') {
						await getMsalInstance()?.acquireTokenRedirect({
							scopes: ['User.Read', 'Calendars.Read']
						});
						return;
					}
					throw e;
				}
			}
			const startDate = new Date();
			const endDate = new Date();
			endDate.setDate(endDate.getDate() + 30);
			calendarEvents = await fetchUserCalendarEvents(accessToken, startDate, endDate);
			const linkedEventIds = linkedEvents.map((e) => e.event_id);
			calendarEvents = calendarEvents.filter((event) => !linkedEventIds.includes(event.id));
		} catch (err) {
			console.error('Error loading calendar data:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}
	async function fetchUserCalendarEvents(accessToken, startDate, endDate) {
		try {
			const response = await fetch(
				`https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}`,
				{
					method: 'GET',
					headers: {
						Authorization: `Bearer ${accessToken}`,
						'Content-Type': 'application/json',
						Prefer: 'outlook.timezone="UTC"'
					}
				}
			);
			if (!response.ok) {
				throw new Error(`Failed to fetch calendar events: ${response.status}`);
			}
			const data = await response.json();
			return data.value;
		} catch (error) {
			console.error('Error fetching calendar events:', error);
			throw error;
		}
	}
	async function linkEventToEntity(userId, entityId, eventId, eventDetails) {
		try {
			const { data, error } = await supabase.from('calendar_events').insert({
				user_id: userId,
				entity_id: entityId,
				event_id: eventId,
				event_title: eventDetails.subject,
				event_start: eventDetails.start.dateTime,
				event_end: eventDetails.end.dateTime,
				event_location: eventDetails.location?.displayName || '',
				event_details: eventDetails
			});
			if (error) throw error;
			return data;
		} catch (error) {
			console.error('Error linking event to entity:', error);
			throw error;
		}
	}
	async function getEntityCalendarEvents(entityId) {
		try {
			const { data, error } = await supabase
				.from('calendar_events')
				.select('*')
				.eq('entity_id', entityId);
			if (error) throw error;
			return data;
		} catch (error) {
			console.error('Error fetching entity calendar events:', error);
			throw error;
		}
	}
	async function handleLinkEvent(event) {
		try {
			if (!currentUser) {
				throw new Error('User not authenticated');
			}
			await linkEventToEntity(currentUser.id, entityId, event.id, event);
			linkedEvents = [
				...linkedEvents,
				{
					event_id: event.id,
					event_title: event.subject,
					event_start: event.start.dateTime,
					event_end: event.end.dateTime,
					event_location: event.location?.displayName || '',
					event_details: event
				}
			];
			calendarEvents = calendarEvents.filter((e) => e.id !== event.id);
		} catch (err) {
			console.error('Error linking event:', err);
			error = err.message;
		}
	}
	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleString();
	}
	async function handleMicrosoftLogin() {
		try {
			loading = true;
			error = null;
			await loginWithMicrosoft();
		} catch (err) {
			console.error('Error connecting to Microsoft:', err);
			error = err.message;
			loading = false;
		}
	}
</script>

<div class="calendar-container">
	<div class="calendar-header">
		<h2>Calendar Events</h2>
		{#if isMsLoggedIn}
			<button class="button disconnect-btn" on:click={handleMicrosoftLogout}
				>Disconnect Microsoft Account</button
			>
		{/if}
	</div>

	{#if loading}
		<p>Loading calendar data...</p>
	{:else if error}
		<p class="error">{error}</p>

		{#if error.includes('connect your Microsoft account')}
			<button class="button" on:click={handleMicrosoftLogin}>Connect Microsoft Calendar</button>
		{/if}
	{:else}
		<div class="linked-events">
			<h3>Linked Events</h3>
			{#if linkedEvents.length === 0}
				<p>No events linked to this entity yet.</p>
			{:else}
				<ul class="event-list">
					{#each linkedEvents as event}
						<li class="event-item">
							<div class="event-title">{event.event_title}</div>
							<div class="event-time">
								{formatDate(event.event_start)} - {formatDate(event.event_end)}
							</div>

							{#if event.event_location}
								<div class="event-location">{event.event_location}</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<div class="available-events">
			<h3>Available Events</h3>
			{#if calendarEvents.length === 0}
				<p>No upcoming events available to link.</p>
			{:else}
				<ul class="event-list">
					{#each calendarEvents as event}
						<li class="event-item">
							<div class="event-title">{event.subject}</div>
							<div class="event-time">
								{formatDate(event.start.dateTime)} - {formatDate(event.end.dateTime)}
							</div>
							{#if event.location?.displayName}
								<div class="event-location">{event.location.displayName}</div>
							{/if}
							<button class="link-button" on:click={() => handleLinkEvent(event)}>
								Link to Entity
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* --- ADD THESE STYLES --- */
	.calendar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
	}
	.calendar-header h2 {
		margin: 0;
	}
	.disconnect-btn {
		background-color: #d9534f; /* A reddish color */
		font-size: 0.8em;
	}
	.disconnect-btn:hover {
		background-color: #c9302c;
	}

	/* ... your existing styles are fine ... */
	.calendar-container {
		margin-top: 20px;
		padding: 15px;
		border: 1px solid #ddd;
		border-radius: 5px;
	}
	.event-list {
		list-style: none;
		padding: 0;
	}
	.event-item {
		padding: 10px;
		margin-bottom: 10px;
		border: 1px solid #eee;
		border-radius: 4px;
	}
	.event-title {
		font-weight: bold;
		margin-bottom: 5px;
	}
	.event-time,
	.event-location {
		font-size: 0.9em;
		color: #666;
	}
	.link-button {
		margin-top: 8px;
		padding: 5px 10px;
		background-color: #4caf50;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
	.link-button:hover {
		background-color: #45a049;
	}
	.error {
		color: red;
	}
	.button {
		display: inline-block;
		padding: 8px 16px;
		background-color: #0078d4;
		color: white;
		text-decoration: none;
		border-radius: 4px;
		margin-top: 10px;
	}
</style>
