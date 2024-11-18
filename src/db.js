import pg from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

const isProduction = process.env.NODE_ENV === "production";
const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined;

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

if (isProduction || isRailway) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

export const pool = new Pool(poolConfig);
export const db = drizzlePg({ client: pool, schema });

pool.on("error", (err) => {
  console.error("Database pool error:", err);
});

export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    console.log("Database connected successfully:", result.rows[0].now);
    return true;
  } catch (error) {
    console.error("Database connection failed:", error.message);
    return false;
  }
}
