import { Hono } from 'hono';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { createDb } from '@casoon/helpdesk-db';
import { users } from '@casoon/helpdesk-db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

export const authRoutes = new Hono();

const db = createDb(process.env.DATABASE_URL!);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret');

authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || user.status !== 'active') return c.json({ error: 'Invalid credentials' }, 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401);

  const token = await new SignJWT({ id: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  });
});

authRoutes.get('/me', requireAuth, async (c) => {
  const { id } = c.get('user');
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) return c.json({ error: 'Not found' }, 404);
  return c.json({ user });
});

authRoutes.post('/logout', (c) => c.json({ ok: true }));
