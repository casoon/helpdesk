import { Hono } from 'hono';
import { createDb } from '@casoon/helpdesk-db';
import { conversations, messages, customers } from '@casoon/helpdesk-db/schema';
import { sql, eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

export const searchRoutes = new Hono();
searchRoutes.use('*', requireAuth);

const db = createDb(process.env.DATABASE_URL!);

// GET /api/search?q=...&type=conversations|messages|customers&mailboxId=...&status=...
searchRoutes.get('/', async (c) => {
  const { q, type, mailboxId, status, page = '1', perPage = '20' } = c.req.query();

  if (!q || q.trim().length < 2) {
    return c.json({ conversations: [], messages: [], customers: [], query: q ?? '' });
  }

  const query = q.trim();
  const limit = Math.min(Number(perPage), 50);
  const offset = (Number(page) - 1) * limit;

  // Use plainto_tsquery for user-friendly input (handles spaces, no special chars needed)
  const tsQuery = sql`plainto_tsquery('english', ${query})`;

  const results: {
    conversations: unknown[];
    messages: unknown[];
    customers: unknown[];
    query: string;
  } = { conversations: [], messages: [], customers: [], query };

  if (!type || type === 'conversations') {
    const convConditions = [
      sql`${conversations}.search_vector @@ ${tsQuery}`,
    ];
    if (mailboxId) convConditions.push(eq(conversations.mailboxId, mailboxId));
    if (status) convConditions.push(eq(conversations.status, status as 'active' | 'pending' | 'closed' | 'spam'));

    const convRows = await db
      .select({
        id: conversations.id,
        subject: conversations.subject,
        status: conversations.status,
        mailboxId: conversations.mailboxId,
        customerEmail: conversations.customerEmail,
        preview: conversations.preview,
        lastReplyAt: conversations.lastReplyAt,
        createdAt: conversations.createdAt,
        rank: sql<number>`ts_rank(${conversations}.search_vector, ${tsQuery})`,
      })
      .from(conversations)
      .where(and(...convConditions))
      .orderBy(desc(sql`ts_rank(${conversations}.search_vector, ${tsQuery})`))
      .limit(limit)
      .offset(offset);

    results.conversations = convRows;
  }

  if (!type || type === 'messages') {
    const msgRows = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        type: messages.type,
        body: messages.body,
        createdAt: messages.createdAt,
        rank: sql<number>`ts_rank(${messages}.search_vector, ${tsQuery})`,
        headline: sql<string>`ts_headline('english', coalesce(${messages.body}, ''), ${tsQuery}, 'MaxWords=20, MinWords=5, StartSel=<mark>, StopSel=</mark>')`,
      })
      .from(messages)
      .where(and(
        sql`${messages}.search_vector @@ ${tsQuery}`,
        sql`${messages}.type != 'lineitem'`,
      ))
      .orderBy(desc(sql`ts_rank(${messages}.search_vector, ${tsQuery})`))
      .limit(limit)
      .offset(offset);

    results.messages = msgRows;
  }

  if (!type || type === 'customers') {
    const custRows = await db
      .select({
        id: customers.id,
        email: customers.email,
        firstName: customers.firstName,
        lastName: customers.lastName,
        company: customers.company,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(sql`(
        to_tsvector('english', coalesce(${customers.email}, '') || ' ' ||
          coalesce(${customers.firstName}, '') || ' ' ||
          coalesce(${customers.lastName}, '') || ' ' ||
          coalesce(${customers.company}, ''))
        @@ ${tsQuery}
      )`)
      .limit(limit)
      .offset(offset);

    results.customers = custRows;
  }

  return c.json(results);
});
