// Per-user SSE connection registry
type SseClient = {
  userId: string;
  controller: ReadableStreamDefaultController;
};

const clients: SseClient[] = [];

export function registerClient(userId: string, controller: ReadableStreamDefaultController) {
  clients.push({ userId, controller });
}

export function unregisterClient(controller: ReadableStreamDefaultController) {
  const idx = clients.findIndex((c) => c.controller === controller);
  if (idx !== -1) clients.splice(idx, 1);
}

export function broadcast(event: string, data: unknown, toUserId?: string) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const targets = toUserId ? clients.filter((c) => c.userId === toUserId) : clients;
  for (const client of targets) {
    try {
      client.controller.enqueue(payload);
    } catch {
      // Client disconnected — cleanup happens via cancel
    }
  }
}

export function broadcastAll(event: string, data: unknown) {
  broadcast(event, data);
}
