<script>
  import { supabase } from '../../supabase';
  import { onMount } from 'svelte';
  import { user } from '$lib/auth';
  import { writable } from 'svelte/store';
  import { browser } from '$app/environment';
  import { sidebarVisible, newFolderId } from '$lib/stores/sidebarStore'; // Import newFolderId
  import '../../app.css';
  import { tick } from 'svelte';

  let isLoading = true;
  let folders = [];
  let newFolderName = '';
  const darkMode = writable(false);

  $: if ($user) {
    loadFolders();
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
  isLoading = true;
  try {
    const [responses] = await Promise.all([
      Promise.all([
        supabase
          .from('folders')
          .select('*')
          .eq('user_id', $user.id)
          .order('created_at')
      ]),
      new Promise(resolve => setTimeout(resolve, 500))
    ]);

    const [foldersData] = responses;

    if (foldersData.error) {
      console.error('Error loading folders:', foldersData.error);
      return;
    }

    folders = foldersData.data;
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
      }
    }
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
      <ul>
        {#each folders as folder}
          <li>
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
            <button class="btn-icon" on:click={() => renameFolder(folder)}>✏️</button>
            <button class="btn-icon" on:click={() => deleteFolder(folder)}>🗑️</button>
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
