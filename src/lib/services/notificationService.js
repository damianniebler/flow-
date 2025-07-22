import { writable } from 'svelte/store';
import { supabase } from '../../supabase';

export const activeNotifications = writable([]);

function isTauri() {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

export async function initNotificationService(userId) {
  console.log(`Initializing notification service for user: ${userId}`);
  setInterval(() => checkUpcomingEvents(userId), 10000);
  console.log("Checking upcoming events every 10 seconds (Tauri mode)");
}

async function checkUpcomingEvents(userId) {
  console.log(`Checking upcoming events for user: ${userId}`);
  try {
    const now = new Date();
    const nowMinusOneMin = new Date(now.getTime() - 60000);
    const nowPlusOneMin = new Date(now.getTime() + 60000);
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('event_start', nowMinusOneMin.toISOString())
      .lt('event_start', nowPlusOneMin.toISOString());

    if (error) throw error;

    console.log(`Found ${data.length} events within ±1 min`);

    for (const event of data) {
      const alreadyNotified = localStorage.getItem(`notified_${event.id}`);
      if (!alreadyNotified) {
        console.log(`Preparing notification for event: ${event.event_title} (ID: ${event.id})`);
        const notification = {
          id: event.id,
          title: event.event_title,
          start: new Date(event.event_start),
          location: event.event_location,
          entityId: event.entity_id
        };
        await notifyEvent(notification);
        localStorage.setItem(`notified_${event.id}`, 'true');
        console.log(`Event ${event.id} marked as notified in localStorage`);
      }
    }
  } catch (error) {
    console.error('Error checking upcoming events:', error);
  }
}

async function notifyEvent(notification) {
  await focusWindowAndPlaySound();
  if (isTauri()) {
    const { sendNotification } = await import(/* @vite-ignore */ '@tauri-apps/api/notification');
    sendNotification({
      title: `Event: ${notification.title}`,
      body: `Starts at ${notification.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    });
  }
}

async function focusWindowAndPlaySound() {
  if (isTauri()) {
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.show();
      await appWindow.setFocus();
      await appWindow.requestUserAttention('critical');
      playNotificationSound();
    } catch (err) {
      console.error('Tauri: Could not focus window:', err);
      playNotificationSound();
    }
  } else {
    playNotificationSound();
  }
}


function playNotificationSound() {
  console.log("Attempting to play notification sound");
  try {
    const audio = new Audio();
    const sources = [
      '/notification-sound.mp3',
      '/notification-sound.ogg',
      '/notification-sound.wav'
    ];
    let sourceIndex = 0;
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
    tryNextSource();
  } catch (error) {
    console.error("Error in playNotificationSound function:", error);
  }
}

export function dismissNotification(notificationId) {
  console.log(`Dismissing notification with ID: ${notificationId}`);
  activeNotifications.update(notifications =>
    notifications.filter(n => n.id !== notificationId)
  );
}

export async function testNotification() {
  const { appWindow } = await import('@tauri-apps/api/window');
  await appWindow.requestUserAttention('critical');
  console.log('Requested taskbar flash');

  const testNotif = {
    id: 'test-' + Date.now(),
    title: 'Test Notification',
    start: new Date(Date.now() + 5 * 60000),
    location: 'Test Location',
    entityId: '123'
  };
  console.log("Manually triggering test notification");
  notifyEvent(testNotif);
  activeNotifications.update(notifications => [...notifications, testNotif]);
  return "Test notification triggered";
}