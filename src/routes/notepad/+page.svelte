<script>
  import { supabase } from '../../supabase';
  import { user } from '$lib/auth';
  import { onMount, onDestroy } from 'svelte';
  import CreateItemPopup from '$lib/components/CreateItemPopup.svelte';
  import pkg from 'lodash';
  import '../../app.css';
  import { browser } from '$app/environment';
  import { get } from 'svelte/store';

  const { debounce } = pkg;
  let noteContent = '';
  let selectedText = '';
  let showPopup = false;
  let entities = [];
  let showCreateItemOption = false;
  let selectionStart = 0;
  let selectionEnd = 0;
  let buttonPosition = { top: 0, left: 0 };
  let textareaElement = null;
  let isSelecting = false;

  let isLoading = true;

  $: if ($user) {
    loadData();
  }

  async function loadData() {
    isLoading = true;
    const [userData, entitiesData] = await Promise.all([
      supabase
        .from('users')
        .select('notes')
        .eq('id', $user.id)
        .single(),
      supabase.from('entities').select('id, name'),
    ]);

    if (userData.data) {
      noteContent = userData.data.notes || '';
    }

    if (entitiesData.data) {
      entities = entitiesData.data;
    }
    isLoading = false;
  }

  function handleMousedown(event) {
    if (event.target === textareaElement) {
      isSelecting = true;
    }
  }

  function handleGlobalMouseup(event) {
    const createItemButton = event.target.closest('.create-item-option');
    if (!createItemButton) {
      showCreateItemOption = false;
    }

    if (
      isSelecting &&
      textareaElement &&
      textareaElement.selectionStart !== textareaElement.selectionEnd
    ) {
      handleSelection(event);
    }

    isSelecting = false;
  }

  onMount(() => {
    if (browser) {
      document.addEventListener('mouseup', handleGlobalMouseup);
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('mouseup', handleGlobalMouseup);
    }
  });

  const saveNote = debounce(async () => {
    if ($user) {
      const { error } = await supabase
        .from('users')
        .update({ notes: noteContent })
        .eq('id', $user.id);

      if (error) {
        console.error('Error saving note:', error);
      }
    }
  }, 1000);

  function handleSelection(event) {
    if (textareaElement) {
      selectionStart = textareaElement.selectionStart;
      selectionEnd = textareaElement.selectionEnd;
      selectedText = noteContent.slice(selectionStart, selectionEnd).trim();

      if (selectedText) {
        if (event.type === 'mouseup') {
          showCreateItemOption = true;
          buttonPosition = {
            top: event.clientY + window.scrollY + 20,
            left: event.clientX,
          };
        } else if (
          event.type === 'keydown' &&
          event.altKey &&
          event.key.toLowerCase() === 'c'
        ) {
          event.preventDefault();
          showPopup = true;
          showCreateItemOption = false;
        }
      } else {
        showCreateItemOption = false;
      }
    }
  }

  function handleContextMenu(event) {
  if (selectedText) {
    event.preventDefault();
    showCreateItemOption = true;
    buttonPosition = {
      top: event.clientY + window.scrollY,
      left: event.clientX
    };
  }
}

function handleTouchStart(event) {
  if (event.target === textareaElement) {
    isSelecting = true;
  }
}

function handleTouchEnd(event) {
  if (isSelecting) {
    handleSelection(event);
    window.getSelection().removeAllRanges();
    textareaElement.blur();
    isSelecting = false;
  }
}


  function handleCreateItemClick() {
    showPopup = true;
    showCreateItemOption = false;
  }

  async function handleCreateItem(event) {
    const { entityId, text, note } = event.detail;
    const { error } = await supabase
      .from('items')
      .insert({ entity_id: entityId, name: text, note: note });

    if (error) {
      console.error('Error creating item:', error);
    } else {
      showPopup = false;
    }
  }
</script>

{#if isLoading}
  <div class="folder-view skeleton">
    <div class="skeleton-header"></div>
    <div class="skeleton-sections">
      <div class="skeleton-section">
        <div class="skeleton-section-header"></div>
      </div>
    </div>
  </div>
{:else}
that works with the current selection:
<div class="notepad">
  <div class="toolbar">
    <button on:click={handleCreateItemClick} disabled={!selectedText}>
      Create Item
    </button>
  </div>
    <textarea
    bind:this={textareaElement}
    bind:value={noteContent}
    on:input={saveNote}
    on:mousedown={handleMousedown}
    on:touchstart={handleTouchStart}
    on:touchend={handleTouchEnd}
    on:keydown={(e) => handleSelection(e)}
    placeholder="Start typing your notes here..."
    rows="20"
    cols="100"
  ></textarea>  
  {#if selectedText}
  <button class="fab" on:click={handleCreateItemClick}>
    + Create Item
  </button>
{/if}
    {#if showCreateItemOption}
      <div
        class="create-item-option"
        style="top: {buttonPosition.top}px; left: {buttonPosition.left}px;"
      >
        <button on:click={handleCreateItemClick}>Create Item</button>
      </div>
    {/if}
  </div>
{/if}

{#if showPopup}
  <CreateItemPopup
    text={selectedText}
    {entities}
    on:createItem={handleCreateItem}
    on:close={() => (showPopup = false)}
  />
{/if}