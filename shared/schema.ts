import { pgTable, text, serial, timestamp, boolean, jsonb, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  agency: text("agency").notNull(),
  incidentNo: text("incident_no").notNull().unique(),
  callType: text("call_type").notNull(),
  callTypeFamily: text("call_type_family"),
  time: timestamp("time").notNull(),
  location: text("location").notNull(),
  crossStreets: text("cross_streets"),
  neighborhood: text("neighborhood"),
  status: text("status"),
  units: jsonb("units").$type<string[]>(),
  isMajor: boolean("is_major").default(false),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  acknowledged: boolean("acknowledged").default(false),
  active: boolean("active").default(true),
  hasHistory: boolean("has_history").default(false),
  clearedByAdmin: boolean("cleared_by_admin").default(false),
});

export const incidentHistory = pgTable("incident_history", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  source: text("source").notNull(),
  summary: text("summary").notNull(),
  changes: jsonb("changes").$type<Array<{ field: string; oldValue: string; newValue: string }>>().default([]),
});

export const adminCards = pgTable("admin_cards", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("text"),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  url: text("url"),
  color: text("color").notNull().default("blue"),
  pinned: boolean("pinned").default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  pollId: integer("poll_id"),
  isKeyLocked: boolean("is_key_locked").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pollVotes = pgTable("poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  option: text("option").notNull(),
  voterToken: text("voter_token").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true });
export const insertIncidentHistorySchema = createInsertSchema(incidentHistory).omit({ id: true });
export const insertAdminCardSchema = createInsertSchema(adminCards).omit({ id: true, createdAt: true });
export const insertPollSchema = createInsertSchema(polls).omit({ id: true, createdAt: true });

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type InsertIncidentHistory = z.infer<typeof insertIncidentHistorySchema>;
export type InsertAdminCard = z.infer<typeof insertAdminCardSchema>;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type Incident = typeof incidents.$inferSelect;
export type IncidentHistory = typeof incidentHistory.$inferSelect;
export type AdminCard = typeof adminCards.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type PollVote = typeof pollVotes.$inferSelect;

export const dailyStats = pgTable("daily_stats", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  agency: text("agency").notNull(),
  category: text("category").notNull(),
  count: integer("count").notNull().default(0),
});

export type DailyStat = typeof dailyStats.$inferSelect;

export const unitNotes = pgTable("unit_notes", {
  id: serial("id").primaryKey(),
  unitId: text("unit_id").notNull().unique(),
  content: text("content").notNull().default(""),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const authKeys = pgTable("auth_keys", {
  id: serial("id").primaryKey(),
  pin: text("pin").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUnitNoteSchema = createInsertSchema(unitNotes).omit({ id: true, lastUpdated: true });
export const insertAuthKeySchema = createInsertSchema(authKeys).omit({ id: true, createdAt: true });

export type UnitNote = typeof unitNotes.$inferSelect;
export type AuthKey = typeof authKeys.$inferSelect;
export type InsertUnitNote = z.infer<typeof insertUnitNoteSchema>;
export type InsertAuthKey = z.infer<typeof insertAuthKeySchema>;
