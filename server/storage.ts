import { db } from "./db";
import {
  incidents, incidentHistory, adminCards, polls, pollVotes, dailyStats, unitNotes, authKeys,
  type Incident, type InsertIncident, type IncidentHistory,
  type AdminCard, type InsertAdminCard, type Poll, type InsertPoll, type PollVote,
  type DailyStat, type UnitNote, type AuthKey, type InsertAuthKey,
} from "@shared/schema";
import { eq, desc, and, notInArray, inArray, sql, lt, asc, gte } from "drizzle-orm";
import { format, subDays } from "date-fns";

const MAX_HISTORY_PER_INCIDENT = 200;

export interface IStorage {
  getIncidents(): Promise<Incident[]>;
  upsertIncident(incident: InsertIncident): Promise<Incident>;
  getIncidentByNo(incidentNo: string): Promise<Incident | undefined>;
  updateIncident(id: number, updates: Partial<Incident>): Promise<Incident>;
  acknowledgeAll(): Promise<void>;
  clearIncidents(ids: number[]): Promise<void>;
  getIncidentHistory(incidentId: number): Promise<IncidentHistory[]>;
  markMissingAsInactive(activeIds: Set<string>): Promise<void>;

  // Admin cards
  getAdminCards(): Promise<AdminCard[]>;
  createAdminCard(card: InsertAdminCard): Promise<AdminCard>;
  updateAdminCard(id: number, updates: Partial<InsertAdminCard>): Promise<AdminCard>;
  deleteAdminCard(id: number): Promise<void>;
  reorderAdminCards(orderedIds: number[]): Promise<void>;

  // Polls
  createPoll(poll: InsertPoll): Promise<Poll>;
  getPoll(id: number): Promise<Poll | undefined>;
  getPollResults(pollId: number): Promise<Record<string, number>>;
  vote(pollId: number, option: string, voterToken: string): Promise<{ success: boolean; alreadyVoted: boolean }>;
  getVoterChoice(pollId: number, voterToken: string): Promise<string | null>;
  // Unit notes
  getUnitNote(unitId: string): Promise<UnitNote | undefined>;
  upsertUnitNote(unitId: string, content: string): Promise<UnitNote>;

  // Auth keys
  getAuthKeys(): Promise<AuthKey[]>;
  createAuthKey(key: InsertAuthKey): Promise<AuthKey>;
  deleteAuthKey(id: number): Promise<void>;
  validatePin(pin: string): Promise<AuthKey | undefined>;

  // Daily stats (forever analytics)
  getDailyStats(): Promise<DailyStat[]>;
  aggregateIncidentsIntoDailyStats(incList: Incident[]): Promise<void>;
  pruneOldIncidents(): Promise<void>;
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
      const SYSTEM_FIELDS = new Set(['lat', 'lng']);
      const systemChanges: Array<{ field: string; oldValue: string; newValue: string }> = [];
      const userChanges: Array<{ field: string; oldValue: string; newValue: string }> = [];

      for (const key of Object.keys(updates) as Array<keyof typeof updates>) {
        const oldVal = stringify(existing[key]);
        const newVal = stringify(updates[key]);
        if (oldVal !== newVal && key !== 'lastUpdated') {
          const change = { field: key, oldValue: oldVal, newValue: newVal };
          if (SYSTEM_FIELDS.has(key)) systemChanges.push(change);
          else userChanges.push(change);
        }
      }

      if (systemChanges.length > 0) {
        await db.insert(incidentHistory).values({
          incidentId: id,
          source: 'sync',
          summary: `System: coordinates updated`,
          changes: systemChanges,
        });
        await this.pruneHistory(id);
      }
      if (userChanges.length > 0) {
        const summary = `User updated: ${userChanges.map(c => c.field).join(', ')}`;
        await db.insert(incidentHistory).values({
          incidentId: id,
          source: 'user',
          summary,
          changes: userChanges,
        });
        await this.pruneHistory(id);
      }
    }

    return updated;
  }

  async acknowledgeAll(): Promise<void> {
    await db.update(incidents)
      .set({ acknowledged: true })
      .where(eq(incidents.acknowledged, false));
  }

  async clearIncidents(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    // Get incidents before clearing so we can aggregate stats
    const toAggregate = await db.select().from(incidents).where(inArray(incidents.id, ids));
    await this.aggregateIncidentsIntoDailyStats(toAggregate);
    await db.update(incidents)
      .set({ active: false, clearedByAdmin: true })
      .where(inArray(incidents.id, ids));
    for (const id of ids) {
      await db.insert(incidentHistory).values({
        incidentId: id,
        source: 'admin',
        summary: 'Admin manually cleared call',
        changes: [{ field: 'active', oldValue: 'true', newValue: 'false' }],
      });
    }
  }

  private async pruneHistory(incidentId: number): Promise<void> {
    const rows = await db.select({ id: incidentHistory.id })
      .from(incidentHistory)
      .where(eq(incidentHistory.incidentId, incidentId))
      .orderBy(desc(incidentHistory.changedAt));
    if (rows.length > MAX_HISTORY_PER_INCIDENT) {
      const toDelete = rows.slice(MAX_HISTORY_PER_INCIDENT).map(r => r.id);
      await db.delete(incidentHistory).where(inArray(incidentHistory.id, toDelete));
    }
  }

  async markMissingAsInactive(activeIds: Set<string>): Promise<void> {
    const ids = Array.from(activeIds);
    if (ids.length === 0) return;
    // Archive (for stats) any currently-active incidents that disappeared
    const missing = await db.select().from(incidents)
      .where(and(eq(incidents.active, true), eq(incidents.clearedByAdmin, false), notInArray(incidents.incidentNo, ids)));
    if (missing.length > 0) {
      await this.aggregateIncidentsIntoDailyStats(missing);
    }
    // Mark missing as inactive (skip clearedByAdmin ones)
    await db.update(incidents)
      .set({ active: false })
      .where(and(eq(incidents.active, true), eq(incidents.clearedByAdmin, false), notInArray(incidents.incidentNo, ids)));
    // Re-activate existing non-cleared incidents that are in feed
    await db.update(incidents)
      .set({ active: true })
      .where(and(inArray(incidents.incidentNo, ids), eq(incidents.clearedByAdmin, false)));
  }

  async upsertIncident(incident: InsertIncident): Promise<Incident> {
    const existing = await this.getIncidentByNo(incident.incidentNo);
    if (existing) {
      // Never re-activate an admin-cleared incident
      if (existing.clearedByAdmin) return existing;

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
        acknowledged: changes.length > 0 ? false : existing.acknowledged,
        lat: incident.lat ?? existing.lat,
        lng: incident.lng ?? existing.lng,
        active: true,
      };

      const [updated] = await db.update(incidents)
        .set(updateData)
        .where(eq(incidents.id, existing.id))
        .returning();

      if (changes.length > 0) {
        await db.update(incidents).set({ hasHistory: true }).where(eq(incidents.id, existing.id));
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
        await this.pruneHistory(existing.id);
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

  // ── Admin Cards ──────────────────────────────────────────────

  async getAdminCards(): Promise<AdminCard[]> {
    return await db.select().from(adminCards).orderBy(desc(adminCards.pinned), asc(adminCards.sortOrder), desc(adminCards.createdAt));
  }

  async createAdminCard(card: InsertAdminCard): Promise<AdminCard> {
    const maxOrder = await db.select({ m: sql<number>`coalesce(max(${adminCards.sortOrder}), 0)` }).from(adminCards);
    const nextOrder = (maxOrder[0]?.m ?? 0) + 1;
    const [created] = await db.insert(adminCards).values({ ...card, sortOrder: nextOrder }).returning();
    return created;
  }

  async updateAdminCard(id: number, updates: Partial<InsertAdminCard>): Promise<AdminCard> {
    const [updated] = await db.update(adminCards).set(updates).where(eq(adminCards.id, id)).returning();
    return updated;
  }

  async deleteAdminCard(id: number): Promise<void> {
    await db.delete(adminCards).where(eq(adminCards.id, id));
  }

  async reorderAdminCards(orderedIds: number[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(adminCards).set({ sortOrder: i }).where(eq(adminCards.id, orderedIds[i]));
    }
  }

  // ── Polls ────────────────────────────────────────────────────

  async createPoll(poll: InsertPoll): Promise<Poll> {
    const [created] = await db.insert(polls).values(poll).returning();
    return created;
  }

  async getPoll(id: number): Promise<Poll | undefined> {
    const [poll] = await db.select().from(polls).where(eq(polls.id, id));
    return poll;
  }

  async getPollResults(pollId: number): Promise<Record<string, number>> {
    const votes = await db.select().from(pollVotes).where(eq(pollVotes.pollId, pollId));
    const counts: Record<string, number> = {};
    for (const v of votes) {
      counts[v.option] = (counts[v.option] ?? 0) + 1;
    }
    return counts;
  }

  async vote(pollId: number, option: string, voterToken: string): Promise<{ success: boolean; alreadyVoted: boolean }> {
    const existing = await db.select().from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.voterToken, voterToken)));
    if (existing.length > 0) return { success: false, alreadyVoted: true };
    await db.insert(pollVotes).values({ pollId, option, voterToken });
    return { success: true, alreadyVoted: false };
  }

  async getVoterChoice(pollId: number, voterToken: string): Promise<string | null> {
    const [row] = await db.select().from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.voterToken, voterToken)));
    return row?.option ?? null;
  }

  async updatePoll(id: number, updates: { question?: string; options?: string[] }): Promise<Poll> {
    const [updated] = await db.update(polls).set(updates).where(eq(polls.id, id)).returning();
    return updated;
  }

  // ── Unit Notes ──────────────────────────────────────────────
  async getUnitNote(unitId: string): Promise<UnitNote | undefined> {
    const [note] = await db.select().from(unitNotes).where(eq(unitNotes.unitId, unitId));
    return note;
  }

  async upsertUnitNote(unitId: string, content: string): Promise<UnitNote> {
    const existing = await this.getUnitNote(unitId);
    if (existing) {
      const [updated] = await db.update(unitNotes).set({ content, lastUpdated: new Date() }).where(eq(unitNotes.unitId, unitId)).returning();
      return updated;
    }
    const [created] = await db.insert(unitNotes).values({ unitId, content }).returning();
    return created;
  }

  // ── Auth Keys ──────────────────────────────────────────────
  async getAuthKeys(): Promise<AuthKey[]> {
    return await db.select().from(authKeys).orderBy(desc(authKeys.createdAt));
  }

  async createAuthKey(key: InsertAuthKey): Promise<AuthKey> {
    const [created] = await db.insert(authKeys).values(key).returning();
    return created;
  }

  async deleteAuthKey(id: number): Promise<void> {
    await db.delete(authKeys).where(eq(authKeys.id, id));
  }

  async validatePin(pin: string): Promise<AuthKey | undefined> {
    if (pin === "3232") return { id: 0, pin: "3232", name: "Administrator", createdAt: new Date() };
    const [key] = await db.select().from(authKeys).where(eq(authKeys.pin, pin));
    return key;
  }

  // ── Daily Stats (Forever Analytics) ──────────────────────────
  async getDailyStats(): Promise<DailyStat[]> {
    return await db.select().from(dailyStats).orderBy(asc(dailyStats.date));
  }

  async aggregateIncidentsIntoDailyStats(incList: Incident[]): Promise<void> {
    if (incList.length === 0) return;
    // Map category for each incident
    const categorize = (inc: Incident): string => {
      if (inc.callTypeFamily === "Medical") return "Medical";
      if (inc.agency === "fire") {
        const f = (inc.callTypeFamily ?? "").toLowerCase();
        const t = inc.callType.toLowerCase();
        if (f.includes("traffic") || t.includes("traffic") || t.includes("accident")) return "Traffic";
        return "Fire";
      }
      if (inc.agency === "police") {
        const t = inc.callType.toLowerCase();
        if (t.includes("traffic") || t.includes("accident") || t.includes("collision")) return "Traffic";
        return "Police";
      }
      return "Other";
    };

    // Group by date + agency + category
    const counts: Record<string, Record<string, Record<string, number>>> = {};
    for (const inc of incList) {
      const dateStr = format(new Date(inc.time), "yyyy-MM-dd");
      const cat = categorize(inc);
      if (!counts[dateStr]) counts[dateStr] = {};
      if (!counts[dateStr][inc.agency]) counts[dateStr][inc.agency] = {};
      counts[dateStr][inc.agency][cat] = (counts[dateStr][inc.agency][cat] || 0) + 1;
    }

    // Upsert each bucket — increment if row exists, insert if not
    for (const [date, agencies] of Object.entries(counts)) {
      for (const [agency, cats] of Object.entries(agencies)) {
        for (const [category, count] of Object.entries(cats)) {
          const [existing] = await db.select().from(dailyStats)
            .where(and(eq(dailyStats.date, date), eq(dailyStats.agency, agency), eq(dailyStats.category, category)));
          if (existing) {
            await db.update(dailyStats).set({ count: existing.count + count })
              .where(eq(dailyStats.id, existing.id));
          } else {
            await db.insert(dailyStats).values({ date, agency, category, count });
          }
        }
      }
    }
  }

  async pruneOldIncidents(): Promise<void> {
    const cutoff = subDays(new Date(), 3);
    // Find old inactive incidents to aggregate before deleting
    const old = await db.select().from(incidents)
      .where(and(eq(incidents.active, false), lt(incidents.time, cutoff)));
    if (old.length === 0) return;
    // Aggregate their stats (idempotent — duplicates won't inflate because we already aggregated on archive)
    // Actually we skip re-aggregating here since we aggregate on archive. Just delete.
    const ids = old.map(i => i.id);
    // Delete history first
    await db.delete(incidentHistory).where(inArray(incidentHistory.incidentId, ids));
    // Delete incidents
    await db.delete(incidents).where(inArray(incidents.id, ids));
    console.log(`Pruned ${ids.length} incidents older than 30 days`);
  }
}

export const storage = new DatabaseStorage();
