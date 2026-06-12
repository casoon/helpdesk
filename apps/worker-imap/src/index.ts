import { createServer } from 'node:http';
import { PgBoss } from 'pg-boss';
import { createDb } from '@casoon/helpdesk-db';
import { mailboxes } from '@casoon/helpdesk-db/schema';
import { pollMailbox } from './poller.js';
import { startInboundProcessor } from './processor.js';

const POLL_INTERVAL_MS = 60_000;

async function run() {
  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL! });
  await boss.start();
  console.log('IMAP worker started');

  // Start consuming inbound jobs
  startInboundProcessor(boss);

  const healthServer = createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'worker-imap' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  healthServer.listen(3001, () => console.log('[imap] health check on :3001'));

  const shutdown = async (signal: string) => {
    console.log(`[imap] received ${signal}, shutting down…`);
    await boss.stop();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  const db = createDb(process.env.DATABASE_URL!);

  while (true) {
    const boxes = await db.select().from(mailboxes);
    for (const box of boxes) {
      if (!box.inServer || !box.inUsername) continue;
      pollMailbox(boss, box).catch((err) =>
        console.error(`[imap] mailbox ${box.email} error:`, err),
      );
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

run().catch((err) => {
  console.error('Fatal IMAP worker error:', err);
  process.exit(1);
});
