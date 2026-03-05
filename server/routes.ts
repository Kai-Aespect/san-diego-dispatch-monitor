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
  
  syncData(storage).catch(console.error);
  
  // Sync every 15 seconds for more real-time updates
  setInterval(() => {
    syncData(storage).catch(console.error);
  }, 15000);

  app.get(api.incidents.list.path, async (req, res) => {
    const incidents = await storage.getIncidents();
    res.json(incidents);
  });

  app.patch(api.incidents.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.incidents.update.input.parse(req.body);
      const updated = await storage.updateIncident(id, input);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post(api.incidents.acknowledgeAll.path, async (req, res) => {
    try {
      await storage.acknowledgeAll();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get(api.incidents.history.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const history = await storage.getIncidentHistory(id);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
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
    const isStale = new Date().getTime() - lastSyncTime.getTime() > 60000;
    res.json({ lastUpdated: lastSyncTime.toISOString(), isStale });
  });

  return httpServer;
}
