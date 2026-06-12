import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth.js';
import { conversationRoutes } from './routes/conversations.js';
import { mailboxRoutes } from './routes/mailboxes.js';
import { customerRoutes } from './routes/customers.js';
import { userRoutes } from './routes/users.js';
import { folderRoutes } from './routes/folders.js';
import { tagRoutes } from './routes/tags.js';
import { searchRoutes } from './routes/search.js';
import { eventRoutes } from './routes/events.js';

const app = new Hono().basePath('/api');

app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const log = {
    ts: new Date().toISOString(),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms,
  };
  console.log(JSON.stringify(log));
});
app.use('*', cors({
  origin: process.env.APP_URL ?? 'http://localhost:4321',
  credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }));

app.route('/auth', authRoutes);
app.route('/conversations', conversationRoutes);
app.route('/mailboxes', mailboxRoutes);
app.route('/customers', customerRoutes);
app.route('/users', userRoutes);
app.route('/folders', folderRoutes);
app.route('/tags', tagRoutes);
app.route('/search', searchRoutes);
app.route('/events', eventRoutes);

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on :${port}`);
});
