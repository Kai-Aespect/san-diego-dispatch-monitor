import { db } from "./db";
import { incidents, incidentHistory, type Incident, type InsertIncident, type IncidentHistory } from "@shared/schema";
import { eq, desc, and, notInArray, inArray, sql } from "drizzle-orm";

export interface IStorage {
  getIncidents(): Promise<Incident[]>;
  upsertIncident(incident: InsertIncident): Promise<Incident>;
  getIncidentByNo(incidentNo: string): Promise<Incident | undefined>;
  updateIncident(id: number, updates: Partial<Incident>): Promise<Incident>;
  acknowledgeAll(): Promise<void>;
  getIncidentHistory(incidentId: number): Promise<IncidentHistory[]>;
  markMissingAsInactive(activeIds: Set<string>): Promise<void>;
}

const TRACKED_FIELDS: Array<keyof InsertIncident> = ['units', 'status', 'callType', 'isMajor', 'location'];

function stringify(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

export class DatabaseStorage implements IStorage {
  async getIncidents(): Promise<Incident[]> {
    return await db.select().from(incidents).orderBy(desc(incidents.time));
  }

  async getIncidentByNo(incidentNo: string): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.incidentNo, incidentNo));
    return incident;
  }

  async getIncidentHistory(incidentId: number): Promise<IncidentHistory[]> {
    return await db.select().from(incidentHistory)
      .where(eq(incidentHistory.incidentId, incidentId))
      .orderBy(desc(incidentHistory.changedAt));
  }

  async updateIncident(id: number, updates: Partial<Incident>): Promise<Incident> {
    const [existing] = await db.select().from(incidents).where(eq(incidents.id, id));
    const [updated] = await db.update(incidents)
      .set(updates)
      .where(eq(incidents.id, id))
      .returning();

    if (existing) {
      const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
      for (const key of Object.keys(updates) as Array<keyof typeof updates>) {
        const oldVal = stringify(existing[key]);
        const newVal = stringify(updates[key]);
        if (oldVal !== newVal && key !== 'lastUpdated') {
          changes.push({ field: key, oldValue: oldVal, newValue: newVal });
        }
      }
      if (changes.length > 0) {
        const summary = `User updated: ${changes.map(c => c.field).join(', ')}`;
        await db.insert(incidentHistory).values({
          incidentId: id,
          source: 'user',
          summary,
          changes,
        });
      }
    }

    return updated;
  }

  async acknowledgeAll(): Promise<void> {
    await db.update(incidents)
      .set({ acknowledged: true })
      .where(eq(incidents.acknowledged, false));
  }

  async markMissingAsInactive(activeIds: Set<string>): Promise<void> {
    const ids = Array.from(activeIds);
    if (ids.length === 0) return;
    
    // Mark everything not in the list as inactive
    await db.update(incidents)
      .set({ active: false })
      .where(and(eq(incidents.active, true), notInArray(incidents.incidentNo, ids)));
      
    // Re-activate everything currently in the list
    await db.update(incidents)
      .set({ active: true })
      .where(inArray(incidents.incidentNo, ids));
  }

  async upsertIncident(incident: InsertIncident): Promise<Incident> {
    const existing = await this.getIncidentByNo(incident.incidentNo);
    if (existing) {
      const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
      for (const field of TRACKED_FIELDS) {
        const oldVal = stringify(existing[field]);
        const newVal = stringify(incident[field]);
        if (oldVal !== newVal) {
          changes.push({ field, oldValue: oldVal, newValue: newVal });
        }
      }

      const updateData: Partial<InsertIncident> = {
        ...incident,
        lastUpdated: new Date(),
        notes: existing.notes,
        tags: existing.tags,
        acknowledged: existing.acknowledged,
        lat: incident.lat ?? existing.lat,
        lng: incident.lng ?? existing.lng,
        active: true,
      };

      const [updated] = await db.update(incidents)
        .set(updateData)
        .where(eq(incidents.id, existing.id))
        .returning();

      if (changes.length > 0) {
        const unitChange = changes.find(c => c.field === 'units');
        let summary = `Sync: ${changes.map(c => c.field).join(', ')} changed`;
        if (unitChange) {
          const oldUnits = unitChange.oldValue.split(', ').filter(Boolean);
          const newUnits = unitChange.newValue.split(', ').filter(Boolean);
          const added = newUnits.filter(u => !oldUnits.includes(u));
          const removed = oldUnits.filter(u => !newUnits.includes(u));
          const parts: string[] = [];
          if (added.length) parts.push(`+${added.join(', ')}`);
          if (removed.length) parts.push(`-${removed.join(', ')}`);
          if (parts.length) summary = `Units: ${parts.join(' | ')}`;
        }
        await db.insert(incidentHistory).values({
          incidentId: existing.id,
          source: 'sync',
          summary,
          changes,
        });
      }

      return updated;
    } else {
      const [created] = await db.insert(incidents).values({
        ...incident,
        active: true
      }).returning();
      await db.insert(incidentHistory).values({
        incidentId: created.id,
        source: 'sync',
        summary: `Incident created: ${created.callType} at ${created.location}`,
        changes: [],
      });
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
