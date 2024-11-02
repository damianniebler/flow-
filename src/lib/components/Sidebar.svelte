<script>
  import { supabase } from '../../supabase';
  import { onMount } from 'svelte';
  import { user } from '$lib/auth';
  import { writable } from 'svelte/store';
  import { browser } from '$app/environment';
  import { sidebarVisible, newFolderId } from '$lib/stores/sidebarStore'; // Import newFolderId
  import '../../app.css';
  import { tick } from 'svelte';

  let folders = [];
  let newFolderName = '';
  const darkMode = writable(false);

  $: if ($user) {
    loadFolders();
  }

  function toggleSidebar() {
    sidebarVisible.update(v => !v);
  }
  
  function toggleDarkMode() {
    darkMode.update(value => !value);
  }

  $: if (browser) {
    $darkMode
      ? document.body.classList.add('dark-mode')
      : document.body.classList.remove('dark-mode');
  }

  onMount(() => {
    if (browser) {
      const savedMode = localStorage.getItem('darkMode');
      if (savedMode) {
        darkMode.set(savedMode === 'true');
      }

      darkMode.subscribe(value => {
        localStorage.setItem('darkMode', value.toString());
      });
    }
  });

  async function loadFolders() {
    if ($user) {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', $user.id)
        .order('created_at');
     
      if (error) {
        console.error('Error loading folders:', error);
      } else {
        folders = data;
      }
    } else {
      folders = [];
    }
  }

  function updateNewFolderName(value) {
    newFolderName = value;
  }

  async function createFolder() {
  console.log('createFolder function called');
  if (newFolderName.trim() && $user) {
    console.log('Attempting to create folder:', newFolderName);
    const { data, error } = await supabase
      .from('folders')
      .insert({
        name: newFolderName.trim(),
        user_id: $user.id
      })
      .select();

      if (error) {
    console.error('Error creating folder:', error);
  } else {
    console.log('Folder created successfully:', data[0]);
    folders = [...folders, data[0]];
    newFolderName = '';

    // Update the newFolderId store
    newFolderId.set(data[0].id);
    await tick(); 
    // IMPORTANT: Wait for the next microtask to ensure the DOM updates
    Promise.resolve().then(() => {
      newFolderId.set(null);
      // Now signal that the DOM is updated
      newFolderId.set(data[0].id);
    });
    }
  }
}



$: if ($newFolderId) {
  console.log('New folder ID detected in Sidebar.svelte:', $newFolderId);
  if (window.tutorial && typeof window.tutorial.folderCreated === 'function') {
    window.tutorial.folderCreated($newFolderId);
  } else {
    console.warn('window.tutorial or folderCreated method not available');
  }
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
      }
    }
  }
</script>

<aside class:hidden={!$sidebarVisible}>
  <h2 id="test">Folders</h2>
  {#if $user}
    <ul>
      {#each folders as folder}
        <li>
          <a href="/folder/{folder.id}">{folder.name}</a>
          <button on:click={() => renameFolder(folder)}>Rename</button>
          <button on:click={() => deleteFolder(folder)}>Delete</button>
        </li>
      {/each}
    </ul>
    <form on:submit|preventDefault={createFolder}>
      <input
      id="new-folder-input"
      type="text"
      bind:value={newFolderName}
      placeholder="New folder name"
    />
    <button id="create-folder-button" type="submit">Create Folder</button>
    
    </form>
    <div class="dark-mode-toggle">
      <label>
        Dark Mode
        <input type="checkbox" checked={$darkMode} on:change={toggleDarkMode}>
      </label>
    </div>
  {:else}
    <p>Please log in to view your folders.</p>
  {/if}
</aside>
<button class="toggle-sidebar" on:click={toggleSidebar}>
  {$sidebarVisible ? '◀' : '▶'}
</button>