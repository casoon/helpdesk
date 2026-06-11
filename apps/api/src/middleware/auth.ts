import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret');

export type AuthUser = {
  id: string;
  email: string;
  role: 'admin' | 'agent';
};

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
    ?? getCookie(c.req.raw);

  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    c.set('user', payload as AuthUser);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

function getCookie(req: Request): string | undefined {
  const header = req.headers.get('cookie') ?? '';
  const match = header.match(/(?:^|;\s*)token=([^;]*)/);
  return match?.[1];
}
