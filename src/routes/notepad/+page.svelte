<script>
  import { supabase } from '../../supabase';
  import { user } from '$lib/auth';
  import { onMount } from 'svelte';
  import CreateItemPopup from '$lib/components/CreateItemPopup.svelte';
  import { debounce } from 'lodash';
  import '../../app.css';

  let noteContent = '';
  let selectedText = '';
  let showPopup = false;
  let entities = [];
  let showCreateItemOption = false;
  let selectionStart = 0;
  let selectionEnd = 0;
  let buttonPosition = { top: 0, left: 0 };
  let textareaElement = null;

  let isLoading = true;

onMount(async () => {
  if ($user) {
    const [responses] = await Promise.all([
      Promise.all([
        supabase
          .from('users')
          .select('notes')
          .eq('id', $user.id)
          .single(),
        supabase
          .from('entities')
          .select('id, name'),
        new Promise(resolve => setTimeout(resolve, 500))
      ])
    ]);

    const [userData, entitiesData] = responses;

    if (userData.data) {
      noteContent = userData.data.notes || '';
    }

    if (entitiesData.data) {
      entities = entitiesData.data;
    }
  }
  isLoading = false;
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
      if (event.type === 'keydown' && event.altKey && event.key.toLowerCase() === 'c') {
        event.preventDefault(); // Prevent any default browser behavior
        showPopup = true;
        showCreateItemOption = false;
      } else if (event.type === 'mouseup') {
        showCreateItemOption = true;
        buttonPosition = {
          top: event.clientY + window.scrollY + 20,
          left: event.clientX
        };
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
      on:mouseup={(e) => handleSelection(e)}
      on:keydown={(e) => handleSelection(e)}
      placeholder="Start typing your notes here..."
      rows="20"
      cols="100"
    ></textarea>
    {#if showCreateItemOption}
      <div class="create-item-option" style="top: {buttonPosition.top}px; left: {buttonPosition.left}px;">
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
    on:close={() => showPopup = false}
  />
{/if}