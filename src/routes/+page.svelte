<script>
  import { getCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { supabase } from '../supabase';

  let firstName = '';
  let importantTasks = [];

  onMount(async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      const { data } = await supabase
        .from('users')
        .select('first_name')
        .eq('id', currentUser.id)
        .single();
      firstName = data.first_name;
      
      // Fetch important tasks
      const { data: tasksData, error } = await supabase
        .from('items')
        .select('*, entities(name, id)')
        .eq('important', true)
        .eq('completed', false)
        .order('last_updated', { ascending: false });
        
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
</script>

<h1>Welcome {firstName}!</h1>
<p>
  We're ready to help you stay on top of your day.
</p>

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
  </div>
{/if}