<script>
    import { resetPassword } from '$lib/auth';
    import '../../app.css';

    let email = '';
    let error = null;
    let success = false;

    async function handleSubmit() {
        try {
            await resetPassword(email);
            success = true;
            error = null;
        } catch (e) {
            error = e.message;
            success = false;
        }
    }
</script>

<div class="login-container">
    <div class="login-card">
        <div class="logo">Flowscend</div>
        <h2>Reset Password</h2>

        {#if !success}
            <form on:submit|preventDefault={handleSubmit}>
                <div class="input-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" bind:value={email} required />
                </div>
                <button class="button" type="submit">Send Reset Link</button>
            </form>
        {:else}
            <div class="success-message">
                Happens to the best of us - check your email for a password reset link!
            </div>
        {/if}

        {#if error}
            <p class="error">{error}</p>
        {/if}

        <div class="auth-links">
            <a href="/login">Back to Login</a>
        </div>
    </div>
</div>