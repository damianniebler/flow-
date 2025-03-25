<script>
    import { onMount } from 'svelte';
    import { supabase } from '../../supabase';
    import { getAccessToken, loginWithMicrosoft, getMsalInstance, isMicrosoftLoggedIn, ensureInitialized } from '$lib/auth';

    
    export let entityId;
    
    let calendarEvents = [];
    let linkedEvents = [];
    let loading = true;
    let error = null;
    let currentUser = null;
    
    // Handle redirect when component mounts
    onMount(async () => {
  try {
    console.log("Starting onMount");
    
    // Get the current user
    const { data } = await supabase.auth.getUser();
    currentUser = data.user;
    console.log("Current user:", currentUser);
    
    if (!currentUser) {
      error = "You need to be logged in to access calendar";
      loading = false;
      return;
    }
    
    // First, ensure MSAL is initialized
    const msalInstance = await ensureInitialized();
    console.log("MSAL initialized:", !!msalInstance);
    
    if (!msalInstance) {
      error = "Failed to initialize Microsoft authentication";
      loading = false;
      return;
    }
    
    // Handle any redirect from Microsoft authentication
    try {
      const result = await msalInstance.handleRedirectPromise();
      console.log("Redirect result:", result);
      if (result) {
        console.log("Successfully handled authentication redirect");
      }
    } catch (redirectError) {
      console.error("Error handling authentication:", redirectError);
    }
    
    // Check if already logged in with Microsoft
    const msLoggedIn = isMicrosoftLoggedIn();
    console.log("Microsoft logged in:", msLoggedIn);
    
    // Try to get a token
    const token = await getAccessToken();
    console.log("Token acquired:", !!token);
    
    if (!token && !msLoggedIn) {
      error = "You need to connect your Microsoft account to access calendar";
      loading = false;
      return;
    }
    
    // Continue with loading calendar data
    await loadCalendarData();
  } catch (err) {
    console.error('Error in onMount:', err);
    error = err.message;
    loading = false;
  }
});
    
async function loadCalendarData() {
  try {
    console.log("Starting loadCalendarData");
    
    // Get already linked events
    linkedEvents = await getEntityCalendarEvents(entityId);
    console.log("Linked events:", linkedEvents);
    
    // Get access token for Microsoft Graph API
    const accessToken = await getAccessToken();
    console.log("Access token obtained:", !!accessToken);
    
    if (!accessToken) {
      error = "You need to connect your Microsoft account to access calendar";
      loading = false;
      return;
    }
    
    // Set date range for next 30 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    console.log("Date range:", { startDate, endDate });
    
    // Fetch calendar events
    calendarEvents = await fetchUserCalendarEvents(
      accessToken,
      startDate,
      endDate
    );
    console.log("Fetched calendar events:", calendarEvents);
    
    // Filter out already linked events
    const linkedEventIds = linkedEvents.map(e => e.event_id);
    calendarEvents = calendarEvents.filter(event => !linkedEventIds.includes(event.id));
    console.log("Filtered calendar events:", calendarEvents);
  } catch (err) {
    console.error('Error loading calendar data:', err);
    error = err.message;
  } finally {
    loading = false;
  }
}
    
    async function fetchUserCalendarEvents(accessToken, startDate, endDate) {
      try {
        const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'outlook.timezone="UTC"'
          }
        });
        
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
        const { data, error } = await supabase
          .from('calendar_events')
          .insert({
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
          throw new Error("User not authenticated");
        }
        
        await linkEventToEntity(
          currentUser.id,
          entityId,
          event.id,
          event
        );
        
        // Update the lists
        linkedEvents = [...linkedEvents, {
          event_id: event.id,
          event_title: event.subject,
          event_start: event.start.dateTime,
          event_end: event.end.dateTime,
          event_location: event.location?.displayName || '',
          event_details: event
        }];
        
        calendarEvents = calendarEvents.filter(e => e.id !== event.id);
        
      } catch (err) {
        console.error('Error linking event:', err);
        error = err.message;
      }
    }
    
    function formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString();
    }
    
    // Handle Microsoft login
    async function handleMicrosoftLogin() {
      try {
        loading = true;
        error = null;
        
        // This will redirect the user to Microsoft login
        await loginWithMicrosoft();
        
        // The code below won't execute immediately due to the redirect
        // It will run when the user returns from the Microsoft login page
      } catch (err) {
        console.error('Error connecting to Microsoft:', err);
        error = err.message;
        loading = false;
      }
    }
  </script>
  
  <div class="calendar-container">
    <h2>Calendar Events</h2>
    
    {#if loading}
      <p>Loading calendar data...</p>
    {:else if error}
      <p class="error">{error}</p>
      {#if error.includes("connect your Microsoft account")}
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
    
    .event-time, .event-location {
      font-size: 0.9em;
      color: #666;
    }
    
    .link-button {
      margin-top: 8px;
      padding: 5px 10px;
      background-color: #4CAF50;
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