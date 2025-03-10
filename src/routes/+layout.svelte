<script>
  import { onMount } from 'svelte';
  import Header from './Header.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import LoadingScreen from '$lib/components/LoadingScreen.svelte';
  import { getCurrentUser, user } from '$lib/auth';
  import { sidebarVisible, darkMode } from '$lib/stores/sidebarStore';
  import '../app.css';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';

  let isLoading = true;

  onMount(() => {
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
    }
    
    setTimeout(() => {
      isLoading = false;
    }, 1500);
  });

  $: if ($user) {
    document.dispatchEvent(new Event('UserLoggedIn'));
  }

  $: if (browser) {
    $darkMode
      ? document.body.classList.add('dark-mode')
      : document.body.classList.remove('dark-mode');
  }
</script>

<LoadingScreen bind:isLoading />

<div class="app">
  <Header />
  <div class="content">
    {#if $user && $sidebarVisible}
      <Sidebar />
    {/if}
    <main>
      <slot />
    </main>
  </div>
  <div id="overlay" class="overlay hidden"></div>
</div>