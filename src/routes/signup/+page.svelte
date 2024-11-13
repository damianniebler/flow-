<script>
    import { signUp } from '$lib/auth';
    import { goto } from '$app/navigation';
    import '../../app.css';

    let email = '';
    let password = '';
    let firstName = '';
    let error = null;

    async function handleSubmit() {
        try {
            await signUp(email, password, firstName);
            goto('/login');
        } catch (e) {
            error = e.message;
        }
    }
</script>
<div class="login-container">
    <div class="login-card">
        <div class="logo">Flowscend</div>
        <div class="auth-links">
            <a href="/login">Login</a>
            <span class="separator">|</span>
            <b>Sign Up</b>
        </div>

        <form on:submit|preventDefault={handleSubmit}>
            <div>
                <label for="firstName">First Name</label>
                <input type="text" id="firstName" bind:value={firstName} required />
            </div>
            <div>
                <label for="email">Email</label>
                <input type="email" id="email" bind:value={email} required />
            </div>
            <div>
                <label for="password">Password</label>
                <input type="password" id="password" bind:value={password} required />
            </div>
            <button class="button" type="submit">Sign Up</button>
        </form>

        {#if error}
            <p class="error">{error}</p>
        {/if}
    </div>
</div>
