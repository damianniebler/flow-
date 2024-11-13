<script>
    import { signIn } from '$lib/auth';
    import { goto } from '$app/navigation';
    import '../../app.css';

    let email = '';
    let password = '';
    let error = null;

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
        <div class="auth-links">
            <b>Login</b>
            <span class="separator">|</span>
            <a href="/signup">Sign Up</a>
        </div>

        <form on:submit|preventDefault={handleSubmit}>
            <div>
                <label for="email">Email</label>
                <input type="email" id="email" bind:value={email} required />
            </div>
            <div>
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