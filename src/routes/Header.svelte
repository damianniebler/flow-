<script>
    import { user, signOut } from '$lib/auth';
    import { sidebarVisible } from '$lib/stores/sidebarStore';

    const handleSignOut = () => signOut();
    const toggleSidebar = () => sidebarVisible.update(v => !v);
</script>

<header>
	<div class="sticky-toggle">
		{#if $user}
			<button class="sidebar-toggle" on:click={toggleSidebar}>
				{#if $sidebarVisible}
					◀
				{:else}
					▶
				{/if}
			</button>
		{/if}
	</div>
    <nav>
        <ul>
          {#if $user}
            <li><a href="/notepad">Notepad</a></li>
            <li><button class="second-button" on:click={handleSignOut}>Logout</button></li>
          {:else}
            <li><a href="/login">Login</a></li>
            <li><a href="/signup">Sign Up</a></li>
          {/if}
        </ul>
    </nav>
</header>