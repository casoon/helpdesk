import { createServer } from 'node:http';
import { PgBoss } from 'pg-boss';
import { createDb } from '@casoon/helpdesk-db';
import { mailboxes } from '@casoon/helpdesk-db/schema';
import { startIdleWatcher } from './poller.js';
import { startInboundProcessor } from './processor.js';

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

  const abortController = new AbortController();

  const shutdown = async (signal: string) => {
    console.log(`[imap] received ${signal}, shutting down…`);
    abortController.abort();
    await boss.stop();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  const db = createDb(process.env.DATABASE_URL!);

  // Start IDLE watcher per mailbox; poll DB every 5 min to pick up newly added mailboxes
  async function startWatchers() {
    const running = new Map<string, boolean>();

    while (!abortController.signal.aborted) {
      const boxes = await db.select().from(mailboxes);
      for (const box of boxes) {
        if (!box.inServer || !box.inUsername || !box.inPasswordEncrypted) continue;
        if (running.get(box.id)) continue;

        running.set(box.id, true);
        startIdleWatcher(boss, box, abortController.signal)
          .finally(() => running.delete(box.id));
      }
      // Check for new mailboxes every 5 minutes
      await new Promise((r) => setTimeout(r, 5 * 60_000));
    }
  }

  startWatchers().catch((err) => console.error('[imap] watcher manager error:', err));
}

run().catch((err) => {
  console.error('Fatal IMAP worker error:', err);
  process.exit(1);
});
