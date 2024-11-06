<script>
  import { onMount } from 'svelte';
  import Header from './Header.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { getCurrentUser, user } from '$lib/auth';
  import { sidebarVisible } from '$lib/stores/sidebarStore';
  import '../app.css';

  onMount(() => {
    getCurrentUser();
  });

  $: if ($user) {
    document.dispatchEvent(new Event('UserLoggedIn'));
  }
</script>

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
