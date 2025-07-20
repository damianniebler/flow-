import { writable } from 'svelte/store';
import { supabase } from '../../supabase';
import { appWindow } from '@tauri-apps/api/window';
import { sendNotification } from '@tauri-apps/api/notification';


// Store for active notifications
export const activeNotifications = writable([]);

// Debug mode for testing - set to false in production
const DEBUG_NOTIFICATIONS = true;

// Store for pending notifications that should be shown when tab becomes visible
const pendingNotifications = new Map();

function isTauri() {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

// Check for upcoming events and schedule notifications
export async function initNotificationService(userId) {
  console.log(`Initializing notification service for user: ${userId}`);
  
  // Consolidated permission request with better handling
  if (typeof Notification !== 'undefined') {
    try {
      // Check current permission status
      console.log("Current notification permission status:", Notification.permission);
      
      // Only request if status is 'default' (not yet decided)
      if (Notification.permission === 'default') {
        console.log("Requesting notification permission...");
        const permission = await Notification.requestPermission();
        console.log("Notification permission request result:", permission);
      } else if (Notification.permission === 'denied') {
        console.warn("Notification permission was previously denied by the user");
      } else if (Notification.permission === 'granted') {
        console.log("Notification permission already granted");
      }
    } catch (error) {
      console.error("Error handling notification permission:", error);
    }
  } else {
    console.warn("Notification API not available in this environment");
  }

  // Run initial check
  await checkUpcomingEvents(userId);
  
  // Set up different checking strategies based on visibility
  let checkInterval;
  
  const setupChecking = () => {
    if (typeof document !== 'undefined') {
      if (document.visibilityState === 'visible') {
        // When visible, check every minute
        if (checkInterval) clearInterval(checkInterval);
        checkInterval = setInterval(() => checkUpcomingEvents(userId), 60000);
        console.log("Set up visible tab checking interval (every minute)");
        
        // Process any pending notifications
        processPendingNotifications();
      } else {
        // When hidden, check immediately and set a shorter interval (more frequent)
        // This helps catch events even when the tab is in the background
        if (checkInterval) clearInterval(checkInterval);
        checkInterval = setInterval(() => checkUpcomingEvents(userId), 30000); // 30 seconds
        console.log("Set up background tab checking interval (every 30 seconds)");
      }
    }
  };
  
  // Initial setup
  setupChecking();
  
  // Set up broadcast channel for cross-tab communication
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('event_notifications');
    
    channel.addEventListener('message', (event) => {
      console.log("Received broadcast channel message:", event.data);
      if (event.data.type === 'NOTIFICATION_TRIGGERED') {
        showNotification(event.data.notification);
      }
    });
    console.log("Broadcast channel for cross-tab communication initialized");
  } else {
    console.warn("BroadcastChannel API not available - cross-tab notifications disabled");
  }
  
  // Handle visibility changes
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      const isVisible = document.visibilityState === 'visible';
      console.log(`Document visibility changed. Is visible: ${isVisible}`);
      
      // Update checking strategy
      setupChecking();
      
      if (isVisible) {
        // Re-check for notifications when tab becomes visible
        checkUpcomingEvents(userId);
      }
    });
    console.log("Document visibility change listener added");
  }
  
  // Try to register a service worker for more reliable notifications
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/notification-worker.js', {
        scope: '/'
      });
      console.log('Service Worker registered with scope:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

// Schedule a notification with the service worker
export async function scheduleNotificationWithServiceWorker(notification) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    console.log(`Scheduling notification with service worker: ${notification.title}`);
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      notification
    });
    return true;
  } else {
    console.warn('Service worker not available for scheduling notifications');
    return false;
  }
}


// Process any notifications that were queued while the tab was not visible
function processPendingNotifications() {
  console.log(`Processing ${pendingNotifications.size} pending notifications`);
  
  pendingNotifications.forEach((notification, id) => {
    console.log(`Processing pending notification: ${notification.title} (ID: ${id})`);
    
    // Add to active notifications store for in-app display
    activeNotifications.update(notifications => {
      if (!notifications.find(n => n.id === notification.id)) {
        return [...notifications, notification];
      }
      return notifications;
    });
    
    // Play sound for pending notifications
    focusWindowAndPlaySound();
    
    // Remove from pending
    pendingNotifications.delete(id);
  });
}

async function focusWindowAndPlaySound() {
  if (isTauri()) {
    try {
      await appWindow.show();
      await appWindow.setFocus();
      playNotificationSound();
    } catch (err) {
      console.error('Tauri: Could not focus window:', err);
      playNotificationSound(); // fallback for browser
    }
  } else {
    playNotificationSound();
  }
}



async function notifyEvent(notification) {
  await focusWindowAndPlaySound();
  if (isTauri()) {
    sendNotification({
      title: `Event: ${notification.title}`,
      body: `Starts at ${notification.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    });
  } else {
    showBrowserNotification(notification);
  }
}


// Check for events coming up in the next 5 minutes
async function checkUpcomingEvents(userId) {
  console.log(`Checking upcoming events for user: ${userId}`);
  try {
    // Current time
    const now = new Date();
    
    // Time 5 minutes from now
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
    
    // Time 6 minutes from now (to create a 1-minute window)
    const sixMinutesFromNow = new Date(now.getTime() + 6 * 60000);
    
    // Format times for query
    const fiveMinutesFromNowStr = fiveMinutesFromNow.toISOString();
    const sixMinutesFromNowStr = sixMinutesFromNow.toISOString();
    
    console.log(`Checking for events between ${fiveMinutesFromNowStr} and ${sixMinutesFromNowStr}`);
    
    // Query for events starting in the 5-6 minute window
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('event_start', fiveMinutesFromNowStr)
      .lt('event_start', sixMinutesFromNowStr);
      
    if (error) throw error;
    
    console.log(`Found ${data.length} upcoming events in the notification window`);
    
    // Process each upcoming event
    for (const event of data) {
      // Check if we've already notified for this event
      const alreadyNotified = localStorage.getItem(`notified_${event.id}`);
      
      if (!alreadyNotified) {
        console.log(`Preparing notification for event: ${event.event_title} (ID: ${event.id})`);
        // Create notification
        const notification = {
          id: event.id,
          title: event.event_title,
          start: new Date(event.event_start),
          location: event.event_location,
          entityId: event.entity_id
        };
        
        // Trigger notification
        triggerNotification(notification);
        
        // Mark as notified
        localStorage.setItem(`notified_${event.id}`, 'true');
        console.log(`Event ${event.id} marked as notified in localStorage`);
      } else {
        console.log(`Event ${event.id} already notified, skipping`);
      }
    }
  } catch (error) {
    console.error('Error checking upcoming events:', error);
  }
}

// Trigger notification across all tabs
function triggerNotification(notification) {
  console.log(`Triggering notification for event: ${notification.title} (ID: ${notification.id})`);

  // Try to schedule with service worker first (for background notifications)
  scheduleNotificationWithServiceWorker(notification).then(scheduled => {
    if (!scheduled) {
      // Fallback to browser notifications if service worker scheduling failed
      showBrowserNotification(notification);
    }
  });

  // Update store if tab is visible, otherwise queue for later
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    // Tab is visible, update store immediately
    activeNotifications.update(notifications => {
      if (!notifications.find(n => n.id === notification.id)) {
        return [...notifications, notification];
      }
      return notifications;
    });
    
    // Play sound
    focusWindowAndPlaySound();
  } else {
    // Tab is not visible, queue notification for when tab becomes visible
    console.log(`Tab not visible, queueing notification: ${notification.title}`);
    pendingNotifications.set(notification.id, notification);
  }

  // Broadcast to other tabs
  if (typeof BroadcastChannel !== 'undefined') {
    console.log("Broadcasting notification to other tabs");
    const channel = new BroadcastChannel('event_notifications');
    channel.postMessage({
      type: 'NOTIFICATION_TRIGGERED',
      notification
    });
  }
}


// Show notification UI and play sound
export function showNotification(notification) {
  console.log(`Showing notification for: ${notification.title} (ID: ${notification.id})`);
  
  // Add to active notifications store (for in-app component)
  activeNotifications.update(notifications => {
    if (!notifications.find(n => n.id === notification.id)) {
      console.log("Adding notification to active notifications store");
      return [...notifications, notification];
    }
    console.log("Notification already in store, not adding duplicate");
    return notifications;
  });
  
  // Play notification sound with improved reliability
  focusWindowAndPlaySound();
  
  // Always show browser notification for important events (5 min window is important)
  // or when tab is not visible, or in debug mode
  if (typeof document !== 'undefined') {
    const isVisible = document.visibilityState === 'visible';
    console.log(`Current document visibility: ${document.visibilityState}`);
    
    if (!isVisible || DEBUG_NOTIFICATIONS) {
      console.log("Showing browser notification (debug mode or tab not visible)");
      showBrowserNotification(notification);
    } else {
      console.log("Tab is visible and not in debug mode, not showing browser notification");
    }
  }
}

// Show browser notification
function showBrowserNotification(notification) {
  console.log(`Attempting to show browser notification for: ${notification.title}`);
  console.log(`Current notification permission: ${Notification.permission}`);
  
  if (typeof Notification === 'undefined') {
    console.error("Browser notification API not available");
    return;
  }
  
  if (Notification.permission !== 'granted') {
    console.error(`Cannot show notification - permission not granted (${Notification.permission})`);
    return;
  }
  
  try {
    // Format the time
    const startTime = notification.start.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    console.log(`Creating browser notification with start time: ${startTime}`);
    
    // Create the notification
    const browserNotification = new Notification(`Event Starting Soon: ${notification.title}`, {
      body: `Starting in 5 minutes at ${startTime}`,
      icon: '/favicon.png',
      tag: `event-${notification.id}`,
      requireInteraction: true, // Keep notification until user dismisses it
      silent: false // Try to use system sound
    });
    
    console.log("Browser notification created successfully");
    
    // Handle notification click
    browserNotification.onclick = function() {
      console.log("Browser notification clicked");
      // Focus the window
      window.focus();
      
      // Navigate to the entity page if needed
      if (notification.entityId) {
        console.log(`Navigating to entity page: /entity/${notification.entityId}`);
        window.location.href = `/entity/${notification.entityId}`;
      }
      
      // Close the notification
      browserNotification.close();
      console.log("Browser notification closed after click");
    };
  } catch (error) {
    console.error("Error showing browser notification:", error);
  }
}

// Dismiss a notification
export function dismissNotification(notificationId) {
  console.log(`Dismissing notification with ID: ${notificationId}`);
  activeNotifications.update(notifications =>
    notifications.filter(n => n.id !== notificationId)
  );
  
  // Also remove from pending if it exists
  if (pendingNotifications.has(notificationId)) {
    pendingNotifications.delete(notificationId);
    console.log(`Removed notification ${notificationId} from pending queue`);
  }
}

// Play notification sound with improved reliability
function playNotificationSound() {
  console.log("Attempting to play notification sound");
  try {
    // Try multiple audio formats
    const audio = new Audio();
    
    // Add multiple sources for better browser compatibility
    const sources = [
      '/notification-sound.mp3',
      '/notification-sound.ogg',
      '/notification-sound.wav'
    ];
    
    // Try each source until one works
    let sourceIndex = 0;
    
    // Function to try the next source
    const tryNextSource = () => {
      if (sourceIndex < sources.length) {
        const currentSource = sources[sourceIndex];
        console.log(`Trying to play sound from source: ${currentSource}`);
        audio.src = currentSource;
        audio.load();
        audio.play()
          .then(() => {
            console.log(`Successfully playing notification sound: ${currentSource}`);
          })
          .catch(error => {
            console.error(`Error playing ${currentSource}:`, error);
            sourceIndex++;
            tryNextSource();
          });
      } else {
        console.error("Failed to play notification sound with any format");
        // Fallback to a browser-generated beep if available
        if (typeof window !== 'undefined' && 'AudioContext' in window) {
          try {
            console.log("Attempting to generate fallback beep using AudioContext");
            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
            console.log("Fallback beep generated successfully");
          } catch (beepError) {
            console.error("Failed to generate beep:", beepError);
          }
        }
      }
    };
    
    // Start trying sources
    tryNextSource();
  } catch (error) {
    console.error("Error in playNotificationSound function:", error);
  }
}

// For testing purposes - manually trigger a test notification
export function testNotification() {
  const testNotif = {
    id: 'test-' + Date.now(),
    title: 'Test Notification',
    start: new Date(Date.now() + 5 * 60000),
    location: 'Test Location',
    entityId: '123'
  };
  
  console.log("Manually triggering test notification");
  showBrowserNotification(testNotif);
  showNotification(testNotif);
  
  return "Test notification triggered";
}