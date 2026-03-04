import { pgTable, text, serial, timestamp, boolean, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  agency: text("agency").notNull(), // 'fire' or 'police'
  incidentNo: text("incident_no").notNull().unique(), // Unique identifier from source or hash
  callType: text("call_type").notNull(),
  callTypeFamily: text("call_type_family"), // 'Medical', 'Fire', 'Rescue', 'Traffic', 'Other'
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
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true });
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

export type CreateIncidentRequest = InsertIncident;
export type UpdateIncidentRequest = Partial<InsertIncident>;

export type IncidentResponse = Incident;
