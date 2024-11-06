<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { supabase } from '../../../supabase';
  import { onMount } from 'svelte';
  import '../../../app.css';

  let entity = null;
  let items = [];
  let newItemName = '';
  let selectedItem = null;
  let showNoteSidebar = false;

  $: folderId = $page.url.searchParams.get('folderId');
  $: entityId = $page.params.id;
  $: incompleteTasks = items.filter(item => !item.completed);
  $: completedTasks = items.filter(item => item.completed);

  onMount(() => {
  loadEntityAndItems();
  if (window.tutorial && window.tutorial.currentStep === 5) {
    window.tutorial.currentStepSet[5].action();
  }
});




  function goBackToFolder() {
    if (folderId) {
      goto(`/folder/${folderId}`);
    }
  }

  async function loadEntityAndItems() {
    const { data: entityData, error: entityError } = await supabase
      .from('entities')
      .select('*')
      .eq('id', entityId)
      .single();

    if (entityError) {
      console.error('Error loading entity:', entityError);
      return;
    }

    entity = entityData;

    const { data: itemsData, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('entity_id', entityId)
      .order('last_updated', { ascending: true });

    if (itemsError) {
      console.error('Error loading items:', itemsError);
      return;
    }

    items = itemsData;
  }

  async function createItem() {
  if (newItemName.trim()) {
    const { data, error } = await supabase
      .from('items')
      .insert({
        entity_id: entityId,
        name: newItemName.trim(),
      })
      .select();

    if (error) {
      console.error('Error creating item:', error);
    } else {
      items = [data[0], ...items];
      newItemName = '';
      if (window.tutorial && window.tutorial.currentStep === 5) {
        window.tutorial.nextStep();
      }
    }
  }
}

  async function renameItem(item) {
  const newName = prompt('Enter new name for the item:', item.name);
  if (newName && newName.trim() !== '' && newName !== item.name) {
    const { error } = await supabase
      .from('items')
      .update({ name: newName.trim(), last_updated: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      console.error('Error renaming item:', error);
    } else {
      items = items.map(i => i.id === item.id ? {...i, name: newName.trim()} : i);
    }
  }
}

  async function toggleItemCompletion(item) {
    const { error } = await supabase
      .from('items')
      .update({ completed: !item.completed, last_updated: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      console.error('Error updating item:', error);
    } else {
      item.completed = !item.completed;
      items = [...items];
    }
  }

  function handleKeydown(event) {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      updateItemNote();
      showNoteSidebar = false;
    }
  }

  function formatRelativeTime(timestamp) {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 48) return `${hours} hours ago`;
    return `${days} days ago`;
  }

  async function updateTimestamp(item) {
    const newTimestamp = new Date().toISOString();
    const { error } = await supabase
      .from('items')
      .update({ last_updated: newTimestamp })
      .eq('id', item.id);

    if (error) {
      console.error('Error updating timestamp:', error);
    } else {
      items = items
        .map(i => i.id === item.id ? {...i, last_updated: newTimestamp} : i)
        .sort((a, b) => new Date(a.last_updated) - new Date(b.last_updated));
    }
  }

  async function deleteItem(item) {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', item.id);

    if (error) {
      console.error('Error deleting item:', error);
    } else {
      items = items.filter(i => i.id !== item.id);
    }
  }
  function handleAddItem() {
  if (window.tutorial && window.tutorial.currentStep === 6) {
    window.tutorial.nextStep();
  }
}



  function openNoteSidebar(item) {
    selectedItem = item;
    showNoteSidebar = true;
  }

  async function updateItemNote() {
  const { error } = await supabase
    .from('items')
    .update({ note: selectedItem.note, last_updated: new Date().toISOString() })
    .eq('id', selectedItem.id);

  if (error) {
    console.error('Error updating item note:', error);
  } else {
    items = [...items];
    showNoteSidebar = false;
    if (window.tutorial && window.tutorial.currentStep === 7) {
      window.tutorial.nextStep();
    }
  }
}


  function truncateNote(note) {
    return note ? (note.length > 90 ? note.slice(0, 90) + '...' : note) : '';
  }
</script>

<div class="entity-page">
  <div class="entity-header">
    <button class="back-button" on:click={goBackToFolder}>← Back</button>
    <h1>{entity ? entity.name : 'Loading...'}</h1>
  </div>

  <form on:submit|preventDefault={createItem}>
    <input type="text" bind:value={newItemName} placeholder="New item name" id="new-item-input" />
    <button type="submit" id="add-item-button" on:click={handleAddItem}>Add Item</button>


  </form>

  <h2>Incomplete Tasks</h2>
  <ul class="item-list">
    {#each incompleteTasks as item (item.id)}
      <li class="item">
        <div class="item-content">
          <button on:click={() => toggleItemCompletion(item)} class="complete-btn">
            <i class="fas fa-check"></i>
          </button>
          
          <span class="item-name">{item.name}</span>
          <span class="last-updated">Last updated: {formatRelativeTime(item.last_updated)}</span>
          <button on:click={() => updateTimestamp(item)} class="update-timestamp-btn">
            <i class="fas fa-sync-alt"></i>
          </button>          
          <button class="btn-icon" on:click={() => renameItem(item)}>✏️</button>
          <button class="btn-icon" on:click={() => deleteItem(item)}>🗑️</button>
          
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="item-note" id="item-note" on:click={() => {
          openNoteSidebar(item);
          if (window.tutorial && window.tutorial.currentStep === 6) {
            window.tutorial.nextStep();
          }
        }}>
          {item.note ? truncateNote(item.note) : 'Click to add a note'}
        </div>
        
      </li>
    {/each}
  </ul>
  
  <h2>Completed Tasks</h2>
  <ul class="item-list">
    {#each completedTasks as item (item.id)}
      <li class="item completed">
        <div class="item-content">
          <button on:click={() => toggleItemCompletion(item)} class="uncomplete-btn">
            <i class="fas fa-check"></i>
          </button>
          
          <span class="item-name">{item.name}</span>
          <span class="last-updated">Last updated: {formatRelativeTime(item.last_updated)}</span>
          <button class="btn-icon" on:click={() => renameItem(item)}>✏️</button>
          <button class="btn-icon" on:click={() => deleteItem(item)}>🗑️</button>
        </div>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="item-note" on:click={() => openNoteSidebar(item)}>
          {item.note ? truncateNote(item.note) : 'Click to add a note'}
        </div>
      </li>
    {/each}
  </ul>  

  {#if showNoteSidebar}
  <div class="note-sidebar">
    <h2>Edit Note</h2>
    <textarea id="note-area" bind:value={selectedItem.note} on:keydown={handleKeydown}></textarea>
    <div class="note-sidebar-buttons">
      <button id="save-note" on:click={updateItemNote}>Save Note</button>
      <button on:click={() => showNoteSidebar = false}>Close</button>
    </div>
  </div>  
  {/if}
</div>