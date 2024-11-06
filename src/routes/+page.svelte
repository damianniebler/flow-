<script>
  import { user, getCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { supabase } from '../supabase';

  let firstName = '';

  onMount(async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      const { data } = await supabase
        .from('users')
        .select('first_name')
        .eq('id', currentUser.id)
        .single();
      firstName = data.first_name;
    } else {
      goto('/login');
    }
  });
</script>

<h1>Welcome {firstName}!</h1>
<p>
  We're ready to help you stay on top of your day.
</p>
