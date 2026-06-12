import { Hono } from 'hono';
import { jwtVerify } from 'jose';
import { registerClient, unregisterClient } from '../lib/sse.js';

export const eventRoutes = new Hono();

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret');

// GET /api/events — SSE stream
// Auth via query param token (EventSource doesn't support custom headers)
eventRoutes.get('/', async (c) => {
  const token = c.req.query('token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    userId = (payload as { id: string }).id;
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const stream = new ReadableStream({
    start(controller) {
      registerClient(userId, controller);

      // Send initial heartbeat
      controller.enqueue(': connected\n\n');

      // Keepalive ping every 25 seconds
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(': ping\n\n');
        } catch {
          clearInterval(keepalive);
        }
      }, 25_000);

      // Store cleanup ref on controller for cancel
      (controller as unknown as Record<string, unknown>)._keepalive = keepalive;
    },
    cancel(controller) {
      clearInterval((controller as unknown as Record<string, unknown>)._keepalive as ReturnType<typeof setInterval>);
      unregisterClient(controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
});
