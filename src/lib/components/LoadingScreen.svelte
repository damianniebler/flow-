<script>
  import { onMount } from 'svelte';
  
  export let isLoading = true;
  
  onMount(() => {
    const loadingProgress = document.querySelector('.loading-progress');
    
    if (loadingProgress) {
      // Set initial width to 0 (should already be 0 from CSS)
      loadingProgress.style.width = '0';
      
      // Use requestAnimationFrame to ensure the browser has time to render the initial state
      requestAnimationFrame(() => {
        // Set width to 100% after a small delay to allow the initial state to render
        setTimeout(() => {
          loadingProgress.style.width = '100%';
        }, 10);
      });
      
      // Hide the loading screen after animation completes
      setTimeout(() => {
        isLoading = false;
      }, 1000); // Match this to your CSS transition duration
    }
  });
</script>
  
<div class="loading-screen" class:hide={!isLoading}>
  <div class="logo">Flowscend</div>
  <div class="loading-bar">
    <div class="loading-progress"></div>
  </div>
</div>
  <div class="loading-screen" class:hide={!isLoading}>
    <div class="logo">Flowscend</div>
    <div class="loading-bar">
      <div class="loading-progress"></div>
    </div>
  </div>