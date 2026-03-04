import { db } from "./db";
import { incidents, type Incident, type InsertIncident } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getIncidents(): Promise<Incident[]>;
  upsertIncident(incident: InsertIncident): Promise<Incident>;
  getIncidentByNo(incidentNo: string): Promise<Incident | undefined>;
  updateIncident(id: number, updates: Partial<Incident>): Promise<Incident>;
}

export class DatabaseStorage implements IStorage {
  async getIncidents(): Promise<Incident[]> {
    return await db.select().from(incidents).orderBy(desc(incidents.time));
  }

  async getIncidentByNo(incidentNo: string): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.incidentNo, incidentNo));
    return incident;
  }

  async updateIncident(id: number, updates: Partial<Incident>): Promise<Incident> {
    const [updated] = await db.update(incidents)
      .set(updates)
      .where(eq(incidents.id, id))
      .returning();
    return updated;
  }

  async upsertIncident(incident: InsertIncident): Promise<Incident> {
    const existing = await this.getIncidentByNo(incident.incidentNo);
    if (existing) {
      const [updated] = await db.update(incidents)
        .set({ ...incident, lastUpdated: new Date() })
        .where(eq(incidents.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(incidents).values(incident).returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();