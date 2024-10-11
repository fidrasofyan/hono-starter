import type { Kysely } from 'kysely';

// biome-ignore lint/suspicious/noExplicitAny:
export async function up(db: Kysely<any>): Promise<void> {
  // User
  await db.schema
    .createTable('user')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('username', 'varchar(100)', (col) => col.notNull())
    .addColumn('password', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull())
    .addColumn('updated_at', 'timestamptz')
    .execute();
}

// biome-ignore lint/suspicious/noExplicitAny:
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('user').ifExists().execute();
}
