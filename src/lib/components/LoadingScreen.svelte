<script>
    import { onMount } from 'svelte';
    
    export let isLoading = true;
    
    onMount(() => {
      const loadingProgress = document.querySelector('.loading-progress');
      
      if (loadingProgress) {
        loadingProgress.style.width = '100%';
        
        setTimeout(() => {
          isLoading = false;
        }, 1000);
      }
    });
  </script>
  
  <div class="loading-screen" class:hide={!isLoading}>
    <div class="logo">Flowscend</div>
    <div class="loading-bar">
      <div class="loading-progress"></div>
    </div>
  </div>