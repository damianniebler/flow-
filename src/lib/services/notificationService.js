import { writable } from 'svelte/store';
import { supabase } from '../../supabase';

// Store for active notifications
export const activeNotifications = writable([]);

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
  
  // Set up periodic checking (every minute)
  const intervalId = setInterval(() => checkUpcomingEvents(userId), 60000);
  console.log(`Set up periodic event checking with interval ID: ${intervalId}`);
  
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
      if (isVisible) {
        // Re-check for notifications when tab becomes visible
        checkUpcomingEvents(userId);
      }
    });
    console.log("Document visibility change listener added");
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
  
  // Update store
  activeNotifications.update(notifications => [...notifications, notification]);
  
  // Broadcast to other tabs
  if (typeof BroadcastChannel !== 'undefined') {
    console.log("Broadcasting notification to other tabs");
    const channel = new BroadcastChannel('event_notifications');
    channel.postMessage({
      type: 'NOTIFICATION_TRIGGERED',
      notification
    });
  }
  
  // Show notification in this tab
  showNotification(notification);
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
  playNotificationSound();
  
  // Show browser notification if tab is not visible
  if (typeof document !== 'undefined') {
    const isVisible = document.visibilityState === 'visible';
    console.log(`Current document visibility: ${document.visibilityState}`);
    
    if (!isVisible) {
      console.log("Tab not visible, showing browser notification");
      showBrowserNotification(notification);
    } else {
      console.log("Tab is visible, not showing browser notification");
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