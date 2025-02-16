<script>
    import { supabase } from '../../supabase';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import '../../app.css';

    let newPassword = '';
    let confirmPassword = '';
    let error = null;
    let success = false;

    onMount(async () => {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const type = params.get('type');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (type === 'recovery' && accessToken && refreshToken) {
            const { data, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (sessionError) {
                console.error('Error setting session:', sessionError);
            } else {
                console.log('Session set successfully:', data);
            }
        }
    });

    async function handleSubmit() {
    if (newPassword !== confirmPassword) {
        error = "Passwords don't match";
        return;
    }

    try {
        const { data, error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (updateError) throw updateError;
        success = true;
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
    } catch (e) {
        error = e.message;
    }
}
</script>

<div class="login-container">
    <div class="login-card">
        <div class="logo">Flowscend</div>
        <h2>Set New Password</h2>
        {#if !success}
            <form on:submit|preventDefault={handleSubmit}>
                <div class="input-group">
                    <label for="newPassword">New Password</label>
                    <input type="password" id="newPassword" bind:value={newPassword} required />
                </div>
                <div class="input-group">
                    <label for="confirmPassword">Confirm Password</label>
                    <input type="password" id="confirmPassword" bind:value={confirmPassword} required />
                </div>
                <button class="button" type="submit">Update Password</button>
            </form>
        {:else}
            <div class="success-message">
                Password updated successfully! We're redirecting you, one moment...
            </div>
        {/if}

        {#if error}
            <p class="error">{error}</p>
        {/if}
    </div>
</div>