import { Hono } from 'hono';
import { createDb } from '@casoon/helpdesk-db';
import { conversations, messages, customers, users, mailboxes } from '@casoon/helpdesk-db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import type { ConversationStatus } from '@casoon/helpdesk-types';

export const conversationRoutes = new Hono();
conversationRoutes.use('*', requireAuth);

const db = createDb(process.env.DATABASE_URL!);

// GET /api/conversations
conversationRoutes.get('/', async (c) => {
  const { status, assigneeId, mailboxId, page = '1', perPage = '25' } = c.req.query();

  const conditions = [];
  if (status) conditions.push(eq(conversations.status, status as ConversationStatus));
  if (assigneeId) conditions.push(eq(conversations.assigneeId, assigneeId));
  if (mailboxId) conditions.push(eq(conversations.mailboxId, mailboxId));

  const limit = Number(perPage);
  const offset = (Number(page) - 1) * limit;

  const rows = await db
    .select()
    .from(conversations)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(conversations.lastReplyAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows, page: Number(page), perPage: limit });
});

// GET /api/conversations/:id
conversationRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const [row] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!row) return c.json({ error: 'Not found' }, 404);

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  return c.json({ conversation: row, messages: msgs });
});

// PATCH /api/conversations/:id
conversationRoutes.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<Partial<{ status: ConversationStatus; assigneeId: string | null }>>();

  const [updated] = await db
    .update(conversations)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();

  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json({ conversation: updated });
});

// POST /api/conversations/:id/messages
conversationRoutes.post('/:id/messages', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const body = await c.req.json<{ body: string; type: 'agent' | 'note' }>();

  const [msg] = await db
    .insert(messages)
    .values({
      conversationId: id,
      type: body.type,
      body: body.body,
      authorUserId: user.id,
    })
    .returning();

  // Update conversation preview + lastReplyAt
  await db
    .update(conversations)
    .set({ lastReplyAt: new Date(), updatedAt: new Date(), preview: body.body.slice(0, 255) })
    .where(eq(conversations.id, id));

  // TODO: enqueue OutboundEmailJob for type === 'agent'

  return c.json({ message: msg }, 201);
});
