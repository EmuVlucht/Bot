import pg from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";
const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined;

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
  };
  if (isProduction || isRailway) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }
} else if (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE) {
  poolConfig = {
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || "5432"),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  };
} else {
  throw new Error(
    "Database configuration not found. Please set DATABASE_URL or PGHOST/PGUSER/PGDATABASE."
  );
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
