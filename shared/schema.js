import { pgTable, text, integer, boolean, timestamp, serial, jsonb } from "drizzle-orm/pg-core";

export const authSessions = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  groupId: text("group_id").notNull().unique(),
  groupName: text("group_name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const checkpointData = pgTable("checkpoint_data", {
  id: serial("id").primaryKey(),
  groupId: text("group_id").notNull().unique(),
  sw: integer("sw").default(0),
  doc: integer("doc").default(0),
  text: integer("text_count").default(0),
  audio: integer("audio").default(0),
  sticker: integer("sticker").default(0),
  oneTime: integer("one_time").default(0),
  link: integer("link").default(0),
  media: integer("media").default(0),
  nullMsg: integer("null_msg").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const liveMessages = pgTable("live_messages", {
  id: serial("id").primaryKey(),
  groupId: text("group_id").notNull(),
  messageId: text("message_id").notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  isActive: boolean("is_active").default(true),
});

export const loopMessages = pgTable("loop_messages", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  message: text("message").notNull(),
  intervalMs: integer("interval_ms").notNull(),
  remainingCount: integer("remaining_count").notNull().default(1),
  lastSent: timestamp("last_sent").defaultNow(),
  nextSend: timestamp("next_send").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messageTracking = pgTable("message_tracking", {
  id: serial("id").primaryKey(),
  groupId: text("group_id").notNull(),
  messageId: text("message_id").notNull(),
  messageType: text("message_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
