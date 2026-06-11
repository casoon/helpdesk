import { Hono } from 'hono';
import { createDb } from '@casoon/helpdesk-db';
import { folders, conversations } from '@casoon/helpdesk-db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

export const folderRoutes = new Hono();
folderRoutes.use('*', requireAuth);

const db = createDb(process.env.DATABASE_URL!);

// Returns all folders for the current user across all mailboxes.
// Personal folders (mine, starred) are scoped to the current user.
folderRoutes.get('/', async (c) => {
  const { id: userId } = c.get('user');

  const rows = await db
    .select()
    .from(folders)
    .where(
      // shared folders (userId IS NULL) OR personal folders for this user
      eq(folders.userId, userId),
    );

  // Also get shared folders
  const shared = await db
    .select()
    .from(folders)
    .where(isNull(folders.userId));

  return c.json({ data: [...shared, ...rows] });
});
