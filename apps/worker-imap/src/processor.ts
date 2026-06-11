import { PgBoss, type Job } from 'pg-boss';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createDb } from '@casoon/helpdesk-db';
import { conversations, messages, customers, attachments } from '@casoon/helpdesk-db/schema';
import { eq, and } from 'drizzle-orm';
import { parseEml } from './poller.js';
import type { InboundEmailJob } from '@casoon/helpdesk-types';

const s3 = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT,
  region: process.env.STORAGE_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  },
  forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
});

const BUCKET = process.env.STORAGE_BUCKET ?? 'helpdesk-attachments';
const db = createDb(process.env.DATABASE_URL!);

export function startInboundProcessor(boss: PgBoss) {
  boss.work<InboundEmailJob>('email:inbound', async (jobs: Job<InboundEmailJob>[]) => {
    const job = jobs[0];
    const { mailboxId, rawMessagePath } = job.data;

    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: rawMessagePath }));
    const raw = Buffer.from(await obj.Body!.transformToByteArray());
    const parsed = await parseEml(raw);

    // Upsert customer
    let [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.email, parsed.fromEmail))
      .limit(1);

    if (!customer) {
      [customer] = await db
        .insert(customers)
        .values({ email: parsed.fromEmail, firstName: parsed.fromName ?? null })
        .returning();
    }

    // Find existing conversation via In-Reply-To
    let conversation = parsed.inReplyTo
      ? await findConversationByMessageId(parsed.inReplyTo, mailboxId)
      : null;

    const body = parsed.html ?? parsed.text ?? '';
    const now = new Date();

    if (!conversation) {
      [conversation] = await db
        .insert(conversations)
        .values({
          subject: parsed.subject,
          status: 'active',
          mailboxId,
          customerId: customer.id,
          customerEmail: parsed.fromEmail,
          preview: body.replace(/<[^>]+>/g, '').slice(0, 255),
          lastReplyAt: now,
          lastReplyFrom: 'customer',
          sourceVia: 'customer',
          sourceType: 'email',
        })
        .returning();
    } else {
      await db
        .update(conversations)
        .set({ status: 'active', lastReplyAt: now, updatedAt: now, lastReplyFrom: 'customer' })
        .where(eq(conversations.id, conversation.id));
    }

    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        type: 'customer',
        body,
        from: parsed.fromEmail,
        authorCustomerId: customer.id,
        emailMessageId: parsed.messageId,
        emailInReplyTo: parsed.inReplyTo,
        first: !parsed.inReplyTo,
        sourceVia: 'customer',
        sourceType: 'email',
      })
      .returning();

    for (const att of parsed.attachments) {
      if (att.disposition !== 'attachment') continue;
      const buf = Buffer.from(att.content as ArrayBuffer);
      const key = `attachments/${conversation.id}/${msg.id}/${att.filename}`;
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: key, Body: buf, ContentType: att.mimeType,
      }));
      await db.insert(attachments).values({
        messageId: msg.id,
        filename: att.filename,
        mimeType: att.mimeType,
        size: buf.byteLength,
        storageKey: key,
      });
    }

    console.log(`[processor] conversation ${conversation.id} — message ${msg.id}`);
  });
}

async function findConversationByMessageId(messageId: string, mailboxId: string) {
  const [msg] = await db
    .select({ conversationId: messages.conversationId })
    .from(messages)
    .where(eq(messages.emailMessageId, messageId))
    .limit(1);

  if (!msg) return null;

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, msg.conversationId), eq(conversations.mailboxId, mailboxId)))
    .limit(1);

  return conv ?? null;
}
