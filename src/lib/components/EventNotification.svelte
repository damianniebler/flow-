<script>
    import { onMount, onDestroy } from 'svelte';
    import { activeNotifications, dismissNotification } from '$lib/services/notificationService';
    import { fade, fly } from 'svelte/transition';
    
    let visible = false;
    
    // Subscribe to active notifications
    const unsubscribe = activeNotifications.subscribe(notifications => {
      visible = notifications.length > 0;
    });
    
    // Clean up subscription
    onDestroy(() => {
      unsubscribe();
    });
    
    // Format time
    function formatTime(date) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Handle dismiss
    function handleDismiss(id) {
      dismissNotification(id);
    }
  </script>
  
  {#if visible}
    <div class="notification-overlay" transition:fade={{ duration: 300 }}>
      <div class="notification-container" transition:fly={{ y: 20, duration: 300 }}>
        <h2>Upcoming Events</h2>
        
        {#each $activeNotifications as notification (notification.id)}
          <div class="notification-card">
            <div class="notification-header">
              <h3>{notification.title}</h3>
              <button class="dismiss-btn" on:click={() => handleDismiss(notification.id)}>×</button>
            </div>
            
            <div class="notification-details">
              <p class="time">Starting at {formatTime(notification.start)} (in 5 minutes)</p>
              {#if notification.location}
                <p class="location">Location: {notification.location}</p>
              {/if}
            </div>
            
            <div class="notification-actions">
              <a href="/entity/{notification.entityId}" class="view-btn">View Details</a>
              <button class="dismiss-btn-text" on:click={() => handleDismiss(notification.id)}>
                Dismiss
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
  
  <style>
    .notification-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    .notification-container {
      background-color: white;
      border-radius: 8px;
      padding: 20px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    
    h2 {
      margin-top: 0;
      color: #333;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    
    .notification-card {
      background-color: #f9f9f9;
      border-left: 4px solid #4CAF50;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 4px;
    }
    
    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .notification-header h3 {
      margin: 0;
      color: #333;
    }
    
    .dismiss-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
    }
    
    .dismiss-btn:hover {
      color: #333;
    }
    
    .notification-details {
      margin: 10px 0;
    }
    
    .time {
      font-weight: bold;
      color: #e53935;
      margin: 5px 0;
    }
    
    .location {
      color: #666;
      margin: 5px 0;
    }
    
    .notification-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
    }
    
    .view-btn {
      background-color: #4CAF50;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: bold;
    }
    
    .dismiss-btn-text {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      text-decoration: underline;
    }
  </style>  