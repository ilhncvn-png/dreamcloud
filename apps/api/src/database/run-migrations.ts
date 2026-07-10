/**
 * Standalone migration runner for Railway / production deployments.
 *
 * Executed by the Dockerfile before `node dist/main`.
 * Does NOT use ts-node — runs from compiled dist/database/run-migrations.js.
 * Exits 0 on success (no pending or all applied), exits 1 on any failure.
 */
import AppDataSource from './data-source';

async function run(): Promise<void> {
  console.log('[migrations] Initializing database connection...');
  await AppDataSource.initialize();

  const hasPending = await AppDataSource.showMigrations();

  if (hasPending) {
    console.log('[migrations] Pending migrations found — running...');
    const applied = await AppDataSource.runMigrations({ transaction: 'all' });
    console.log(`[migrations] ${applied.length} migration(s) applied successfully.`);
  } else {
    console.log('[migrations] Database is up to date. No migrations to run.');
  }

  await AppDataSource.destroy();
}

run().catch((err: Error) => {
  console.error('[migrations] FATAL: migration failed —', err.message);
  process.exit(1);
});
