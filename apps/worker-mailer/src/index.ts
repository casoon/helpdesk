import { PgBoss, type Job } from 'pg-boss';
import type { OutboundEmailJob } from '@casoon/helpdesk-types';
import { sendEmail } from './sender.js';
import { createDb } from '@casoon/helpdesk-db';
import { sendLogs } from '@casoon/helpdesk-db/schema';
import { eq } from 'drizzle-orm';

const db = createDb(process.env.DATABASE_URL!);

async function run() {
  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL! });
  await boss.start();
  console.log('Mailer worker started');

  const shutdown = async (signal: string) => {
    console.log(`[mailer] received ${signal}, shutting down…`);
    await boss.stop();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  boss.work<OutboundEmailJob>('email:outbound', async (jobs: Job<OutboundEmailJob>[]) => {
    const job = jobs[0];
    const { messageId, to, subject, html, mailboxId, inReplyTo } = job.data;

    try {
      await sendEmail({ mailboxId, to, subject, html, inReplyTo });

      await db
        .update(sendLogs)
        .set({ status: 'delivery_success', sentAt: new Date() })
        .where(eq(sendLogs.messageId, messageId));
    } catch (err) {
      await db
        .update(sendLogs)
        .set({ status: 'send_error', statusMessage: String(err) })
        .where(eq(sendLogs.messageId, messageId));
      throw err; // pg-boss will retry
    }
  });
}

run().catch((err) => {
  console.error('Fatal mailer worker error:', err);
  process.exit(1);
});
