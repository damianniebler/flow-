<script>
  import { user } from '$lib/auth';
</script>

{#if $user}
  <h1>Welcome to your Dashboard!</h1>
{:else}
  <h1>Welcome to Flow</h1>
  <p>
    Please <a href="/login">log in</a> to access your dashboard. 
    If you don't have an account, please <a href="/signup">sign up.</a>
  </p>
{/if}