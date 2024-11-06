<script>
	import { user, signOut } from '$lib/auth';
	import { sidebarVisible } from '$lib/stores/sidebarStore';

	const handleSignOut = () => signOut();
	const toggleSidebar = () => sidebarVisible.update(v => !v);
  </script>
  
  <header>
	<nav>
		<ul>
		  {#if $user && !$sidebarVisible}
			<li><button on:click={toggleSidebar}>▶</button></li>
		  {/if}
		  {#if $user}
			<li><a href="/notepad">Notepad</a></li>
			<li><button on:click={handleSignOut}>Logout</button></li>
		  {:else}
			<li><a href="/login">Login</a></li>
			<li><a href="/signup">Sign Up</a></li>
		  {/if}
		</ul>
	  </nav>	  
  </header>