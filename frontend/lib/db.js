import pg from "pg";

// Return DATE columns as plain "YYYY-MM-DD" strings (no time-zone shifts).
pg.types.setTypeParser(1082, (value) => value);

// One pool per server instance (reused across hot reloads in development).
const globalForPool = globalThis;
export const pool = globalForPool.__mnePool ??= new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10_000,
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
