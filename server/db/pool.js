import pg from 'pg';
import dotenv from 'dotenv';
import { mockStore } from './mockStore.js';

dotenv.config();

const { Pool } = pg;

let pool = null;
let isConnectedToPostgres = false;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('supabase')
        ? { rejectUnauthorized: false }
        : false
    });

    pool.on('connect', () => {
      isConnectedToPostgres = true;
      console.log('✅ Connected to PostgreSQL / Supabase instance successfully.');
    });

    pool.on('error', (err) => {
      console.error('⚠️ PostgreSQL pool error, falling back to embedded resilient store:', err.message);
      isConnectedToPostgres = false;
    });
  } catch (err) {
    console.warn('⚠️ Could not initialize PG pool, using embedded store:', err.message);
  }
} else {
  console.log('ℹ️ No DATABASE_URL provided. Running with integrated high-fidelity CoalGuard state engine.');
}

export { pool, isConnectedToPostgres, mockStore };
