<script>
  import { createEventDispatcher } from 'svelte';

  export let text = '';
  export let entities = [];

  const dispatch = createEventDispatcher();

  let selectedEntityId = '';
  let note = '';
  let searchTerm = '';
  let showDropdown = false;
  let itemName = capitalizeWords(text);

  $: filteredEntities = searchTerm
    ? entities.filter(entity =>
        entity.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : entities;

  function capitalizeWords(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }

  function handleKeydown(event, entity, index) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        selectEntity(entity);
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusItem((index + 1) % filteredEntities.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusItem((index - 1 + filteredEntities.length) % filteredEntities.length);
        break;
      case 'Escape':
        event.preventDefault();
        showDropdown = false;
        break;
    }
  }

  function focusItem(index) {
    const items = document.querySelectorAll('.dropdown-list li');
    items[index]?.focus();
  }

  function handleSearchInput(event) {
    searchTerm = event.target.value;
    showDropdown = Boolean(searchTerm);
  }

  function selectEntity(entity) {
    selectedEntityId = entity.id;
    searchTerm = entity.name;
    showDropdown = false;
  }

  function createItem() {
    if (selectedEntityId) {
      dispatch('createItem', { entityId: selectedEntityId, text: itemName, note });
    }
  }
</script>

<div class="createpop popup">
  <h3>Create new item</h3>
  <div>
    <label for="itemName">Name:</label>
    <input type="text" id="itemName" bind:value={itemName} />
  </div>

  <div class="search-dropdown">
    <input
      type="text"
      bind:value={searchTerm}
      on:input={handleSearchInput}
      placeholder="Search for entity..."
    />
    {#if showDropdown}
      <ul class="dropdown-list">
        {#each filteredEntities as entity, index}
          <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <li
            tabindex="0"
            on:click={() => selectEntity(entity)}
            on:keydown={(event) => handleKeydown(event, entity, index)}
          >
            {entity.name}
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <textarea bind:value={note} placeholder="Add a note (optional)" />
 
  <div class="button-container">
    <button on:click={createItem} disabled={!selectedEntityId}>Create</button>
    <button on:click={() => dispatch('close')}>Cancel</button>
  </div>
</div>