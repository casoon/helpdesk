<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { connectSSE, disconnectSSE, onSseEvent } from '../lib/sse.js';

  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    connectSSE();
    unsubscribe = onSseEvent((event) => {
      if (event.type === 'conversation.new' || event.type === 'conversation.updated') {
        // Reload the page to show fresh data
        window.location.reload();
      }
    });
  });

  onDestroy(() => {
    unsubscribe?.();
    disconnectSSE();
  });
</script>
