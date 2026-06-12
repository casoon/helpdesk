<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { connectSSE, disconnectSSE, onSseEvent } from '../lib/sse.js';

  interface Props {
    conversationId: string;
  }

  let { conversationId }: Props = $props();

  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    connectSSE();
    unsubscribe = onSseEvent((event) => {
      if (event.type === 'message.new' && event.data.conversationId === conversationId) {
        window.location.reload();
      }
      if (event.type === 'conversation.updated' && event.data.id === conversationId) {
        window.location.reload();
      }
    });
  });

  onDestroy(() => {
    unsubscribe?.();
    disconnectSSE();
  });
</script>
