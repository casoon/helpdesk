// SSE connection manager for Svelte components

type SseEvent = {
  type: 'conversation.new' | 'conversation.updated' | 'message.new';
  data: Record<string, unknown>;
};

type Listener = (event: SseEvent) => void;

let source: EventSource | null = null;
const listeners = new Set<Listener>();

function getToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function connectSSE() {
  const token = getToken();
  if (!token || source) return;

  source = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);

  const eventTypes: SseEvent['type'][] = ['conversation.new', 'conversation.updated', 'message.new'];
  for (const type of eventTypes) {
    source.addEventListener(type, (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      for (const listener of listeners) {
        listener({ type, data });
      }
    });
  }

  source.onerror = () => {
    source?.close();
    source = null;
    // Reconnect after 5 seconds
    setTimeout(connectSSE, 5_000);
  };
}

export function disconnectSSE() {
  source?.close();
  source = null;
}

export function onSseEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
