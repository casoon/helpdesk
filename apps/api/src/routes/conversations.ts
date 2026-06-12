import { Hono } from 'hono';
import { createDb } from '@casoon/helpdesk-db';
import {
  conversations,
  messages,
  customers,
  users,
  mailboxes,
  conversationFolders,
  folders,
  tags,
  conversationTags,
  attachments,
} from '@casoon/helpdesk-db/schema';
import { eq, desc, and, isNull, isNotNull, sql, inArray, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { requireAuth } from '../middleware/auth.js';
import type { ConversationStatus, OutboundEmailJob } from '@casoon/helpdesk-types';
import { getQueue } from '../lib/queue.js';
import { broadcastAll } from '../lib/sse.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const conversationRoutes = new Hono();
conversationRoutes.use('*', requireAuth);

const db = createDb(process.env.DATABASE_URL!);

const s3 = new S3Client({
  region: process.env.S3_REGION ?? 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? '',
    secretAccessKey: process.env.S3_SECRET_KEY ?? '',
  },
  forcePathStyle: true,
});

const S3_BUCKET = process.env.S3_BUCKET ?? 'helpdesk';

const assigneeTable = alias(users, 'assignee');

async function presignAttachments(atts: (typeof attachments.$inferSelect)[]) {
  return Promise.all(
    atts.map(async (a) => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mimeType,
      size: a.size,
      embedded: a.embedded,
      url: await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: a.storageKey }),
        { expiresIn: 3600 },
      ),
    })),
  );
}

function folderCondition(folder: string, userId: string) {
  switch (folder) {
    case 'unassigned':
      return and(
        eq(conversations.status, 'active'),
        isNull(conversations.assigneeId),
        eq(conversations.state, 'published'),
      );
    case 'mine':
      return and(
        eq(conversations.status, 'active'),
        eq(conversations.assigneeId, userId),
        eq(conversations.state, 'published'),
      );
    case 'assigned':
      return and(
        eq(conversations.status, 'active'),
        isNotNull(conversations.assigneeId),
        eq(conversations.state, 'published'),
      );
    case 'closed':
      return and(eq(conversations.status, 'closed'), eq(conversations.state, 'published'));
    case 'spam':
      return and(eq(conversations.status, 'spam'), eq(conversations.state, 'published'));
    case 'deleted':
      return eq(conversations.state, 'deleted');
    default:
      return undefined;
  }
}

// GET /api/conversations
conversationRoutes.get('/', async (c) => {
  const { folder, status, assigneeId, mailboxId, page = '1', perPage = '25' } = c.req.query();
  const { id: userId } = c.get('user');

  const limit = Math.min(Number(perPage), 100);
  const offset = (Number(page) - 1) * limit;

  let baseCondition: ReturnType<typeof and> | undefined;

  if (folder === 'starred' || folder === 'drafts') {
    const folderRows = await db
      .select({ id: folders.id })
      .from(folders)
      .where(
        folder === 'starred'
          ? and(eq(folders.type, 'starred'), eq(folders.userId, userId))
          : eq(folders.type, 'drafts'),
      );

    const folderIds = folderRows.map((f) => f.id);
    if (!folderIds.length) {
      return c.json({ data: [], total: 0, page: Number(page), perPage: limit });
    }

    const cfRows = await db
      .select({ conversationId: conversationFolders.conversationId })
      .from(conversationFolders)
      .where(inArray(conversationFolders.folderId, folderIds));

    const convIds = cfRows.map((cf) => cf.conversationId);
    if (!convIds.length) {
      return c.json({ data: [], total: 0, page: Number(page), perPage: limit });
    }

    baseCondition = inArray(conversations.id, convIds) as unknown as ReturnType<typeof and>;
  } else if (folder) {
    baseCondition = folderCondition(folder, userId) as ReturnType<typeof and> | undefined;
  }

  const extras = [];
  if (!folder) {
    if (status) extras.push(eq(conversations.status, status as ConversationStatus));
    if (assigneeId) extras.push(eq(conversations.assigneeId, assigneeId));
  }
  if (mailboxId) extras.push(eq(conversations.mailboxId, mailboxId));

  const where =
    baseCondition && extras.length
      ? and(baseCondition, ...extras)
      : baseCondition ?? (extras.length ? and(...extras) : undefined);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(conversations)
    .where(where);

  const rows = await db
    .select({
      id: conversations.id,
      subject: conversations.subject,
      type: conversations.type,
      status: conversations.status,
      state: conversations.state,
      preview: conversations.preview,
      threadsCount: conversations.threadsCount,
      hasAttachments: conversations.hasAttachments,
      lastReplyAt: conversations.lastReplyAt,
      lastReplyFrom: conversations.lastReplyFrom,
      readByUser: conversations.readByUser,
      sourceType: conversations.sourceType,
      createdAt: conversations.createdAt,
      customerId: customers.id,
      customerEmail: customers.email,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerAvatarUrl: customers.avatarUrl,
      mailboxId: mailboxes.id,
      mailboxName: mailboxes.name,
      mailboxEmail: mailboxes.email,
      assigneeId: assigneeTable.id,
      assigneeFirstName: assigneeTable.firstName,
      assigneeLastName: assigneeTable.lastName,
      assigneeAvatarUrl: assigneeTable.avatarUrl,
    })
    .from(conversations)
    .innerJoin(customers, eq(conversations.customerId, customers.id))
    .innerJoin(mailboxes, eq(conversations.mailboxId, mailboxes.id))
    .leftJoin(assigneeTable, eq(conversations.assigneeId, assigneeTable.id))
    .where(where)
    .orderBy(desc(conversations.lastReplyAt))
    .limit(limit)
    .offset(offset);

  const data = rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    type: r.type,
    status: r.status,
    state: r.state,
    preview: r.preview,
    threadsCount: r.threadsCount,
    hasAttachments: r.hasAttachments,
    lastReplyAt: r.lastReplyAt,
    lastReplyFrom: r.lastReplyFrom,
    readByUser: r.readByUser,
    sourceType: r.sourceType,
    createdAt: r.createdAt,
    customer: {
      id: r.customerId,
      email: r.customerEmail,
      firstName: r.customerFirstName,
      lastName: r.customerLastName,
      avatarUrl: r.customerAvatarUrl,
    },
    mailbox: { id: r.mailboxId, name: r.mailboxName, email: r.mailboxEmail },
    assignee: r.assigneeId
      ? {
          id: r.assigneeId,
          firstName: r.assigneeFirstName!,
          lastName: r.assigneeLastName!,
          avatarUrl: r.assigneeAvatarUrl ?? null,
        }
      : null,
  }));

  return c.json({ data, total, page: Number(page), perPage: limit });
});

// GET /api/conversations/:id
conversationRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();

  const [row] = await db
    .select({
      id: conversations.id,
      subject: conversations.subject,
      type: conversations.type,
      status: conversations.status,
      state: conversations.state,
      preview: conversations.preview,
      threadsCount: conversations.threadsCount,
      hasAttachments: conversations.hasAttachments,
      lastReplyAt: conversations.lastReplyAt,
      lastReplyFrom: conversations.lastReplyFrom,
      readByUser: conversations.readByUser,
      sourceType: conversations.sourceType,
      createdAt: conversations.createdAt,
      cc: conversations.cc,
      bcc: conversations.bcc,
      customerId: customers.id,
      customerEmail: customers.email,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerAvatarUrl: customers.avatarUrl,
      mailboxId: mailboxes.id,
      mailboxName: mailboxes.name,
      mailboxEmail: mailboxes.email,
      assigneeId: assigneeTable.id,
      assigneeFirstName: assigneeTable.firstName,
      assigneeLastName: assigneeTable.lastName,
      assigneeAvatarUrl: assigneeTable.avatarUrl,
    })
    .from(conversations)
    .innerJoin(customers, eq(conversations.customerId, customers.id))
    .innerJoin(mailboxes, eq(conversations.mailboxId, mailboxes.id))
    .leftJoin(assigneeTable, eq(conversations.assigneeId, assigneeTable.id))
    .where(eq(conversations.id, id))
    .limit(1);

  if (!row) return c.json({ error: 'Not found' }, 404);

  const authorCustomerAlias = alias(customers, 'author_customer');
  const authorUserAlias = alias(users, 'author_user');

  const msgs = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      type: messages.type,
      state: messages.state,
      actionType: messages.actionType,
      actionData: messages.actionData,
      body: messages.body,
      from: messages.from,
      to: messages.to,
      cc: messages.cc,
      bcc: messages.bcc,
      first: messages.first,
      hasAttachments: messages.hasAttachments,
      openedAt: messages.openedAt,
      editedAt: messages.editedAt,
      createdAt: messages.createdAt,
      authorCustomerId: authorCustomerAlias.id,
      authorCustomerEmail: authorCustomerAlias.email,
      authorCustomerFirstName: authorCustomerAlias.firstName,
      authorCustomerLastName: authorCustomerAlias.lastName,
      authorUserId: authorUserAlias.id,
      authorUserFirstName: authorUserAlias.firstName,
      authorUserLastName: authorUserAlias.lastName,
    })
    .from(messages)
    .leftJoin(authorCustomerAlias, eq(messages.authorCustomerId, authorCustomerAlias.id))
    .leftJoin(authorUserAlias, eq(messages.authorUserId, authorUserAlias.id))
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const msgIds = msgs.filter((m) => m.hasAttachments).map((m) => m.id);
  const attRows = msgIds.length
    ? await db.select().from(attachments).where(inArray(attachments.messageId, msgIds))
    : [];

  const attsByMsg = new Map<string, (typeof attRows)>();
  for (const att of attRows) {
    const list = attsByMsg.get(att.messageId) ?? [];
    list.push(att);
    attsByMsg.set(att.messageId, list);
  }

  const messagesOut = await Promise.all(
    msgs.map(async (m) => ({
      id: m.id,
      conversationId: m.conversationId,
      type: m.type,
      state: m.state,
      actionType: m.actionType,
      actionData: m.actionData,
      body: m.body,
      from: m.from,
      to: m.to,
      cc: m.cc,
      bcc: m.bcc,
      first: m.first,
      hasAttachments: m.hasAttachments,
      openedAt: m.openedAt,
      editedAt: m.editedAt,
      createdAt: m.createdAt,
      author: m.authorUserId
        ? { kind: 'agent' as const, id: m.authorUserId, firstName: m.authorUserFirstName!, lastName: m.authorUserLastName! }
        : m.authorCustomerId
        ? { kind: 'customer' as const, id: m.authorCustomerId, email: m.authorCustomerEmail!, firstName: m.authorCustomerFirstName ?? null, lastName: m.authorCustomerLastName ?? null }
        : { kind: 'system' as const },
      attachments: await presignAttachments(attsByMsg.get(m.id) ?? []),
    })),
  );

  const tagRows = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(conversationTags)
    .innerJoin(tags, eq(conversationTags.tagId, tags.id))
    .where(eq(conversationTags.conversationId, id));

  return c.json({
    conversation: {
      id: row.id,
      subject: row.subject,
      type: row.type,
      status: row.status,
      state: row.state,
      preview: row.preview,
      threadsCount: row.threadsCount,
      hasAttachments: row.hasAttachments,
      lastReplyAt: row.lastReplyAt,
      lastReplyFrom: row.lastReplyFrom,
      readByUser: row.readByUser,
      sourceType: row.sourceType,
      createdAt: row.createdAt,
      cc: row.cc,
      bcc: row.bcc,
      customer: {
        id: row.customerId,
        email: row.customerEmail,
        firstName: row.customerFirstName,
        lastName: row.customerLastName,
        avatarUrl: row.customerAvatarUrl,
      },
      mailbox: { id: row.mailboxId, name: row.mailboxName, email: row.mailboxEmail },
      assignee: row.assigneeId
        ? { id: row.assigneeId, firstName: row.assigneeFirstName!, lastName: row.assigneeLastName!, avatarUrl: row.assigneeAvatarUrl ?? null }
        : null,
      tags: tagRows,
    },
    messages: messagesOut,
  });
});

// POST /api/conversations
conversationRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    mailboxId: string;
    customerEmail: string;
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
  }>();

  let [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, body.customerEmail))
    .limit(1);

  if (!customer) {
    [customer] = await db.insert(customers).values({ email: body.customerEmail }).returning();
  }

  const now = new Date();
  const [conversation] = await db
    .insert(conversations)
    .values({
      subject: body.subject,
      mailboxId: body.mailboxId,
      customerId: customer.id,
      customerEmail: customer.email,
      assigneeId: user.id,
      createdByUserId: user.id,
      cc: body.cc ?? null,
      bcc: body.bcc ?? null,
      sourceVia: 'user',
      sourceType: 'email',
      status: 'active',
      state: 'published',
      preview: body.body.slice(0, 255),
      lastReplyAt: now,
      lastReplyFrom: 'user',
    })
    .returning();

  const [msg] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      type: 'agent',
      body: body.body,
      authorUserId: user.id,
      first: true,
      sourceVia: 'user',
      sourceType: 'email',
    })
    .returning();

  try {
    const queue = await getQueue();
    const job: OutboundEmailJob = {
      messageId: msg.id,
      conversationId: conversation.id,
      mailboxId: body.mailboxId,
      to: customer.email,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      html: body.body,
    };
    await queue.send('email:outbound', job);
  } catch (err) {
    console.error('[conversations] failed to enqueue outbound email:', err);
  }

  broadcastAll('conversation.new', { id: conversation.id, subject: conversation.subject, status: conversation.status, mailboxId: conversation.mailboxId });

  return c.json({ conversation }, 201);
});

// PATCH /api/conversations/:id
conversationRoutes.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const body = await c.req.json<Partial<{
    status: ConversationStatus;
    assigneeId: string | null;
    state: 'draft' | 'published' | 'deleted';
  }>>();

  const [current] = await db
    .select({ status: conversations.status, assigneeId: conversations.assigneeId })
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!current) return c.json({ error: 'Not found' }, 404);

  const [updated] = await db
    .update(conversations)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();

  if (body.status !== undefined && body.status !== current.status) {
    await db.insert(messages).values({
      conversationId: id,
      type: 'lineitem',
      actionType: 'status_changed',
      actionData: body.status,
      authorUserId: user.id,
      sourceVia: 'user',
      sourceType: 'api',
    });
  }

  if ('assigneeId' in body && body.assigneeId !== current.assigneeId) {
    await db.insert(messages).values({
      conversationId: id,
      type: 'lineitem',
      actionType: 'assignee_changed',
      actionData: body.assigneeId ?? null,
      authorUserId: user.id,
      sourceVia: 'user',
      sourceType: 'api',
    });
  }

  broadcastAll('conversation.updated', { id: updated.id, status: updated.status, assigneeId: updated.assigneeId });

  return c.json({ conversation: updated });
});

// DELETE /api/conversations/:id
conversationRoutes.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const [updated] = await db
    .update(conversations)
    .set({ state: 'deleted', updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning({ id: conversations.id });

  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

// POST /api/conversations/:id/messages
conversationRoutes.post('/:id/messages', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const body = await c.req.json<{ body: string; type: 'agent' | 'note' }>();

  const [conv] = await db
    .select({
      mailboxId: conversations.mailboxId,
      customerEmail: conversations.customerEmail,
      subject: conversations.subject,
    })
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!conv) return c.json({ error: 'Not found' }, 404);

  const [msg] = await db
    .insert(messages)
    .values({
      conversationId: id,
      type: body.type,
      body: body.body,
      authorUserId: user.id,
      sourceVia: 'user',
      sourceType: 'email',
    })
    .returning();

  await db
    .update(conversations)
    .set({
      lastReplyAt: new Date(),
      lastReplyFrom: 'user',
      updatedAt: new Date(),
      preview: body.body.slice(0, 255),
    })
    .where(eq(conversations.id, id));

  if (body.type === 'agent') {
    try {
      const queue = await getQueue();
      const job: OutboundEmailJob = {
        messageId: msg.id,
        conversationId: id,
        mailboxId: conv.mailboxId,
        to: conv.customerEmail,
        subject: `Re: ${conv.subject}`,
        html: body.body,
      };
      await queue.send('email:outbound', job);
    } catch (err) {
      console.error('[conversations] failed to enqueue outbound email:', err);
    }
  }

  broadcastAll('message.new', { conversationId: id, messageId: msg.id, type: body.type });

  return c.json({ message: msg }, 201);
});

// POST /api/conversations/:id/tags/:tagId
conversationRoutes.post('/:id/tags/:tagId', async (c) => {
  const { id, tagId } = c.req.param();
  await db
    .insert(conversationTags)
    .values({ conversationId: id, tagId })
    .onConflictDoNothing();
  return c.json({ ok: true });
});

// DELETE /api/conversations/:id/tags/:tagId
conversationRoutes.delete('/:id/tags/:tagId', async (c) => {
  const { id, tagId } = c.req.param();
  await db
    .delete(conversationTags)
    .where(and(eq(conversationTags.conversationId, id), eq(conversationTags.tagId, tagId)));
  return c.json({ ok: true });
});
