<script>
import { popupStore } from '$lib/stores/popupStore.js';
    import { fade, fly } from 'svelte/transition';

    function closePopup() {
        popupStore.set({ visible: false, title: '' });
    }
</script>

{#if $popupStore.visible}
    <div class="popup-overlay" on:click={closePopup} transition:fade={{ duration: 200 }}>
        <div class="popup-content" on:click|stopPropagation transition:fly={{ y: 20, duration: 300 }}>
            <h2>Event Starting Soon!</h2>
            <p>{$popupStore.title}</p>
            <button on:click={closePopup}>Dismiss</button>
        </div>
    </div>
{/if}

<style>
    .popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    .popup-content {
        background: #2a2a2a; /* Dark theme background */
        color: #f0f0f0; /* Light text */
        padding: 2rem;
        border-radius: 8px;
        text-align: center;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
        max-width: 400px;
    }
    button {
        margin-top: 1rem;
        padding: 0.5rem 1.5rem;
    }
</style>