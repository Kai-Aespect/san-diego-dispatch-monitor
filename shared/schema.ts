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
});

export const incidentHistory = pgTable("incident_history", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  source: text("source").notNull(),
  summary: text("summary").notNull(),
  changes: jsonb("changes").$type<Array<{ field: string; oldValue: string; newValue: string }>>().default([]),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true });
export const insertIncidentHistorySchema = createInsertSchema(incidentHistory).omit({ id: true });

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type InsertIncidentHistory = z.infer<typeof insertIncidentHistorySchema>;
export type Incident = typeof incidents.$inferSelect;
export type IncidentHistory = typeof incidentHistory.$inferSelect;

export type CreateIncidentRequest = InsertIncident;
export type UpdateIncidentRequest = Partial<InsertIncident>;
export type IncidentResponse = Incident;
