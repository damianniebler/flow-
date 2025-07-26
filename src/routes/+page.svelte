<script>
  import { getCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { supabase } from '../supabase';

  let firstName = '';
  let importantTasks = [];
  let isNameLoaded = false; // Add this flag to track when name is loaded

  onMount(async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      const { data } = await supabase
        .from('users')
        .select('first_name')
        .eq('id', currentUser.id)
        .single();
      firstName = data.first_name;
      isNameLoaded = true; // Set flag to true after name is loaded
      
      // Fetch important tasks
      const { data: tasksData, error } = await supabase
        .from('items')
        .select('*, entities(name, id)')
        .eq('important', true)
        .eq('completed', false)
        .order('last_updated', { ascending: true });
        
      if (error) {
        console.error('Error fetching important tasks:', error);
      } else {
        importantTasks = tasksData;
      }
    } else {
      goto('/login');
    }
  });
  
  function navigateToEntity(entityId, itemId) {
    goto(`/entity/${entityId}?itemId=${itemId}`);
  }

    // Trigger a notification or flash the app icon after a delay
  function startNotificationTest() {
    setTimeout(() => {
      try {
        // If running under Electron, attempt to flash the taskbar icon
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { remote } = window.require?.('electron') ?? {};
        if (remote) {
          const currentWindow = remote.getCurrentWindow();
          currentWindow.flashFrame(true);
          currentWindow.focus();
          return;
        }
      } catch {
        /* ignore */
      }

      // Fallback to the browser Notification API
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Flow', { body: 'Time to check the app!' });
          window.focus();
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification('Flow', { body: 'Time to check the app!' });
              window.focus();
            }
          });
        }
      }
    }, 10000);
  }
</script>

<!-- Only show welcome message when name is loaded -->
{#if isNameLoaded}
  <h1>Welcome {firstName}!</h1>
  <p>
    We're ready to help you stay on top of your day.
  </p>
{/if}

{#if importantTasks.length > 0}
  <div class="important-tasks-section">
    <h2>Don't forget about these...</h2>
    <ul class="important-tasks-list">
      {#each importantTasks as task}
        <li class="important-task-item">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="task-card" on:click={() => navigateToEntity(task.entity_id, task.id)}>
            <div class="task-header">
              <span class="task-name">{task.name}</span>
              <span class="important-star">★</span>
            </div>
            <div class="task-entity">
              From: {task.entities.name}
            </div>
            {#if task.note}
              <div class="task-note">{task.note.substring(0, 60)}{task.note.length > 60 ? '...' : ''}</div>
            {/if}
          </div>
        </li>
      {/each}
      </ul>
      <button class="notify-test-button" on:click={startNotificationTest}>
        Test notification
      </button>
    </div>
  {/if}