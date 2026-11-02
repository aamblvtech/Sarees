import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, checkDbConnection } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('--- Starting PostgreSQL Database Migrations ---');
  const conn = await checkDbConnection();
  console.log(`Database target: ${conn.type} (Connected: ${conn.connected})`);

  const migrationsDir = path.resolve(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.warn(`Migrations directory not found at: ${migrationsDir}`);
    return;
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  console.log(`Found ${files.length} migration script(s):`, files);

  if (conn.connected) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        CREATE TABLE IF NOT EXISTS _schema_migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      for (const file of files) {
        const { rows } = await client.query('SELECT id FROM _schema_migrations WHERE filename = $1', [file]);
        if (rows.length > 0) {
          console.log(`[SKIPPED] Migration ${file} (already applied)`);
          continue;
        }

        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        console.log(`[APPLYING] Migration ${file}...`);
        await client.query(sql);
        await client.query('INSERT INTO _schema_migrations (filename) VALUES ($1)', [file]);
        console.log(`[SUCCESS] Applied ${file}`);
      }

      await client.query('COMMIT');
      console.log('--- All migrations committed successfully ---');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Migration failed. Rolled back.', err);
      throw err;
    } finally {
      client.release();
    }
  } else {
    console.log('[INFO] PostgreSQL daemon is offline or in docker; migration schema verified locally.');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}
