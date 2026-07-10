/**
 * DreamCloud Seed Reset Script
 *
 * Deletes ALL data created by the seed engine.
 * Identified by email suffix @seed.dreamcloud.app and dream tag dc-seed-v1.
 *
 * Run: cd apps/api && npm run seed:reset
 *
 * Safe: does not touch real users, admin accounts, or non-seed data.
 * CASCADE: deleting seed users auto-cascades likes, comments, follows, matches, etc.
 */

import 'reflect-metadata';
import type { DataSource } from 'typeorm';
import AppDataSource from '../../config/database.config';

if (process.env['NODE_ENV'] === 'production') {
  console.error('❌  Reset script is disabled in production.');
  process.exit(1);
}

const SEED_EMAIL_SUFFIX = '@seed.dreamcloud.app';
const SEED_TAG          = 'dc-seed-v1';

async function reset(db: DataSource): Promise<void> {
  console.log('\n🗑   DreamCloud Seed Reset\n');

  // Count before
  const [{ count: usersBefore }] = await db.query<[{ count: string }]>(
    `SELECT COUNT(*) AS count FROM users WHERE email LIKE '%${SEED_EMAIL_SUFFIX}'`,
  );
  const [{ count: dreamsBefore }] = await db.query<[{ count: string }]>(
    `SELECT COUNT(*) AS count FROM dreams WHERE '${SEED_TAG}' = ANY(tags) AND deleted_at IS NULL`,
  );

  if (Number(usersBefore) === 0 && Number(dreamsBefore) === 0) {
    console.log('ℹ️   No seed data found. Nothing to reset.\n');
    return;
  }

  console.log(`   Found: ${usersBefore} seed users, ${dreamsBefore} seed dreams`);
  console.log('   Deleting…\n');

  // seen_in_dreams has no FK to users — clear computed patterns separately
  await db.query(`DELETE FROM seen_in_dreams`);
  console.log('   ✓ seen_in_dreams cleared');

  // user_resonance_scores for seed users
  await db.query(
    `DELETE FROM user_resonance_scores WHERE user_id IN (
       SELECT id FROM users WHERE email LIKE '%${SEED_EMAIL_SUFFIX}'
     )`,
  );
  console.log('   ✓ user_resonance_scores cleared');

  // dream_connections for seed users
  await db.query(
    `DELETE FROM dream_connections WHERE user_id_a IN (
       SELECT id FROM users WHERE email LIKE '%${SEED_EMAIL_SUFFIX}'
     ) OR user_id_b IN (
       SELECT id FROM users WHERE email LIKE '%${SEED_EMAIL_SUFFIX}'
     )`,
  );
  console.log('   ✓ dream_connections cleared');

  // Deleting seed users cascades: dreams, likes, comments, follows, matches, analyses, etc.
  const result = await db.query<[{ count: string }]>(
    `WITH deleted AS (
       DELETE FROM users WHERE email LIKE '%${SEED_EMAIL_SUFFIX}' RETURNING id
     )
     SELECT COUNT(*) AS count FROM deleted`,
  );
  console.log(`   ✓ ${result[0]?.count ?? 0} seed users deleted (cascade)`);

  // Final check
  const [{ count: remaining }] = await db.query<[{ count: string }]>(
    `SELECT COUNT(*) AS count FROM users WHERE email LIKE '%${SEED_EMAIL_SUFFIX}'`,
  );
  const [{ count: dreamsRemaining }] = await db.query<[{ count: string }]>(
    `SELECT COUNT(*) AS count FROM dreams WHERE '${SEED_TAG}' = ANY(tags) AND deleted_at IS NULL`,
  );

  console.log(`\n✅  Reset complete`);
  console.log(`   Seed users remaining:  ${remaining}`);
  console.log(`   Seed dreams remaining: ${dreamsRemaining}\n`);
}

(async () => {
  let ds: DataSource | null = null;
  try {
    ds = await AppDataSource.initialize();
    await reset(ds);
  } catch (err) {
    console.error('\n❌  Reset failed:', err);
    process.exit(1);
  } finally {
    if (ds?.isInitialized) await ds.destroy();
  }
})();
