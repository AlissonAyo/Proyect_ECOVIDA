import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// SSL condicional: solo se activa con DB_SSL=true (Render lo requiere).
// rejectUnauthorized: false desactiva la validación estricta del certificado
// (trade-off consciente: Render usa certificados internos de su proxy).
const useSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const query = (text, params) => pool.query(text, params);

export async function verifyDb() {
  await pool.query('SELECT 1');
}

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});
