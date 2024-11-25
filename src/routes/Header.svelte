<script>
    import { user, signOut } from '$lib/auth';
    import { sidebarVisible } from '$lib/stores/sidebarStore';
    import FeedbackPopup from '$lib/components/FeedbackPopup.svelte';
    
    const handleSignOut = () => signOut();
    const toggleSidebar = () => sidebarVisible.update(v => !v);
    const startTutorial = () => {
        // Ensure tutorial is initialized before starting
        if (!window.tutorial) {
            window.tutorial = new Tutorial();
        }
        window.tutorial.start(true); // Force start regardless of previous state
    };

    let isMenuOpen = false;
    const toggleMenu = () => {
        isMenuOpen = !isMenuOpen;
        if (window.innerWidth <= 768) {
            sidebarVisible.set(false);
        }
    };
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
        <button class="hamburger-menu" on:click={toggleMenu}>
            <i class="fas fa-bars"></i>
        </button>
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
{/if}

{#if showFeedback}
    <FeedbackPopup bind:showFeedback />
{/if}