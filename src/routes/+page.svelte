<script>
  import { user } from '$lib/auth';
  import { goto } from '$app/navigation';

  $: if ($user) {
    goto('/');
}
</script>

<h1>Welcome to Flow</h1>
<p>
  We're ready to help you stay on top of your day.
</p>