import { ImapFlow } from 'imapflow';
import { PgBoss } from 'pg-boss';
import PostalMime from 'postal-mime';
import sanitizeHtml from 'sanitize-html';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createDb, decrypt } from '@casoon/helpdesk-db';
import { mailboxes } from '@casoon/helpdesk-db/schema';
import { eq } from 'drizzle-orm';
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

type MailboxRow = typeof mailboxes.$inferSelect;

// Shared helper: fetch new messages since last known UID, enqueue jobs, update DB
async function fetchNewMessages(boss: PgBoss, client: ImapFlow, box: MailboxRow): Promise<void> {
  const since = box.imapLastUid ?? 1;
  const newUids: number[] = [];

  for await (const msg of client.fetch(`${since}:*`, { uid: true, source: true })) {
    if (msg.uid < since) continue;
    newUids.push(msg.uid);

    const rawKey = `raw/${box.id}/${msg.uid}.eml`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: rawKey,
      Body: msg.source,
      ContentType: 'message/rfc822',
    }));

    await boss.send('email:inbound', {
      mailboxId: box.id,
      rawMessagePath: rawKey,
      uid: msg.uid,
    }, { retryLimit: 3, retryDelay: 5, retryBackoff: true });
  }

  if (newUids.length > 0) {
    const maxUid = Math.max(...newUids);
    await db.update(mailboxes).set({ imapLastUid: maxUid + 1 }).where(eq(mailboxes.id, box.id));
    // Refresh the in-memory box reference for next fetch
    box.imapLastUid = maxUid + 1;
    console.log(`[imap] ${box.email}: queued ${newUids.length} messages (IDLE)`);
  }
}

export async function pollMailbox(boss: PgBoss, box: MailboxRow) {
  const password = decrypt(box.inPasswordEncrypted!);

  const client = new ImapFlow({
    host: box.inServer!,
    port: box.inPort ?? 993,
    secure: box.inEncryption === 'ssl',
    auth: { user: box.inUsername!, pass: password },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');

  try {
    await fetchNewMessages(boss, client, box);
  } finally {
    lock.release();
    await client.logout();
  }
}

export async function startIdleWatcher(boss: PgBoss, box: MailboxRow, signal: AbortSignal): Promise<void> {
  while (!signal.aborted) {
    let client: ImapFlow | null = null;
    try {
      const password = decrypt(box.inPasswordEncrypted!);
      client = new ImapFlow({
        host: box.inServer!,
        port: box.inPort ?? 993,
        secure: box.inEncryption === 'ssl',
        auth: { user: box.inUsername!, pass: password },
        logger: false,
      });

      await client.connect();

      // Refresh mailbox state from DB before fetching
      const [freshBox] = await db.select().from(mailboxes).where(eq(mailboxes.id, box.id)).limit(1);
      if (freshBox) Object.assign(box, freshBox);

      const lock = await client.getMailboxLock('INBOX');
      try {
        // Initial catch-up fetch
        await fetchNewMessages(boss, client, box);

        // IDLE loop: wait for server notification, then fetch
        while (!signal.aborted) {
          await client.idle();
          await fetchNewMessages(boss, client, box);
        }
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (err) {
      if (client) {
        try { await client.logout(); } catch { /* ignore */ }
      }
      if (signal.aborted) break;
      console.error(`[imap] ${box.email} IDLE error, reconnecting in 30s:`, err);
      await new Promise((r) => setTimeout(r, 30_000));
    }
  }
  console.log(`[imap] ${box.email} IDLE watcher stopped`);
}

// ─── Email parsing ────────────────────────────────────────────────────────────

export async function parseEml(raw: Buffer) {
  const parser = new PostalMime();
  const email = await parser.parse(raw);

  const html = email.html ? sanitizeHtml(email.html, SANITIZE_OPTIONS) : null;

  return {
    subject: email.subject ?? '(no subject)',
    fromEmail: email.from?.address ?? '',
    fromName: email.from?.name ?? null,
    messageId: email.messageId ?? null,
    inReplyTo: email.inReplyTo ?? null,
    html,
    text: email.text ?? null,
    attachments: (email.attachments ?? []).map((a) => ({
      filename: a.filename ?? 'attachment',
      mimeType: a.mimeType,
      content: a.content,
      disposition: a.disposition ?? 'attachment',
    })),
  };
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'del',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target'],
    span: ['style'], div: ['style'], p: ['style'],
    td: ['colspan', 'rowspan', 'style'],
    th: ['colspan', 'rowspan', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href'],
};
