/**
 * One-time script to grant super_admin role to the primary admin account.
 * Run once:  ts-node src/database/scripts/set-admin.ts
 */
import 'reflect-metadata';
import dataSource from '../data-source';

const TARGET_EMAIL = 'ilhncvn@gmail.com';

async function main() {
  await dataSource.initialize();
  const result = await dataSource.query<{ id: string; role: string }[]>(
    `SELECT id, role FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [TARGET_EMAIL],
  );
  if (!result.length) {
    console.error(`User not found: ${TARGET_EMAIL}. Register first then run this script.`);
    process.exit(1);
  }
  await dataSource.query(
    `UPDATE users SET role = 'super_admin' WHERE email = $1`,
    [TARGET_EMAIL],
  );
  console.log(`✓  ${TARGET_EMAIL}  →  super_admin`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
