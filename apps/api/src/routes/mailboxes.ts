import { Hono } from 'hono';
import { createDb } from '@casoon/helpdesk-db';
import { encrypt } from '@casoon/helpdesk-db';
import { mailboxes, folders } from '@casoon/helpdesk-db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

export const mailboxRoutes = new Hono();
mailboxRoutes.use('*', requireAuth);

const db = createDb(process.env.DATABASE_URL!);

mailboxRoutes.get('/', async (c) => {
  const rows = await db.select({
    id: mailboxes.id,
    name: mailboxes.name,
    email: mailboxes.email,
    autoReplyEnabled: mailboxes.autoReplyEnabled,
    createdAt: mailboxes.createdAt,
  }).from(mailboxes);

  return c.json({ data: rows });
});

mailboxRoutes.get('/:id', async (c) => {
  const [row] = await db
    .select()
    .from(mailboxes)
    .where(eq(mailboxes.id, c.req.param('id')))
    .limit(1);

  if (!row) return c.json({ error: 'Not found' }, 404);
  // Never expose encrypted passwords
  const { inPasswordEncrypted, outPasswordEncrypted, ...safe } = row;
  return c.json({ mailbox: safe });
});

mailboxRoutes.post('/', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();

  if (typeof body.inPassword === 'string') {
    body.inPasswordEncrypted = encrypt(body.inPassword);
    delete body.inPassword;
  }
  if (typeof body.outPassword === 'string') {
    body.outPasswordEncrypted = encrypt(body.outPassword);
    delete body.outPassword;
  }

  const [created] = await db.insert(mailboxes).values(body as typeof mailboxes.$inferInsert).returning();

  await db.insert(folders).values([
    { mailboxId: created.id, type: 'unassigned' },
    { mailboxId: created.id, type: 'assigned' },
    { mailboxId: created.id, type: 'drafts' },
    { mailboxId: created.id, type: 'closed' },
    { mailboxId: created.id, type: 'deleted' },
    { mailboxId: created.id, type: 'spam' },
  ]).onConflictDoNothing();

  return c.json({ mailbox: created }, 201);
});

mailboxRoutes.patch('/:id', async (c) => {
  const body = await c.req.json();
  const [updated] = await db
    .update(mailboxes)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(mailboxes.id, c.req.param('id')))
    .returning();

  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json({ mailbox: updated });
});

mailboxRoutes.delete('/:id', async (c) => {
  await db.delete(mailboxes).where(eq(mailboxes.id, c.req.param('id')));
  return c.json({ ok: true });
});
