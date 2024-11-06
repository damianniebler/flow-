<script>
  import { user } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { supabase } from '../supabase';

  let firstName = '';

  onMount(async () => {
      if ($user) {
          const { data } = await supabase
              .from('users')
              .select('first_name')
              .eq('id', $user.id)
              .single();
          firstName = data.first_name;
      }
  });

  $: if ($user) {
      goto('/');
  }
</script>

<h1>Welcome {firstName}!</h1>
<p>
  We're ready to help you stay on top of your day.
</p>
