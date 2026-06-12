import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql);

console.log('Running database migrations…');
await migrate(db, { migrationsFolder: '../../packages/db/migrations' });
console.log('Migrations complete.');
await sql.end();
