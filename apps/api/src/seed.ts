/**
 * Creates the initial admin user if no users exist.
 * Usage: tsx src/seed.ts
 * Env:   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, DATABASE_URL
 */
import bcrypt from 'bcryptjs';
import { createDb } from '@casoon/helpdesk-db';
import { users } from '@casoon/helpdesk-db/schema';

const db = createDb(process.env.DATABASE_URL!);

const [existing] = await db.select({ id: users.id }).from(users).limit(1);
if (existing) {
  console.log('Database already has users — skipping seed.');
  process.exit(0);
}

const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const password = process.env.SEED_ADMIN_PASSWORD ?? 'changeme';
const passwordHash = await bcrypt.hash(password, 12);

await db.insert(users).values({ email, firstName: 'Admin', lastName: '', passwordHash, role: 'admin' });
console.log(`Admin user created: ${email}`);
console.log('Change the password immediately after first login.');
