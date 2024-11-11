<script>
    import { user, signOut } from '$lib/auth';
    import { sidebarVisible } from '$lib/stores/sidebarStore';
    const handleSignOut = () => signOut();
    const toggleSidebar = () => sidebarVisible.update(v => !v);
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
	</div>
    <nav>
        <ul>
          <li><a href="/notepad">Notepad</a></li>
          <li><button class="second-button" on:click={handleSignOut}>Logout</button></li>
        </ul>
    </nav>
</header>
{/if}