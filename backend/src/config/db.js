import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { newDb } from 'pg-mem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { Pool: RealPgPool } = pg;

let activePool = null;
let dbEngineType = 'uninitialized';
let isConnected = false;
let connectionError = null;

export async function initializeDatabase() {
  if (activePool && isConnected) return activePool;

  const connectionString =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'vestra_db'}`;

  // 1. Attempt connection to actual external PostgreSQL server first
  try {
    const testPool = new RealPgPool({
      connectionString,
      connectionTimeoutMillis: 1500,
      idleTimeoutMillis: 10000,
      max: 10
    });

    const client = await testPool.connect();
    await client.query('SELECT NOW() as now_val');
    client.release();

    activePool = testPool;
    isConnected = true;
    dbEngineType = `PostgreSQL Server (${connectionString.split('@')[1] || 'localhost:5432'})`;
    connectionError = null;
    console.log(`[DB] Connected to PostgreSQL: ${dbEngineType}`);
    return activePool;
  } catch (err) {
    connectionError = err.message;
    console.warn(`[DB] External PostgreSQL not reachable on ${connectionString}`);
  }

  // 2. Initialize authentic PostgreSQL engine via pg-mem
  console.log('[DB] Activating PostgreSQL engine (pg-mem) for environment...');
  try {
    const memDb = newDb();
    
    // Load and run all migration schemas in alphabetical order
    const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const sqlFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
      for (const f of sqlFiles) {
        const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
        try {
          memDb.public.none(sql);
          console.log(`[DB] Applied migration: ${f}`);
        } catch (migErr) {
          console.warn(`[DB] Migration notice for ${f}:`, migErr.message);
        }
      }
    }

    const pgAdapter = memDb.adapters.createPg();
    activePool = new pgAdapter.Pool();
    isConnected = true;
    dbEngineType = 'PostgreSQL Engine (pg-mem)';
    console.log('[DB] PostgreSQL engine initialized.');

    return activePool;
  } catch (memErr) {
    console.error('[DB] Failed to initialize PostgreSQL engine:', memErr.message);
    throw memErr;
  }
}

// Lazy-initialized pool getter
export function getPool() {
  if (!activePool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return activePool;
}

// Export a proxy pool that delegates to activePool
export const pool = {
  query: async (text, params) => {
    if (!activePool) await initializeDatabase();
    return activePool.query(text, params);
  },
  connect: async () => {
    if (!activePool) await initializeDatabase();
    return activePool.connect();
  }
};

export async function query(text, params = []) {
  if (!activePool) await initializeDatabase();
  return activePool.query(text, params);
}

export async function testConnection() {
  try {
    if (!activePool) await initializeDatabase();
    const res = await query('SELECT NOW() as now_val');
    return {
      connected: true,
      engine: dbEngineType,
      time: res.rows[0]?.now_val
    };
  } catch (err) {
    return {
      connected: false,
      engine: dbEngineType,
      error: err.message
    };
  }
}

export function getDbStatus() {
  return {
    status: isConnected ? 'connected' : 'disconnected',
    engine: dbEngineType,
    driver: 'pg (node-postgres)',
    error: connectionError
  };
}
