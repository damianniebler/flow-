// Simple service worker for handling notifications in the background

// Install event - triggered when the service worker is first installed
self.addEventListener('install', function() {
    console.log('Notification Service Worker installing...');
    // Force the service worker to become active right away
    self.skipWaiting();
  });
  
  // Activate event - triggered when the service worker is activated
  self.addEventListener('activate', function() {
    console.log('Notification Service Worker activating...');
    // Take control of all clients as soon as it's activated
    return self.clients.claim();
  });
  
  // Listen for push events (for future server-side push notifications)
  self.addEventListener('push', function(event) {
    console.log('Push notification received:', event.data?.text());
    
    if (event.data) {
      // Parse the data from the push event
      const data = event.data.json();
      
      // Show a notification
      const promiseChain = self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/favicon.png',
        tag: data.tag,
        data: data.data,
        requireInteraction: true
      });
      
      event.waitUntil(promiseChain);
    }
  });
  
  // Handle notification clicks
  self.addEventListener('notificationclick', function(event) {
    console.log('Notification clicked:', event.notification.tag);
    
    // Close the notification
    event.notification.close();
    
    // Get notification data
    const notificationData = event.notification.data;
    
    // This will focus on an existing window or open a new one if needed
    event.waitUntil(
      self.clients.matchAll({type: 'window'}).then(clientList => {
        // Check if there's already a window/tab open
        for (const client of clientList) {
          if (client.url.includes('/entity/') && client.focus) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (notificationData && notificationData.entityId) {
          return self.clients.openWindow(`/entity/${notificationData.entityId}`);
        } else {
          return self.clients.openWindow('/');
        }
      })
    );
  });
  
  // Handle messages from the main application
  self.addEventListener('message', function(event) {
    console.log('Message received in service worker:', event.data);
    
    if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
      const notification = event.data.notification;
      
      // Schedule a notification to be shown at the specified time
      const showAt = new Date(notification.start).getTime() - (5 * 60 * 1000); // 5 minutes before
      const now = Date.now();
      const delay = Math.max(0, showAt - now);
      
      console.log(`Scheduling notification for ${notification.title} in ${delay}ms`);
      
      setTimeout(() => {
        self.registration.showNotification(`Event Starting Soon: ${notification.title}`, {
          body: `Starting in 5 minutes at ${new Date(notification.start).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}`,
          icon: '/favicon.png',
          tag: `event-${notification.id}`,
          requireInteraction: true,
          data: {
            entityId: notification.entityId
          }
        });
      }, delay);
    }
  });
  
  // Fetch event - needed for the service worker to be a proper PWA
  self.addEventListener('fetch', function() {
    // We don't need to do anything special with fetch events for this use case
    // but the listener is required for some browsers
  });
  
  console.log('Notification Service Worker loaded');  