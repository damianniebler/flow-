import { getAccessToken } from '$lib/auth';
import { invoke } from '@tauri-apps/api/core';

let checkInterval = null;
const notifiedEventIds = new Set();

/**
 * Fetches calendar events from Microsoft Graph API for the next hour.
 */
async function fetchUpcomingEvents(accessToken) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setHours(endDate.getHours() + 1);

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
        const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Prefer': `outlook.timezone="${userTimezone}"`
                }
            }
        );
        if (!response.ok) {
            throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
        }
        const data = await response.json();
        return data.value || [];
    } catch (error) {
        console.error('Error fetching MS Graph events:', error);
        return [];
    }
}

/**
 * Checks for events starting in the next 5 minutes and triggers the taskbar flash.
 */
async function checkForNotifications() {
    console.log(`[${new Date().toLocaleTimeString()}] Checking for upcoming events...`);
    const accessToken = await getAccessToken();

    if (!accessToken) {
        console.log('Not logged into Microsoft, skipping check.');
        return;
    }

    const upcomingEvents = await fetchUpcomingEvents(accessToken);
    const now = new Date();

    if (upcomingEvents.length > 0) {
        console.log(`Found ${upcomingEvents.length} total events in the next hour.`);
    }

    for (const event of upcomingEvents) {
        const eventStartTime = new Date(event.start.dateTime);
        const minutesUntilStart = (eventStartTime.getTime() - now.getTime()) / 60000;

        console.log(`-> Event: "${event.subject}" starts in ${minutesUntilStart.toFixed(2)} minutes.`);

        if (minutesUntilStart > 0 && minutesUntilStart <= 5 && !notifiedEventIds.has(event.id)) {
            console.log(`✅ MATCH FOUND! Triggering flash for "${event.subject}".`);

            // --- THIS IS THE UPDATED LINE ---
            // Pass the event's subject as the 'title' payload to the Rust command
            await invoke('flash_taskbar', { title: event.subject });

            notifiedEventIds.add(event.id);
            break;
        }
    }
    console.log("--- Check complete ---");
}

/**
 * Starts the service to periodically check for calendar events.
 */
export function initCalendarService() {
    if (checkInterval) return;

    console.log("Initializing Calendar Notification Service...");
    checkInterval = setInterval(checkForNotifications, 15000);
    checkForNotifications();
}