import { writable } from 'svelte/store';
import { supabase } from '../../supabase';

// Store for active notifications
export const activeNotifications = writable([]);

// Check for upcoming events and schedule notifications
export async function initNotificationService(userId) {
    // Run initial check
    await checkUpcomingEvents(userId);
    
    // Set up periodic checking (every minute)
    setInterval(() => checkUpcomingEvents(userId), 60000);
    
    // Set up broadcast channel for cross-tab communication
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('event_notifications');
      
      channel.addEventListener('message', (event) => {
        if (event.data.type === 'NOTIFICATION_TRIGGERED') {
          showNotification(event.data.notification);
        }
      });
    }
    
    // ADD THIS BLOCK HERE - Handle visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // Re-check for notifications when tab becomes visible
          checkUpcomingEvents(userId);
        }
      });
    }
  }

// Check for events coming up in the next 5 minutes
async function checkUpcomingEvents(userId) {
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
    
    // Query for events starting in the 5-6 minute window
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('event_start', fiveMinutesFromNowStr)
      .lt('event_start', sixMinutesFromNowStr);
      
    if (error) throw error;
    
    // Process each upcoming event
    for (const event of data) {
      // Check if we've already notified for this event
      const alreadyNotified = localStorage.getItem(`notified_${event.id}`);
      
      if (!alreadyNotified) {
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
      }
    }
  } catch (error) {
    console.error('Error checking upcoming events:', error);
  }
}

// Trigger notification across all tabs
function triggerNotification(notification) {
  // Update store
  activeNotifications.update(notifications => [...notifications, notification]);
  
  // Broadcast to other tabs
  if (typeof BroadcastChannel !== 'undefined') {
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
  // Play notification sound
  playNotificationSound();
  
  // Add to active notifications if not already there
  activeNotifications.update(notifications => {
    if (!notifications.find(n => n.id === notification.id)) {
      return [...notifications, notification];
    }
    return notifications;
  });
  
  // Request permission and show browser notification as fallback
  if (Notification.permission === 'granted') {
    new Notification(`Event Starting Soon: ${notification.title}`, {
      body: `Starting in 5 minutes at ${notification.start.toLocaleTimeString()}`,
      icon: '/favicon.png'
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

// Dismiss a notification
export function dismissNotification(notificationId) {
  activeNotifications.update(notifications => 
    notifications.filter(n => n.id !== notificationId)
  );
}

// Play notification sound
function playNotificationSound() {
  const audio = new Audio('/notification-sound.mp3');
  audio.play().catch(error => {
    console.error('Error playing notification sound:', error);
  });
}