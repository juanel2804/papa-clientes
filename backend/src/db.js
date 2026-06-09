export const hasDatabase = Boolean(process.env.DATABASE_URL);

let poolInstance = null;

async function getPool() {
  if (!hasDatabase) return null;
  if (!poolInstance) {
    const pg = await import("pg");
    const { Pool } = pg.default;
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    });
  }
  return poolInstance;
}

export const pool = {
  async connect() {
    const activePool = await getPool();
    if (!activePool) throw new Error("DATABASE_URL no esta configurada.");
    return activePool.connect();
  },
};

export async function query(text, params = []) {
  const activePool = await getPool();
  if (!activePool) throw new Error("DATABASE_URL no esta configurada.");
  const result = await activePool.query(text, params);
  return result;
}

export async function closeDb() {
  if (poolInstance) await poolInstance.end();
}
