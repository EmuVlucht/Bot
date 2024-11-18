import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

const { Pool } = pg;

async function runMigrations() {
  console.log("[MIGRATE] Starting database migration...");
  
  const poolConfig = {
    connectionString: process.env.DATABASE_URL,
  };
  
  if (process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
  
  const pool = new Pool(poolConfig);
  const db = drizzle({ client: pool });
  
  try {
    await pool.query("SELECT 1");
    console.log("[MIGRATE] Database connection successful");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[MIGRATE] Table auth_sessions ready");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        group_id TEXT NOT NULL UNIQUE,
        group_name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[MIGRATE] Table groups ready");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS checkpoint_data (
        id SERIAL PRIMARY KEY,
        group_id TEXT NOT NULL UNIQUE,
        sw INTEGER DEFAULT 0,
        doc INTEGER DEFAULT 0,
        text_count INTEGER DEFAULT 0,
        audio INTEGER DEFAULT 0,
        sticker INTEGER DEFAULT 0,
        one_time INTEGER DEFAULT 0,
        link INTEGER DEFAULT 0,
        media INTEGER DEFAULT 0,
        null_msg INTEGER DEFAULT 0,
        dll INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[MIGRATE] Table checkpoint_data ready");
    
    try {
      await pool.query(`ALTER TABLE checkpoint_data ADD COLUMN IF NOT EXISTS dll INTEGER DEFAULT 0`);
      console.log("[MIGRATE] Column dll added to checkpoint_data");
    } catch (e) {
      console.log("[MIGRATE] Column dll already exists or error:", e.message);
    }
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS live_messages (
        id SERIAL PRIMARY KEY,
        group_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        start_time TIMESTAMP DEFAULT NOW(),
        end_time TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    console.log("[MIGRATE] Table live_messages ready");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loop_messages (
        id SERIAL PRIMARY KEY,
        chat_id TEXT NOT NULL,
        message TEXT NOT NULL,
        interval_ms INTEGER NOT NULL,
        remaining_count INTEGER NOT NULL DEFAULT 1,
        last_sent TIMESTAMP DEFAULT NOW(),
        next_send TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[MIGRATE] Table loop_messages ready");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_tracking (
        id SERIAL PRIMARY KEY,
        group_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[MIGRATE] Table message_tracking ready");
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_session_id ON auth_sessions(session_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_groups_group_id ON groups(group_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_checkpoint_data_group_id ON checkpoint_data(group_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_live_messages_group_id ON live_messages(group_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loop_messages_chat_id ON loop_messages(chat_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_message_tracking_group_id ON message_tracking(group_id)
    `);
    console.log("[MIGRATE] Indexes created");
    
    console.log("[MIGRATE] All migrations completed successfully!");
    
  } catch (error) {
    console.error("[MIGRATE] Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

export { runMigrations };

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
