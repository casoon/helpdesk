import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth.js';
import { conversationRoutes } from './routes/conversations.js';
import { mailboxRoutes } from './routes/mailboxes.js';
import { customerRoutes } from './routes/customers.js';
import { userRoutes } from './routes/users.js';
import { folderRoutes } from './routes/folders.js';

const app = new Hono().basePath('/api');

app.use('*', logger());
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

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on :${port}`);
});
