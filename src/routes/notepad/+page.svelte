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
  let touchStartY = 0;
  let touchStartX = 0;
  let selectionChangeTimeout;
  let mirrorDiv;

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

  function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

  function handleInteractionStart(event) {
    if (event.type === 'touchstart') {
      const touch = event.touches[0];
      touchStartY = touch.clientY;
      touchStartX = touch.clientX;
    }
    if (event.target === textareaElement) {
      isSelecting = true;
    }
  }

  function handleInteractionEnd(event) {
    const createItemButton = event.target?.closest?.('.create-item-option');
    if (!createItemButton) {
      showCreateItemOption = false;
    }

    if (isSelecting && textareaElement) {
      if (event.type === 'touchend') {
        const touch = event.changedTouches[0];
        // Use requestAnimationFrame to wait for selection to be ready
        requestAnimationFrame(() => {
          handleSelection({
            clientX: touch.clientX,
            clientY: touch.clientY,
            type: 'mouseup'
          });
        });
      } else {
        handleSelection(event);
      }
    }

    isSelecting = false;
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
      document.addEventListener('mouseup', handleInteractionEnd);
      document.addEventListener('touchend', handleInteractionEnd);
      document.addEventListener('selectionchange', handleSelectionChange);
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('mouseup', handleInteractionEnd);
      document.removeEventListener('touchend', handleInteractionEnd);
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (selectionChangeTimeout) {
        clearTimeout(selectionChangeTimeout);
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


  function getSelectionCoordinates() {
    if (!mirrorDiv) return null;

    // Copy textarea styles to mirror
    const textareaStyle = window.getComputedStyle(textareaElement);
    mirrorDiv.style.width = textareaStyle.width;
    mirrorDiv.style.font = textareaStyle.font;
    mirrorDiv.style.padding = textareaStyle.padding;
    mirrorDiv.style.lineHeight = textareaStyle.lineHeight;

    // Create content up to selection
    const textBeforeSelection = noteContent.substring(0, textareaElement.selectionStart);
    const selectedText = noteContent.substring(textareaElement.selectionStart, textareaElement.selectionEnd);
    
    // Set mirror content
    mirrorDiv.textContent = textBeforeSelection;
    const span = document.createElement('span');
    span.textContent = selectedText;
    mirrorDiv.appendChild(span);

    // Get position
    const spanRect = span.getBoundingClientRect();
    return {
      top: spanRect.bottom,
      left: spanRect.left + (spanRect.width / 2)
    };
  }

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

  function handleSelectionChange() {
  if (selectionChangeTimeout) {
    clearTimeout(selectionChangeTimeout);
  }

  selectionChangeTimeout = setTimeout(() => {
    if (textareaElement && document.activeElement === textareaElement) {
      selectedText = noteContent.slice(
        textareaElement.selectionStart, 
        textareaElement.selectionEnd
      ).trim();

      if (selectedText) {
        if (isMobileDevice()) {
          showCreateItemOption = true;
          buttonPosition = {
            top: 80,
            left: 50,
          };
        } else {
          if (!isSelecting) {
            const coords = getSelectionCoordinates();
            if (coords) {
              showCreateItemOption = true;
              buttonPosition = {
                top: coords.top + window.scrollY + 20,
                left: coords.left
              };
            }
          }
        }
      }
    }
  }, 50);
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

<div 
  bind:this={mirrorDiv} 
  style="position: absolute; visibility: hidden; white-space: pre-wrap; word-wrap: break-word;"
></div>

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
    on:mousedown={handleInteractionStart}
    on:touchstart={handleInteractionStart}
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