import { Hono } from 'hono';
import { createDb } from '@casoon/helpdesk-db';
import { savedReplies } from '@casoon/helpdesk-db/schema';
import { eq, ilike, or } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

export const savedReplyRoutes = new Hono();
savedReplyRoutes.use('*', requireAuth);

const db = createDb(process.env.DATABASE_URL!);

savedReplyRoutes.get('/', async (c) => {
  const { q, mailboxId } = c.req.query();

  const conditions = [];
  if (mailboxId) conditions.push(eq(savedReplies.mailboxId, mailboxId));
  if (q) conditions.push(ilike(savedReplies.name, `%${q}%`));

  const rows = conditions.length
    ? await db.select().from(savedReplies).where(conditions.length === 1 ? conditions[0] : or(...conditions))
    : await db.select().from(savedReplies);

  return c.json({ data: rows });
});

savedReplyRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ name: string; body: string; mailboxId?: string }>();
  const [reply] = await db
    .insert(savedReplies)
    .values({ name: body.name, body: body.body, mailboxId: body.mailboxId ?? null, createdByUserId: user.id })
    .returning();
  return c.json({ reply }, 201);
});

savedReplyRoutes.patch('/:id', async (c) => {
  const body = await c.req.json<{ name?: string; body?: string }>();
  const [updated] = await db
    .update(savedReplies)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(savedReplies.id, c.req.param('id')))
    .returning();
  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json({ reply: updated });
});

savedReplyRoutes.delete('/:id', async (c) => {
  await db.delete(savedReplies).where(eq(savedReplies.id, c.req.param('id')));
  return c.json({ ok: true });
});
