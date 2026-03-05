import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { type InsertIncident } from '@shared/schema';
import { geocodePendingIncidents } from './geocoder';

export let lastSyncTime: Date = new Date();

/**
 * The SDPD dispatch page reports times in America/Los_Angeles local time
 * without any timezone designator. Node.js (running UTC) treats them as
 * UTC, making every timestamp 7–8 hours too early in the database.
 *
 * This function re-interprets the parsed timestamp as a Pacific wall-clock
 * time and shifts it to the correct UTC value.
 */
function parsePacificTime(timeStr: string): Date {
  const raw = new Date(timeStr);
  if (isNaN(raw.getTime())) return new Date();

  // Determine what Los Angeles thinks "now" is in UTC offset minutes.
  // e.g. PST = -480, PDT = -420
  const nowUtc = Date.now();
  const laStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(nowUtc);
  // Parse the LA string back as UTC to get the LA wall-clock epoch
  const laEpoch = new Date(laStr.replace(/(\d+)\/(\d+)\/(\d+),\s/, '$3-$1-$2T') + 'Z').getTime();
  const offsetMs = nowUtc - laEpoch; // e.g. +28800000 for PST (UTC is 8h ahead of LA)

  // raw.getTime() is the epoch where the LA time-string was parsed as UTC.
  // Shift by the offset to get the true UTC epoch.
  return new Date(raw.getTime() + offsetMs);
}

export async function fetchFireIncidents(): Promise<InsertIncident[]> {
  try {
    const response = await fetch('https://webapps.sandiego.gov/SDFireDispatch/api/v1/Incidents', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) {
      console.error('Failed to fetch fire incidents API:', response.status);
      return [];
    }
    const data = await response.json();
    const incidents: InsertIncident[] = [];

    for (const item of data) {
      const incidentNo = item.MasterIncidentNumber;
      if (!incidentNo) continue;
      
      const callType = item.IncidentTypeName || item.CallType || 'Unknown';
      let family = item.CallType || 'Other';
      if (!item.CallType) {
        const typeLower = callType.toLowerCase();
        if (typeLower.includes('med') || typeLower.includes('cpr') || typeLower.includes('injur') || typeLower.includes('sick')) family = 'Medical';
        else if (typeLower.includes('fire') || typeLower.includes('smoke') || typeLower.includes('alarm')) family = 'Fire';
        else if (typeLower.includes('resc') || typeLower.includes('crash') || typeLower.includes('traffic') || typeLower.includes('tfc')) family = 'Traffic';
      }

      let time = new Date();
      if (item.ResponseDate) {
        time = new Date(item.ResponseDate);
        if (isNaN(time.getTime())) time = new Date();
      }

      const units = item.Units ? item.Units.map((u: any) => u.Code).filter(Boolean) : [];
      // Major call logic: Fire/Rescue family OR more than 3 units
      const isMajor = family === 'Fire' || family === 'Rescue' || units.length >= 3;

      const lat = item.Latitude ? parseFloat(item.Latitude) : null;
      const lng = item.Longitude ? parseFloat(item.Longitude) : null;

      // Clean up title: "1a Medical Aid 1a" -> "Medical Aid"
      let cleanCallType = callType;
      const codeMatch = callType.match(/^(\d[a-z])\s+(.*)\s+\1$/i);
      if (codeMatch) {
        cleanCallType = codeMatch[2];
      }

      incidents.push({
        agency: 'fire',
        incidentNo: `F-${incidentNo}`,
        callType: cleanCallType,
        callTypeFamily: family,
        time: time,
        location: item.Address || 'Unknown',
        crossStreets: item.CrossStreet || '',
        status: item.CallIsActive === false ? 'Closed' : 'Active',
        units: units,
        isMajor: isMajor,
        lat,
        lng,
        lastUpdated: new Date(),
        active: true
      });
    }
    
    return incidents;
  } catch (error) {
    console.error('Error fetching fire incidents:', error);
    return [];
  }
}

export async function fetchPoliceIncidents(): Promise<InsertIncident[]> {
  try {
    const response = await fetch('https://webapps.sandiego.gov/sdpdonline/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) {
      console.error('Failed to fetch police incidents:', response.status);
      return [];
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const incidents: InsertIncident[] = [];

    // Parse the SDPD dispatch table
    $('table tr').each((i, el) => {
      // Skip header row usually detected by having 'th'
      if ($(el).find('th').length > 0) return;
      
      const tds = $(el).find('td');
      if (tds.length >= 5) {
        const timeStr = $(tds[0]).text().trim();
        const callType = $(tds[1]).text().trim();
        const neighborhood = $(tds[2]).text().trim(); // sometimes division
        const loc1 = $(tds[3]).text().trim(); // usually neighborhood/division
        const loc2 = $(tds[4]).text().trim(); // usually address
        
        if (!timeStr || timeStr.toLowerCase().includes('date')) return;

        let time = new Date();
        if (timeStr) {
          time = parsePacificTime(timeStr);
        }

        let family = 'Other';
        const typeLower = callType.toLowerCase();
        if (typeLower.includes('traffic') || typeLower.includes('hit and run') || typeLower.includes('1182') || typeLower.includes('1183')) family = 'Traffic';
        else if (typeLower.includes('assault') || typeLower.includes('shoot') || typeLower.includes('weapon') || typeLower.includes('245') || typeLower.includes('187')) family = 'Rescue';
        else if (typeLower.includes('medical') || typeLower.includes('5150')) family = 'Medical';

        // Police table doesn't have incident numbers — derive a stable ID via SHA-256
        // so each unique (time, callType, location) combination always maps to the same ID.
        // Using SHA-256 avoids the base64 prefix-collision bug where all calls on the same
        // day shared the same first 15 chars of base64(date + ...).
        const incidentHash = createHash('sha256')
          .update(`${timeStr}-${callType}-${loc2}`)
          .digest('hex')
          .substring(0, 16);
        
        incidents.push({
          agency: 'police',
          incidentNo: `P-${incidentHash}`,
          callType,
          callTypeFamily: family,
          time,
          location: loc2,
          neighborhood: loc1 || neighborhood,
          isMajor: false,
          lastUpdated: new Date(),
          active: true
        });
      }
    });

    return incidents;
  } catch (error) {
    console.error('Error fetching police incidents:', error);
    return [];
  }
}

export async function syncData(storage: any) {
  // Fetch in parallel to save time
  const [fire, police] = await Promise.all([
    fetchFireIncidents(),
    fetchPoliceIncidents()
  ]);
  
  const all = [...fire, ...police];
  const incomingIds = new Set(all.map(inc => inc.incidentNo));
  
  // Mark missing incidents as inactive ONLY if we actually got data
  // Use a higher threshold to avoid mass archiving during network blips
  if (fire.length > 5 || police.length > 5) {
    await storage.markMissingAsInactive(incomingIds);
  }

  let synced = 0;
  // Use Promise.all for database upserts to run them in parallel
  await Promise.all(all.map(async (inc) => {
    try {
      await storage.upsertIncident(inc);
      synced++;
    } catch (e) {
      console.error('Error upserting incident:', e);
    }
  }));
  
  lastSyncTime = new Date();
  console.log(`Synced ${synced} incidents at ${lastSyncTime.toISOString()}`);

  // Only run geocoding pass if it's not already running
  if (!(global as any).isGeocoding) {
    (global as any).isGeocoding = true;
    geocodePendingIncidents(storage)
      .catch(e => console.error('Geocoding pass error:', e))
      .finally(() => (global as any).isGeocoding = false);
  }

  return { success: true, count: synced };
}
