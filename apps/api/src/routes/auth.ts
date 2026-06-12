import { Hono } from 'hono';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { createDb } from '@casoon/helpdesk-db';
import { users } from '@casoon/helpdesk-db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

export const authRoutes = new Hono();

// Simple in-memory rate limiter: max 10 login attempts per IP per minute
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

// In-memory reset token store: token → { userId, expiresAt }
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

const db = createDb(process.env.DATABASE_URL!);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret');

authRoutes.post('/login', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return c.json({ error: 'Too many login attempts. Try again in a minute.' }, 429);
  }

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

authRoutes.post('/forgot-password', async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  // Always return 200 to avoid email enumeration
  if (!user) return c.json({ ok: true });

  const token = randomUUID();
  resetTokens.set(token, { userId: user.id, expiresAt: Date.now() + 3600_000 }); // 1h expiry

  // In production this would send an email. Log it for now.
  console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'password_reset_token', email, token }));

  return c.json({ ok: true });
});

authRoutes.patch('/reset-password', async (c) => {
  const { token, password } = await c.req.json<{ token: string; password: string }>();

  const entry = resetTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    return c.json({ error: 'Invalid or expired reset token' }, 400);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, entry.userId));

  resetTokens.delete(token);
  return c.json({ ok: true });
});
