<script>
  import { supabase } from '../../supabase';
  import { onMount } from 'svelte';
  import { user } from '$lib/auth';
  import { writable } from 'svelte/store';
  import { browser } from '$app/environment';
  import { sidebarVisible, newFolderId } from '$lib/stores/sidebarStore';
  import '../../app.css';
  import { tick } from 'svelte';
  import { darkMode } from '$lib/stores/sidebarStore';

  let isLoading = true;
  let folders = [];
  let newFolderName = '';
  let draggedFolder = null;
  let dragOverIndex = -1;

  $: if ($user) {
    loadFolders();
  }
  
  function toggleDarkMode() {
    darkMode.update(value => !value);
  }

  async function loadFolders() {
  isLoading = true;
  try {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', $user.id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading folders:', error);
      return;
    }

    console.log('Loaded folders with order:', data);
    folders = data;
  } catch (error) {
    console.error('Error loading folder data:', error);
  } finally {
    isLoading = false;
  }
}


  function updateNewFolderName(value) {
    newFolderName = value;
  }

  async function createFolder() {
    if (newFolderName.trim() && $user) {
      // Get max display_order and add 1
      const maxOrder = folders.length > 0 
        ? Math.max(...folders.map(f => f.display_order || 0)) 
        : 0;
      
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: newFolderName.trim(),
          user_id: $user.id,
          display_order: maxOrder + 1
        })
        .select();

      if (error) {
        console.error('Error creating folder:', error);
      } else {
        folders = [...folders, data[0]];
        newFolderName = '';

        // Only trigger tutorial actions if tutorial is active
        if (window.tutorial && window.tutorial.currentStep !== undefined) {
          newFolderId.set(data[0].id);
          await tick();
          Promise.resolve().then(() => {
            newFolderId.set(null);
            newFolderId.set(data[0].id);
          });
        }
      }
    }
  }

  $: if ($newFolderId) {
    console.log('New folder ID detected in Sidebar.svelte:', $newFolderId);
    if (window.tutorial && window.tutorial.currentStep !== undefined && typeof window.tutorial.folderCreated === 'function') {
      window.tutorial.folderCreated($newFolderId);
    }
    // MOVE this line AFTER the tutorial function call
    newFolderId.set(null); 
  }

  async function renameFolder(folder) {
    const newName = prompt('Enter a new name for the folder:', folder.name);
    if (newName && newName.trim() !== folder.name) {
      const { error } = await supabase
        .from('folders')
        .update({ name: newName.trim() })
        .eq('id', folder.id)
        .eq('user_id', $user.id);

      if (error) {
        console.error('Error renaming folder:', error);
      } else {
        await loadFolders();
      }
    }
  }

  async function deleteFolder(folder) {
    if (confirm(`Are you sure you want to delete the folder "${folder.name}"?`)) {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folder.id)
        .eq('user_id', $user.id);

      if (error) {
        console.error('Error deleting folder:', error);
      } else {
        folders = folders.filter(f => f.id !== folder.id);
        // Update display_order for remaining folders
        await reorderFolders();
      }
    }
  }

  // Drag and drop handlers
  function handleDragStart(event, folder, index) {
    draggedFolder = folder;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', folder.id);
    
    // Add styling to the dragged element
    setTimeout(() => {
      event.target.classList.add('dragging');
    }, 0);
  }

  function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    dragOverIndex = -1;
  }

  function handleDragOver(event, index) {
    event.preventDefault();
    dragOverIndex = index;
    return false;
  }

  function handleDragLeave() {
    // We don't reset dragOverIndex here to maintain the visualization
  }

  async function handleDrop(event, targetFolder, targetIndex) {
    event.preventDefault();
    
    if (!draggedFolder || draggedFolder.id === targetFolder.id) {
      return;
    }
    
    const sourceIndex = folders.findIndex(f => f.id === draggedFolder.id);
    
    // Update local state first for immediate feedback
    const updatedFolders = [...folders];
    const [removed] = updatedFolders.splice(sourceIndex, 1);
    updatedFolders.splice(targetIndex, 0, removed);
    
    // Update display_order for all folders
    updatedFolders.forEach((folder, idx) => {
      folder.display_order = idx + 1;
    });
    
    folders = updatedFolders;
    dragOverIndex = -1;
    
    // Update database
    await updateFolderOrder(draggedFolder.id, targetIndex);
  }

  async function updateFolderOrder(folderId, newIndex) {
    try {
      // We'll update all folder orders at once
      await reorderFolders();
    } catch (error) {
      console.error('Error updating folder order:', error);
      // If there's an error, reload folders from database
      await loadFolders();
    }
  }

  async function reorderFolders() {
  // Update each folder individually to ensure they all get updated
  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    const { error } = await supabase
      .from('folders')
      .update({ display_order: i + 1 })
      .eq('id', folder.id);
      
    if (error) {
      console.error(`Error updating folder ${folder.id}:`, error);
      return false;
    }
  }
  return true;
}


</script>

<aside class:hidden={!$sidebarVisible}>
  {#if isLoading && (!browser || !window.tutorial || !window.tutorial.currentStep)}
    <div class="skeleton">
      <div class="skeleton-header"></div>
      <div class="skeleton-section">
        <div class="skeleton-entity"></div>
        <div class="skeleton-entity"></div>
        <div class="skeleton-entity"></div>
      </div>
      <div class="skeleton-section">
        <div class="skeleton-entity"></div>
        <div class="skeleton-entity"></div>
      </div>
    </div>
  {:else}
    <h2 id="test">Folders</h2>
    {#if $user}
      <ul class="folder-list">
        {#each folders as folder, index (folder.id)}
          <li 
            class:drag-over={dragOverIndex === index}
            draggable="true"
            on:dragstart={(e) => handleDragStart(e, folder, index)}
            on:dragend={handleDragEnd}
            on:dragover={(e) => handleDragOver(e, index)}
            on:dragleave={handleDragLeave}
            on:drop={(e) => handleDrop(e, folder, index)}
          >
            <div class="folder-item">
              <span class="drag-handle">⋮⋮</span>
              <a 
                href="/folder/{folder.id}" 
                on:click={() => {
                  if (window.innerWidth <= 768) {
                    sidebarVisible.set(false);
                  }
                }}
              >
                {folder.name}
              </a>
              <div class="folder-actions">
                <button class="btn-icon" on:click={() => renameFolder(folder)}>✏️</button>
                <button class="btn-icon" on:click={() => deleteFolder(folder)}>🗑️</button>
              </div>
            </div>
          </li>
        {/each}
      </ul>

      <form class="side-form" on:submit|preventDefault={createFolder}>
        <input
          id="new-folder-input"
          type="text"
          bind:value={newFolderName}
          placeholder="New folder name"
        />
        <button id="create-folder-button" class="button" type="submit">Create Folder</button>
      </form>

      <div class="dark-mode-toggle">
        <button class="toggle-switch" on:click={toggleDarkMode} aria-label="Toggle dark mode">
          <div class="toggle-slider" class:active={$darkMode}>
            <span class="toggle-icon">{$darkMode ? '🌙' : '☀️'}</span>
          </div>
        </button>
      </div>
    {:else}
      <p>Please log in to view your folders.</p>
    {/if}
  {/if}
</aside>