<script>
    import { signUp } from '$lib/auth';
    import { goto } from '$app/navigation';
    import '../../app.css';

    let email = '';
    let password = '';
    let error = null;

    async function handleSubmit() {
        try {
            await signUp(email, password);
            goto('/login');
        } catch (e) {
            error = e.message;
        }
    }
</script>

<h1>Sign Up</h1>

<form on:submit|preventDefault={handleSubmit}>
    <div>
        <label for="email">Email</label>
        <input type="email" id="email" bind:value={email} required />
    </div>
    <div>
        <label for="password">Password</label>
        <input type="password" id="password" bind:value={password} required />
    </div>
    <button type="submit">Sign Up</button>
</form>

{#if error}
    <p class="error">{error}</p>
{/if}