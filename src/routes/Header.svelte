<script>
    import { user, signOut } from '$lib/auth';
    import { sidebarVisible } from '$lib/stores/sidebarStore';
    import FeedbackPopup from '$lib/components/FeedbackPopup.svelte';
    import { goto } from '$app/navigation';
    import { supabase } from '../supabase';
    import { onMount } from 'svelte';

    const handleSignOut = () => signOut();
    const toggleSidebar = () => sidebarVisible.update(v => !v);

    const navigateToHome = () => {
        goto('/');
    };

    const startTutorial = () => {
        sidebarVisible.set(true);
        isMenuOpen = false;

        if (!window.tutorial) {
           window.tutorial = new window.Tutorial();
        }
        window.tutorial.start(true);
    };

    let isMenuOpen = false;
    const toggleMenu = () => {
        isMenuOpen = !isMenuOpen;
        if (window.innerWidth <= 768) {
            sidebarVisible.set(false);
        }
    };
    let showFeedback = false;

    // Search functionality
    let searchQuery = '';
    let searchResults = [];
    let showSearchResults = false;
    let showSearchOverlay = false;
    let searchTimeout;
    let searchInputElement;

    function toggleSearch() {
        showSearchOverlay = !showSearchOverlay;
        if (showSearchOverlay) {
            setTimeout(() => {
                searchInputElement?.focus();
            }, 100);
        } else {
            searchQuery = '';
            searchResults = [];
            showSearchResults = false;
        }
    }

function fuzzyMatch(text, query) {
    if (!text || !query) return false;
    text = text.toLowerCase();
    return query.toLowerCase().split(' ').every(word => text.includes(word));
}


    async function performSearch(query) {
        console.log('Searching for:', query);

        if (!query || query.length < 2) {
            searchResults = [];
            showSearchResults = false;
            return;
        }

        try {
            const { data: items, error } = await supabase
                .from('items')
                .select('*, entities(name, id)')
                .order('last_updated', { ascending: false });

            console.log('Database response:', { items, error });

            if (error) {
                console.error('Search error:', error);
                return;
            }

            const filteredResults = items.filter(item => {
                const nameMatch = fuzzyMatch(item.name, query);
                const noteMatch = item.note && fuzzyMatch(item.note, query);
                // entities may be an array or single object
                let entityMatch = false;
                if (Array.isArray(item.entities)) {
                    entityMatch = item.entities.some(e => e && fuzzyMatch(e.name, query));
                } else if (item.entities && typeof item.entities === 'object') {
                    entityMatch = fuzzyMatch(item.entities.name, query);
                }
                return nameMatch || noteMatch || entityMatch;
            });

            console.log('Filtered results:', filteredResults);

            searchResults = filteredResults
                .sort((a, b) => {
                    const aExact = a.name.toLowerCase().includes(query.toLowerCase()) || 
                                  (a.note && a.note.toLowerCase().includes(query.toLowerCase()));
                    const bExact = b.name.toLowerCase().includes(query.toLowerCase()) || 
                                  (b.note && b.note.toLowerCase().includes(query.toLowerCase()));
                    
                    if (aExact && !bExact) return -1;
                    if (!aExact && bExact) return 1;
                    return 0;
                })
                .slice(0, 8);

            showSearchResults = true;
            console.log('Final searchResults:', searchResults, 'showSearchResults:', showSearchResults);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    function handleSearchInput() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(searchQuery);
        }, 300);
    }

    function selectSearchResult(item) {
        searchQuery = '';
        searchResults = [];
        showSearchResults = false;
        showSearchOverlay = false;
        goto(`/entity/${item.entity_id}?itemId=${item.id}`);
    }

onMount(() => {
    function handleClickOutside(event) {
        if (!event.target.closest('.search-modal')) {
            showSearchResults = false;
        }
    }

    function handleKeydown(event) {
        // Existing Escape handler
        if (event.key === 'Escape' && showSearchOverlay) {
            toggleSearch();
        }
        // New: Ctrl+Q handler
        if ((event.ctrlKey || event.metaKey) && (event.key === 'q' || event.key === 'Q')) {
            event.preventDefault();
            if (!showSearchOverlay) {
                toggleSearch();
            }
        }
    }

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);

    return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleKeydown);
    };
});
</script>

{#if $user}
<header>
    <div class="sticky-toggle">
        <button class="sidebar-toggle" on:click={toggleSidebar}>
            {#if $sidebarVisible}
                ◀
            {:else}
                ▶
            {/if}
        </button>
        
        <div class="logo" on:click={navigateToHome} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && navigateToHome()}>Flowscend</div>
        
        <div class="header-actions">
            <button class="search-toggle" on:click={toggleSearch}>
                <i class="fas fa-search"></i>
            </button>
            <button class="hamburger-menu" on:click={toggleMenu}>
                <i class="fas fa-bars"></i>
            </button>
        </div>
    </div>
    <nav class:menu-open={isMenuOpen}>
        <ul>
            <li><button class="second-button" on:click={() => window.location.href='/notepad'}>Notepad</button></li>
            <li><button class="second-button" on:click={startTutorial}>Tutorial</button></li>
            <li><button class="second-button" on:click={() => showFeedback = true}>Give Feedback</button></li>
            <li><button class="second-button" on:click={handleSignOut}>Logout</button></li>
        </ul>
    </nav>    
</header>

<!-- Search Overlay -->
{#if showSearchOverlay}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="search-overlay" on:click={() => toggleSearch()}>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="search-modal" on:click|stopPropagation>
            <div class="search-header">
                <h2>Search Tasks & Notes</h2>
                <button class="close-search" on:click={toggleSearch}>
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="search-container">
                <div class="search-input-wrapper">
                    <input 
                        type="text" 
                        placeholder="Search tasks and notes..." 
                        bind:value={searchQuery}
                        bind:this={searchInputElement}
                        on:input={handleSearchInput}
                        class="search-input"
                    />
                    <i class="fas fa-search search-icon"></i>
                </div>
                
                <!-- Debug info -->
                {#if searchQuery.length >= 2}
                    <div style="padding: 10px; font-size: 12px; color: var(--text-color); opacity: 0.7;">
                        Query: "{searchQuery}" | Results: {searchResults.length} | Show: {showSearchResults}
                    </div>
                {/if}
                
                {#if showSearchResults && searchQuery.length >= 2}
                    <div class="search-results">
                        {#if searchResults.length > 0}
{#each searchResults as item (item.id)}
  <div class="search-result-item" on:mousedown={() => selectSearchResult(item)}>
    <div class="search-result-main">
      <span class="search-result-name">{item.name}</span>
<span class="search-result-entity">
  {#if item.entities && item.entities.name}
    in {item.entities.name}
  {/if}
</span>
    </div>
    {#if item.note}
      <div class="search-result-note">
        {item.note.length > 60 ? item.note.substring(0, 60) + '...' : item.note}
      </div>
    {/if}
  </div>
{/each}

                        {:else}
                            <div style="padding: 20px; text-align: center; color: var(--text-color); opacity: 0.7;">
                                No results found for "{searchQuery}"
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
{/if}

{#if showFeedback}
    <FeedbackPopup bind:showFeedback />
{/if}