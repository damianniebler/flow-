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
  let longPressTimeout = null;

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


  function handleTouchStart(event) {
    longPressTimeout = setTimeout(() => {
      if (textareaElement) {
        const rect = textareaElement.getBoundingClientRect();
          selectionStart = textareaElement.selectionStart;
          selectionEnd = textareaElement.selectionEnd;
          selectedText = noteContent.slice(selectionStart, selectionEnd).trim();
        if (selectedText) {
          showCreateItemOption = true;
          buttonPosition = {
            top: event.touches[0].clientY + window.scrollY + 20,
            left: event.touches[0].clientX,
          };
        }
      }
    }, 500); // Adjust duration as needed
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimeout);
    const createItemButton = document.querySelector('.create-item-option button');
    if (!createItemButton || !createItemButton.contains(event.target)) {
      showCreateItemOption = false;
    }
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
      if ('ontouchstart' in window) {
        // Add touch event listeners for mobile
        textareaElement.addEventListener('touchstart', handleTouchStart);
        textareaElement.addEventListener('touchend', handleTouchEnd);
      }
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('mouseup', handleGlobalMouseup);
      if ('ontouchstart' in window) {
        textareaElement.removeEventListener('touchstart', handleTouchStart);
        textareaElement.removeEventListener('touchend', handleTouchEnd);
      }
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
  <div class="notepad">
    <textarea
      bind:this={textareaElement}
      bind:value={noteContent}
      on:input={saveNote}
      on:mousedown={handleMousedown}
      on:keydown={(e) => handleSelection(e)}
      placeholder="Start typing your notes here..."
      rows="20"
      cols="100"
    ></textarea>
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