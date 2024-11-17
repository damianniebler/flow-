<script>
    import { supabase } from '../../supabase';
    
    export let showFeedback;
    let feedbackText = '';
    
    async function handleSubmit() {
      if (feedbackText.trim()) {
        const { error } = await supabase
          .from('feedback')
          .insert({ feedback_text: feedbackText });
          
        if (!error) {
          feedbackText = '';
          showFeedback = false;
        }
      }
    }
  </script>
  
  <div class="feedback-popup">
    <div class="feedback-content">
      <h2>Give Feedback</h2>
      <textarea 
        bind:value={feedbackText}
        placeholder="Tell us what you think..."
        rows="4"
      ></textarea>
      <div class="buttons">
        <button class="button" on:click={handleSubmit}>Submit</button>
        <button class="second-button" on:click={() => showFeedback = false}>Cancel</button>
      </div>
    </div>
  </div>