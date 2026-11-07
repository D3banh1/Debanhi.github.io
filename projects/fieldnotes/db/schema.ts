import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', { userId: text('user_id').primaryKey(), data: text('data').notNull(), version: integer('version').notNull().default(0), updatedAt: text('updated_at').notNull() });
export const events = sqliteTable('events', { id: text('id').primaryKey(), userId: text('user_id').notNull(), name: text('name').notNull(), entityId: text('entity_id'), createdAt: text('created_at').notNull() }, t => [index('events_user_time').on(t.userId, t.createdAt)]);
