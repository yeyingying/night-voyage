import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const chatSessions = sqliteTable("chat_sessions", {
  sessionId: text("session_id").primaryKey(),
  history: text("history").notNull().default("{}"),
  updatedAt: integer("updated_at").notNull(),
});
