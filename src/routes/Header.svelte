<script>
    import { user, signOut } from '$lib/auth';
    import { sidebarVisible } from '$lib/stores/sidebarStore';
    import FeedbackPopup from '$lib/components/FeedbackPopup.svelte';
    
    const handleSignOut = () => signOut();
    const toggleSidebar = () => sidebarVisible.update(v => !v);
    const startTutorial = () => window.tutorial.start(true);

    
    let showFeedback = false;
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
        <div class="logo">Flowscend</div>
    </div>
    <nav>
        <ul>
          <li><a class="second-button" href="/notepad">Notepad</a></li>
          <li><button class="second-button" on:click={startTutorial}>Tutorial</button></li>
          <li><button class="second-button" on:click={() => showFeedback = true}>Give Feedback</button></li>
          <li><button class="second-button" on:click={handleSignOut}>Logout</button></li>
        </ul>
    </nav>
</header>
{/if}

{#if showFeedback}
    <FeedbackPopup bind:showFeedback />
{/if}