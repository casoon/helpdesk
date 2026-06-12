import { Hono } from 'hono';
import { createDb } from '@casoon/helpdesk-db';
import { customers, conversations } from '@casoon/helpdesk-db/schema';
import { eq, ilike, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

export const customerRoutes = new Hono();
customerRoutes.use('*', requireAuth);

const db = createDb(process.env.DATABASE_URL!);

customerRoutes.get('/', async (c) => {
  const { q } = c.req.query();
  const rows = await db
    .select()
    .from(customers)
    .where(q ? ilike(customers.email, `%${q}%`) : undefined)
    .limit(50);

  return c.json({ data: rows });
});

customerRoutes.get('/:id', async (c) => {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, c.req.param('id')))
    .limit(1);

  if (!customer) return c.json({ error: 'Not found' }, 404);

  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.customerId, customer.id))
    .limit(20);

  return c.json({ customer, conversations: convs });
});

customerRoutes.get('/:id/stats', async (c) => {
  const { id } = c.req.param();
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!customer) return c.json({ error: 'Not found' }, 404);

  const convs = await db.select({
    id: conversations.id,
    status: conversations.status,
    subject: conversations.subject,
    createdAt: conversations.createdAt,
  }).from(conversations).where(eq(conversations.customerId, id)).orderBy(desc(conversations.createdAt)).limit(10);

  return c.json({
    customer,
    recentConversations: convs,
    stats: {
      total: convs.length,
    },
  });
});
