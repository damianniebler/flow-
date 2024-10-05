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

  onMount(async () => {
    if ($user) {
      const { data } = await supabase
        .from('users')
        .select('notes')
        .eq('id', $user.id)
        .single();

      if (data) {
        noteContent = data.notes || '';
      }

      const { data: entitiesData } = await supabase
        .from('entities')
        .select('id, name');

      if (entitiesData) {
        entities = entitiesData;
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

  function handleSelection() {
    if (textareaElement) {
      selectionStart = textareaElement.selectionStart;
      selectionEnd = textareaElement.selectionEnd;
      selectedText = noteContent.slice(selectionStart, selectionEnd).trim();

      if (selectedText) {
        showCreateItemOption = true;
        const rect = textareaElement.getBoundingClientRect();

        const lines = textareaElement.value.substr(0, selectionStart).split("\n").length;
        const lineHeight = parseFloat(getComputedStyle(textareaElement).lineHeight);
        const topOffset = (lines - 1) * lineHeight;

        const span = document.createElement("span");
        span.style.cssText = "visibility: hidden; white-space: pre; position: absolute;";
        span.style.font = getComputedStyle(textareaElement).font;
        document.body.appendChild(span);

        const textBeforeSelection = noteContent.slice(0, selectionStart).split("\n").pop();
        span.textContent = textBeforeSelection;

        const colOffset = span.offsetWidth;
        document.body.removeChild(span);

        const padding = 30;
        buttonPosition = {
          top: rect.top + window.scrollY + topOffset + padding,
          left: rect.left + window.scrollX + colOffset
        };
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

<div class="notepad">
  <textarea
    bind:this={textareaElement}
    bind:value={noteContent}
    on:input={saveNote}
    on:mouseup={handleSelection}
    on:keyup={handleSelection}
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

{#if showPopup}
  <CreateItemPopup
    text={selectedText}
    {entities}
    on:createItem={handleCreateItem}
    on:close={() => showPopup = false}
  />
{/if}