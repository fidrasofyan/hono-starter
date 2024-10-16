import config from '@/config';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import type { DB } from './types';

const pool = new Pool({
  host: config.DATABASE_HOST,
  port: config.DATABASE_PORT,
  database: config.DATABASE_NAME,
  user: config.DATABASE_USER,
  password: config.DATABASE_PASSWORD,
  max: config.DATABASE_CONNECTION_LIMIT,
});

pool.on('connect', async (client) => {
  await client.query(
    `SET TIME ZONE '${config.APP_TIMEZONE}'`,
  );
});

export const kysely = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool,
  }),
});

// Test connection
await sql`SELECT 1`.execute(kysely);
// biome-ignore lint/suspicious/noConsole: <explanation>
console.log(
  `${config.APP_NAME} # database connection has been established successfully`,
);
