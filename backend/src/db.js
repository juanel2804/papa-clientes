import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL no esta configurada. La API no podra conectar a Postgres.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

export async function closeDb() {
  await pool.end();
}
