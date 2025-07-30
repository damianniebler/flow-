<script>
	export let position = { top: 0, left: 0 };
	export let onOptionClick;
</script>

<div class="options-popup" style="top: {position.top}px; left: {position.left}px">
	<button on:click={() => onOptionClick('open')}>Open Link</button>
	<button on:click={() => onOptionClick('edit')}>Edit Note</button>
</div>
