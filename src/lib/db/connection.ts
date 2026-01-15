import { Pool } from 'pg';

const DB_CONFIG = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || 'postgres_db',
  user: process.env.POSTGRES_USER || 'postgres_user',
  password: process.env.POSTGRES_PASSWORD || 'postgres_pass',
};

export const pool = new Pool(DB_CONFIG);

export const initDbConnection = async () => {
  try {
    const client = await pool.connect();
    client.release();

    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    throw error;
  }
};

export async function closeDbConnection() {
  try {
    await pool.end();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Failed to close the database connection:', error);
    throw error;
  }
}
