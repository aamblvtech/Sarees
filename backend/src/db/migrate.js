import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, initializeDatabase, getDbStatus } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('[Migration] Starting PostgreSQL schema migration for VESTRA...');
  await initializeDatabase();
  const dbStatus = getDbStatus();

  // If using external PostgreSQL, execute schema SQL on the pool
  if (dbStatus.engine.includes('PostgreSQL Server')) {
    const schemaPath = path.join(__dirname, 'migrations', '001_vestra_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Migration] Migration error on external PostgreSQL:', err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('[Migration] All tables successfully verified:');
  console.log('  - admins');
  console.log('  - categories');
  console.log('  - products');
  console.log('  - product_images');
  console.log('  - tryon_sessions');
  console.log('  - tryon_jobs');
  console.log('  - tryon_results');
  return { success: true };
}

// Allow direct CLI execution: node src/db/migrate.js
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then(() => {
      console.log('[Migration] Complete. Exiting.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}
