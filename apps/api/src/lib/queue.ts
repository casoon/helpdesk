import { PgBoss } from 'pg-boss';

let _boss: PgBoss | null = null;

export async function getQueue(): Promise<PgBoss> {
  if (!_boss) {
    _boss = new PgBoss({ connectionString: process.env.DATABASE_URL! });
    await _boss.start();
  }
  return _boss;
}
