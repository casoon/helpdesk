import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { createDb } from '@casoon/helpdesk-db';
import { users } from '@casoon/helpdesk-db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

export const userRoutes = new Hono();
userRoutes.use('*', requireAuth);

const db = createDb(process.env.DATABASE_URL!);

const adminOnly = async (c: any, next: any) => {
  if (c.get('user').role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  await next();
};

const USER_SELECT = {
  id: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  role: users.role,
  status: users.status,
  avatarUrl: users.avatarUrl,
  jobTitle: users.jobTitle,
  createdAt: users.createdAt,
};

userRoutes.get('/', adminOnly, async (c) => {
  const rows = await db.select(USER_SELECT).from(users);
  return c.json({ data: rows });
});

userRoutes.post('/', adminOnly, async (c) => {
  const body = await c.req.json<{
    email: string;
    firstName: string;
    lastName?: string;
    password: string;
    role?: 'admin' | 'agent';
  }>();
  const passwordHash = await bcrypt.hash(body.password, 12);
  const [user] = await db
    .insert(users)
    .values({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName ?? '',
      passwordHash,
      role: body.role ?? 'agent',
    })
    .returning(USER_SELECT);
  return c.json({ user }, 201);
});

userRoutes.patch('/:id', adminOnly, async (c) => {
  const body = await c.req.json<{
    firstName?: string;
    lastName?: string;
    role?: 'admin' | 'agent';
    password?: string;
    status?: 'active' | 'disabled';
  }>();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.firstName !== undefined) updates.firstName = body.firstName;
  if (body.lastName !== undefined) updates.lastName = body.lastName;
  if (body.role) updates.role = body.role;
  if (body.status) updates.status = body.status;
  if (body.password) updates.passwordHash = await bcrypt.hash(body.password, 12);

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, c.req.param('id')))
    .returning(USER_SELECT);

  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json({ user: updated });
});

userRoutes.delete('/:id', adminOnly, async (c) => {
  const { id } = c.get('user');
  if (c.req.param('id') === id) return c.json({ error: 'Cannot delete yourself' }, 400);
  // Soft-delete: set status to deleted
  await db
    .update(users)
    .set({ status: 'deleted', updatedAt: new Date() })
    .where(eq(users.id, c.req.param('id')));
  return c.json({ ok: true });
});
