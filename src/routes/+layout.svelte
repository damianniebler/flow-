<script>
  import { onMount } from 'svelte';
  import Header from './Header.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { getCurrentUser } from '$lib/auth';
  import { sidebarVisible } from '$lib/stores/sidebarStore';
  import '../app.css';

  onMount(getCurrentUser);
</script>

<div class="app">
  <Header />
  <div class="content">
    {#if $sidebarVisible}
      <Sidebar />
    {/if}
    <main>
      <slot />
    </main>
  </div>
</div>