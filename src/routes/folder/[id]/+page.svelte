<script>
  import { supabase } from '../../../supabase';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { dndzone } from 'svelte-dnd-action';
  import lodash from 'lodash';
  import '../../../app.css';
  import { browser } from '$app/environment';

  const { debounce } = lodash;

  let sections = [];
  let newSectionName = '';
  let isDraggingEntity = false;
  let selectedSectionId = '';
  let folderName = '';
  let allFolders = [];
  let isLoading = true;
  let isInitialLoad = true;
  let isMobile = false;

  let pendingUpdates = Promise.resolve();

  $: currentFolderId = $page.params.id;

  $: if (currentFolderId) {
    loadSections();
  }

  onMount(loadSections);

  async function loadSections() {
  if (!sections.length) {
    isLoading = true;
  }
  try {
    const [responses] = await Promise.all([
      Promise.all([
        supabase
          .from('folders')
          .select('name')
          .eq('id', currentFolderId)
          .single(),
        supabase
          .from('sections')
          .select(`
            *,
            entities(
              *,
              items(last_updated)
            )
          `)
          .eq('folder_id', currentFolderId)
          .order('order', { ascending: true })
      ]),
      new Promise(resolve => setTimeout(resolve, 500))
    ]);

    const [folderResponse, sectionsResponse] = responses;

    if (folderResponse.error) throw folderResponse.error;
    if (sectionsResponse.error) throw sectionsResponse.error;

    folderName = folderResponse.data.name;
    sections = sectionsResponse.data.map(prepareSection);
  } catch (error) {
    console.error('Error loading folder data:', error.message);
  } finally {
    isLoading = false;
  }
}

  async function loadAllFolders() {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('folders')
    .select('id, name')
    .eq('user_id', userData.user.id)
    .order('name');

  if (error) {
    console.error('Error loading folders:', error);
  } else {
    allFolders = data;
  }
}

onMount(() => {
  isMobile = window.innerWidth <= 768;
  window.addEventListener('resize', () => {
      isMobile = window.innerWidth <= 768;
    });
  loadSections();
  loadAllFolders();
  window.createSection = createSection;
});

  function prepareSection(section) {
    return {
      ...section,
      entities: section.entities
        .map(entity => ({
          ...entity,
          last_updated: entity.items.length > 0
            ? Math.max(...entity.items.map(item => new Date(item.last_updated).getTime()))
            : new Date(entity.created_at).getTime(),
          uniqueId: `${section.id}-${entity.id}`
        }))
        .sort((a, b) => a.last_updated - b.last_updated)
    };
  }

  async function renameEntity(entity) {
    const newName = prompt('Enter a new name for the entity:', entity.name);
    if (newName && newName.trim() !== entity.name) {
      const { error } = await supabase
        .from('entities')
        .update({
          name: newName.trim()
        })
        .eq('id', entity.id);

      if (error) {
        console.error('Error renaming entity:', error);
      } else {
        await loadSections();
      }
    }
}

function handleEntityDnd(e, targetSectionId) {
  if (isMobile) return;
  const newEntities = e.detail.items.filter(item => !item.id.startsWith('dnd-'));
  const uniqueEntities = Array.from(new Map(newEntities.map(item => [item.id, item])).values());
  
  sections = sections.map(section => ({
    ...section,
    entities: section.id === targetSectionId
      ? uniqueEntities.map((entity, index) => ({
          ...entity,
          uniqueId: `${targetSectionId}-${entity.id}`,
          order: index,
          section_id: targetSectionId
        }))
      : section.entities.filter(entity => !uniqueEntities.some(e => e.id === entity.id))
  }));

  debouncedUpdateEntities(uniqueEntities, targetSectionId);
}

  const debouncedUpdateEntities = debounce((entities, targetSectionId) => {
    pendingUpdates = pendingUpdates.then(() => Promise.all(entities.map(async (entity, index) => {
      const { error } = await supabase
        .from('entities')
        .update({
          section_id: targetSectionId,
          order: index
        })
        .eq('id', entity.id);

      if (error) {
        console.error('Error updating entity:', error.message, entity);
      }
    })));
  }, 100);

  async function deleteEntity(entity) {
    if (confirm(`Are you sure you want to delete the entity "${entity.name}"?`)) {
      const { error } = await supabase
        .from('entities')
        .delete()
        .eq('id', entity.id);

      if (error) {
        console.error('Error deleting entity:', error);
      } else {
        await loadSections();
      }
    }
  }

  async function createSection(event) {
  event.preventDefault();
  console.log('Creating section, current newSectionName:', newSectionName);
  
  if (event.isTrusted || !window.tutorial) {
    if (newSectionName.trim()) {
      const { data, error } = await supabase
        .from('sections')
        .insert({
          name: newSectionName.trim(),
          folder_id: $page.params.id,
          order: sections.length
        })
        .select();

      if (error) {
        console.error('Error creating section:', error);
      } else {
        console.log('Section created successfully:', data[0]);
        if (!window.tutorial || window.tutorial.currentStep !== 2 || window.tutorial.sectionsCreated >= 2) {
          newSectionName = '';
        }
        await loadSections();
        if (window.tutorial && typeof window.tutorial.sectionCreated === 'function') {
          console.log('Calling tutorial.sectionCreated');
          window.tutorial.sectionCreated(data[0].id);
        }
      }
    }
  }
}


function addEntityToSection(sectionId) {
  let newEntityName = '';
  
  if (window.tutorial && window.tutorial.currentStep !== undefined && window.tutorial.currentStep === 3) {
    if (window.tutorial.currentStepSet === window.tutorial.workSteps) {
      newEntityName = "Joe's Bakery";
    } else if (window.tutorial.currentStepSet === window.tutorial.schoolSteps) {
      newEntityName = "Math Homework";
    } else if (window.tutorial.currentStepSet === window.tutorial.holidaySteps) {
      newEntityName = "Halloween";
    } else if (window.tutorial.currentStepSet === window.tutorial.artSteps) {
      newEntityName = "Landscape Painting";
    }
  } else {
    newEntityName = prompt('Enter new entity name:', newEntityName);
  }

  if (newEntityName && newEntityName.trim()) {
    createEntity(sectionId, newEntityName.trim());
  }
}

async function createEntity(sectionId, entityName) {
  const { data, error } = await supabase
    .from('entities')
    .insert({
      name: entityName,
      section_id: sectionId,
      order: sections.find(s => s.id === sectionId).entities.length,
      created_at: new Date().toISOString()
    })
    .select();

  if (error) {
    console.error('Error creating entity:', error);
  } else {
    await loadSections();
    if (window.tutorial && typeof window.tutorial.entityCreated === 'function') {
  setTimeout(() => window.tutorial.entityCreated(data[0].id), 100);
}

  }
}

  async function moveEntityToSection(entity, targetSectionId) {
    if (targetSectionId) {
      const { error } = await supabase
        .from('entities')
        .update({ section_id: targetSectionId })
        .eq('id', entity.id);

      if (error) {
        console.error('Error moving entity:', error);
      } else {
        await loadSections();
      }
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

  async function moveEntityToFolder(entity, targetFolderId) {
  if (targetFolderId) {
    let { data: existingSection, error: sectionError } = await supabase
      .from('sections')
      .select('id')
      .eq('folder_id', targetFolderId)
      .order('order')
      .limit(1)
      .single();

    let targetSectionId;

    if (sectionError) {
      const { data: newSection, error: createError } = await supabase
        .from('sections')
        .insert({ name: 'Default Section', folder_id: targetFolderId, order: 0 })
        .select()
        .single();

      if (createError) {
        console.error('Error creating new section:', createError);
        return;
      }

      targetSectionId = newSection.id;
    } else {
      targetSectionId = existingSection.id;
    }

    const { error: updateError } = await supabase
      .from('entities')
      .update({ section_id: targetSectionId })
      .eq('id', entity.id);

    if (updateError) {
      console.error('Error moving entity to new folder:', updateError);
    } else {
      await loadSections();
    }
  }
}


  async function renameSection(section) {
    const newName = prompt('Enter a new name for the section:', section.name);
    if (newName && newName.trim() !== section.name) {
      const { error } = await supabase
        .from('sections')
        .update({ name: newName.trim() })
        .eq('id', section.id);

      if (error) {
        console.error('Error renaming section:', error);
      } else {
        await loadSections();
      }
    }
  }

  async function deleteSection(section) {
    if (confirm(`Are you sure you want to delete the section "${section.name}"?`)) {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', section.id);

      if (error) {
        console.error('Error deleting section:', error);
      } else {
        await loadSections();
      }
    }
  }

  async function moveSection(section, direction) {
  const currentIndex = sections.indexOf(section);
  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  
  if (newIndex >= 0 && newIndex < sections.length) {
    const newSections = [...sections];
    [newSections[currentIndex], newSections[newIndex]] = [newSections[newIndex], newSections[currentIndex]];
    
    sections = newSections.map((section, index) => ({ ...section, order: index }));
    debouncedUpdateSections(sections);
  }
}


  function handleSectionDnd(e) {
  if (isMobile) return;
  const newSections = e.detail.items;
  const validSections = newSections.filter(section => !section.id.startsWith('id:dnd-shadow-placeholder'));
  sections = validSections.map((section, index) => ({ ...section, order: index }));
  debouncedUpdateSections(validSections);
}

  const debouncedUpdateSections = debounce((validSections) => {
    pendingUpdates = pendingUpdates.then(() => Promise.all(
      validSections.map((section, index) => 
        supabase
          .from('sections')
          .update({ order: index })
          .eq('id', section.id)
      )
    ));
  }, 100);

  async function moveAllEntities() {
    if (selectedSectionId) {
      const allEntities = sections.flatMap(section => section.entities);
      const { error } = await supabase
        .from('entities')
        .update({ section_id: selectedSectionId })
        .in('id', allEntities.map(entity => entity.id));

      if (error) {
        console.error('Error moving entities:', error);
      } else {
        await loadSections();
      }
    }
  }

</script>
{#if isInitialLoad && isLoading && (!browser || !window.tutorial || !window.tutorial.currentStep)}
  <div class="folder-view skeleton">
    <div class="skeleton-header"></div>
    <div class="skeleton-sections">
      <div class="skeleton-section">
        <div class="skeleton-section-header"></div>
        <div class="skeleton-entities">
          <div class="skeleton-entity"></div>
          <div class="skeleton-entity"></div>
          <div class="skeleton-entity"></div>
        </div>
      </div>
      <div class="skeleton-section">
        <div class="skeleton-section-header"></div>
        <div class="skeleton-entities">
          <div class="skeleton-entity"></div>
          <div class="skeleton-entity"></div>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="folder-view">
  <h1 class="folder-title">{folderName}</h1>

  <div class="move-all-entities">
    <select bind:value={selectedSectionId}>
      <option value="">Select a section</option>
      {#each sections as section}
        <option value={section.id}>{section.name}</option>
      {/each}
    </select>
    <button class="button" on:click={moveAllEntities}>Move all entities</button>
  </div>

  <div class="sections-container"
  use:dndzone={isMobile ? {items: sections, dragDisabled: true} : {items: sections, type: 'section', flipDurationMs: 150}}
  on:consider={handleSectionDnd}
  on:finalize={handleSectionDnd}
>
    {#each sections as section (section.id)}
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">{section.name}</h3>
          <div class="section-actions">
            <button class="btn-icon-move" on:click={() => moveSection(section, 'up')} disabled={sections.indexOf(section) === 0}>
              <span class="desktop-arrow">⮝</span>
              <span class="mobile-arrow">▲</span>
            </button>
            <button class="btn-icon-move" on:click={() => moveSection(section, 'down')} disabled={sections.indexOf(section) === sections.length - 1}>
              <span class="desktop-arrow">⮟</span>
              <span class="mobile-arrow">▼</span>
            </button>
            <button class="btn-icon" on:click={() => renameSection(section)}>✏️</button>
            <button class="btn-icon" on:click={() => deleteSection(section)}>🗑️</button>
          </div>
        </div>
       
        <ul class="entity-list"
        use:dndzone={isMobile ? {items: section.entities, dragDisabled: true} : {items: section.entities, type: 'entity', flipDurationMs: 150}}
        on:consider={(e) => handleEntityDnd(e, section.id)}
        on:finalize={(e) => handleEntityDnd(e, section.id)}
        on:consider={() => isDraggingEntity = true}
        on:finalize={() => isDraggingEntity = false}
      >
        {#each section.entities as entity (entity.uniqueId)}
        <li class="entity-item">
          <a href="/entity/{entity.id}?folderId={currentFolderId}" class="entity-name">{entity.name}</a>
          <span class="entity-timestamp">Updated {formatRelativeTime(entity.last_updated)}</span>
          <div class="entity-actions">
            <button class="btn-icon" on:click={() => renameEntity(entity)}>✏️</button>
            <select on:change={(e) => moveEntityToSection(entity, e.target.value)}>
              <option value="">Move to section...</option>
              {#each sections.filter(s => s.id !== entity.section_id) as section}
                <option value={section.id}>{section.name}</option>
              {/each}
            </select>
            <select on:change={(e) => moveEntityToFolder(entity, e.target.value)}>
              <option value="">Move to folder...</option>
              {#each allFolders.filter(f => f.id !== currentFolderId) as folder}
                <option value={folder.id}>{folder.name}</option>
              {/each}
            </select>
            <button class="btn-icon" on:click={() => deleteEntity(entity)}>🗑️</button>
          </div>
        </li>
           
      {/each}
          {#if section.entities.length === 0}
            <li class="placeholder" class:visible={isDraggingEntity}>
              <div class="placeholder-content">Drop here</div>
            </li>
          {/if}
        </ul>
        <button class="add-entity-btn" id="add-entity-btn" on:click={() => addEntityToSection(section.id)}>
          Add New
        </button>
        
      </div>
    {/each}
  </div>

  <form class="add-section-form" on:submit={createSection}>
    <input 
    type="text" 
    bind:value={newSectionName} 
    placeholder="New section name" 
    class="input-new-section" 
    id="new-section-input" 
  />
  
    <button type="button" id="btn-create-section" class="button" on:click={createSection}>Create Section</button>
  </form>
  
</div>
{/if}