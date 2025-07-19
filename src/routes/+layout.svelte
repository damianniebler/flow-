<script>
  import { onMount } from 'svelte';
  import Header from './Header.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import LoadingScreen from '$lib/components/LoadingScreen.svelte';
  import { getCurrentUser, user } from '$lib/auth';
  import { sidebarVisible, darkMode, overlayShown } from '$lib/stores/sidebarStore';
  import '../app.css';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { ensureInitialized } from '$lib/auth';
  import { initNotificationService, testNotification } from '$lib/services/notificationService';
  import EventNotification from '$lib/components/EventNotification.svelte';



  let isLoading = false;
  let hasShownOverlayLocally = false;

  onMount(async () => {
    // Handle MSAL redirects globally
    if (browser) {
      try {
        const msalInstance = await ensureInitialized();
        if (msalInstance) {
          // This is crucial - it processes the response from Microsoft after login
          const redirectResult = await msalInstance.handleRedirectPromise();
          if (redirectResult) {
            console.log("Global redirect handler: Successfully processed Microsoft authentication redirect");
          }
        }
      } catch (error) {
        console.error("Error handling Microsoft redirect in global handler:", error);
      }
      
      // Initialize notification service when user is available
      if ($user) {
        console.log("Initializing notification service for user:", $user.id);
        initNotificationService($user.id);
        
        // Request notification permission
        if (Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }
    }

    // Rest of your existing onMount code
    getCurrentUser();
    if (window.innerWidth <= 768) {
        sidebarVisible.set(false);
    }

    document.addEventListener('SidebarShowRequest', () => {
      if (window.innerWidth <= 768) {
        sidebarVisible.set(true);
      }
    });

    if (browser) {
      const savedMode = localStorage.getItem('darkMode');
      if (savedMode) {
        darkMode.set(savedMode === 'true');
      }

      darkMode.subscribe(value => {
        localStorage.setItem('darkMode', value.toString());
      });

      if (!$page.url.pathname.includes('reset-password')) {
        const script = document.createElement('script');
        script.src = '/tutorial.js';
        document.body.appendChild(script);
      }
      
      // Check if we've shown the overlay before
      const hasShownOverlay = localStorage.getItem('overlayShown') === 'true';
      
      if (!hasShownOverlay && $page.url.pathname !== '/notepad') {
        isLoading = true;
        hasShownOverlayLocally = true;
        localStorage.setItem('overlayShown', 'true');
        
        setTimeout(() => {
          isLoading = false;
          overlayShown.set(true);
        }, 1500);
      } else {
        // Already shown before
        overlayShown.set(true);
      }
    }
  });
  
  // Instead of the previous reactive statement, use this:
  $: if (browser && !hasShownOverlayLocally && !$overlayShown && $page.url.pathname !== '/notepad') {
    isLoading = true;
    hasShownOverlayLocally = true;
    
    setTimeout(() => {
      isLoading = false;
      overlayShown.set(true);
      localStorage.setItem('overlayShown', 'true');
    }, 1500);
  }

  // Add a reactive statement to initialize notifications when user changes
  $: if (browser && $user) {
    initNotificationService($user.id);
  }

  $: if ($user) {
    document.dispatchEvent(new Event('UserLoggedIn'));
  }

  $: if (browser) {
    $darkMode
      ? document.body.classList.add('dark-mode')
      : document.body.classList.remove('dark-mode');
  }

  $: if (browser && window.innerWidth <= 768 && $page) {
    sidebarVisible.set(false);
  }
</script>

{#if $page.url.pathname !== '/notepad' && isLoading}
  <LoadingScreen bind:isLoading />
{/if}


<!-- Keep your existing EventNotification component -->
<EventNotification />

<div class="app">
  <Header />
  <div class="content">
    {#if $user}
      <Sidebar />
      <button class="test-notification-btn" on:click={() => testNotification()}>Test Notification</button>
    {/if}
    <main>
      <slot />
    </main>
  </div>
  <div id="overlay" class="overlay hidden"></div>
</div>