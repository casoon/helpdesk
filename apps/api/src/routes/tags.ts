import { Hono } from 'hono';
import { createDb } from '@casoon/helpdesk-db';
import { tags } from '@casoon/helpdesk-db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

export const tagRoutes = new Hono();
tagRoutes.use('*', requireAuth);

const db = createDb(process.env.DATABASE_URL!);

tagRoutes.get('/', async (c) => {
  const rows = await db.select().from(tags);
  return c.json({ data: rows });
});

tagRoutes.post('/', async (c) => {
  const body = await c.req.json<{ name: string; color?: string }>();
  const [tag] = await db
    .insert(tags)
    .values({ name: body.name, color: body.color ?? '#6366f1' })
    .returning();
  return c.json({ tag }, 201);
});

tagRoutes.delete('/:id', async (c) => {
  await db.delete(tags).where(eq(tags.id, c.req.param('id')));
  return c.json({ ok: true });
});
