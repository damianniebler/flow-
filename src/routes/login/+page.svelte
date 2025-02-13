<script>
    import { signIn } from '$lib/auth';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import '../../app.css';

    let email = '';
    let password = '';
    let error = null;
    $: showWelcomeMessage = $page.url.searchParams.get('newAccount') === 'true';

    async function handleSubmit() {
        try {
            await signIn(email, password);
            goto('/');
        } catch (e) {
            error = e.message;
        }
    }
</script>
<div class="login-container">
    <div class="login-card">
        <div class="logo">Flowscend</div>
        {#if showWelcomeMessage}
        <div class="success-message">
            Thanks for making your account! You can now login with your email and password from the previous screen.
        </div>
        {/if}
        <div class="auth-links">
            <b>Login</b>
            <span class="separator">|</span>
            <a href="/signup">Sign Up</a>
        </div>

        <form on:submit|preventDefault={handleSubmit}>
            <div class="input-group">
                <label for="email">Email</label>
                <input type="email" id="email" bind:value={email} required />
            </div>
            <div class="input-group">
                <label for="password">Password</label>
                <input type="password" id="password" bind:value={password} required />
            </div>
            <button class="button" type="submit">Login</button>
        </form>        

        {#if error}
            <p class="error">{error}</p>
        {/if}
    </div>
</div>