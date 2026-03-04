import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { syncData, lastSyncTime } from "./scraper";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Trigger initial sync in background
  syncData(storage).catch(console.error);
  
  // Also set up an interval to sync every 30 seconds
  setInterval(() => {
    syncData(storage).catch(console.error);
  }, 30000);

  app.get(api.incidents.list.path, async (req, res) => {
    const incidents = await storage.getIncidents();
    res.json(incidents);
  });

  app.post(api.incidents.sync.path, async (req, res) => {
    try {
      await syncData(storage);
      res.json({ success: true, message: 'Sync complete', lastUpdated: lastSyncTime.toISOString() });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get(api.status.get.path, async (req, res) => {
    const isStale = new Date().getTime() - lastSyncTime.getTime() > 60000; // > 1 minute
    res.json({ lastUpdated: lastSyncTime.toISOString(), isStale });
  });

  return httpServer;
}