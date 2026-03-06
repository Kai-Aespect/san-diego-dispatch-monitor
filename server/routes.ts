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
  
  setInterval(() => {
    syncData(storage).catch(console.error);
  }, 5000);

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

  app.post(api.incidents.clear.path, async (req, res) => {
    try {
      const { ids } = api.incidents.clear.input.parse(req.body);
      await storage.clearIncidents(ids);
      res.json({ success: true, cleared: ids.length });
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

  // ── Admin Cards ──────────────────────────────────────────────

  app.get(api.adminCards.list.path, async (req, res) => {
    try {
      const cards = await storage.getAdminCards();
      res.json(cards);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // reorder must come before :id routes
  app.post('/api/admin/cards/reorder', async (req, res) => {
    try {
      const { orderedIds } = api.adminCards.reorder.input.parse(req.body);
      await storage.reorderAdminCards(orderedIds);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post(api.adminCards.create.path, async (req, res) => {
    try {
      const input = api.adminCards.create.input.parse(req.body);
      const card = await storage.createAdminCard(input);
      res.json(card);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch('/api/admin/cards/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.adminCards.update.input.parse(req.body);
      const card = await storage.updateAdminCard(id, input);
      res.json(card);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete('/api/admin/cards/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAdminCard(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Polls ────────────────────────────────────────────────────

  app.post(api.polls.create.path, async (req, res) => {
    try {
      const input = api.polls.create.input.parse(req.body);
      const poll = await storage.createPoll(input);
      res.json(poll);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get('/api/polls/:id/results', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const voterToken = (req.query.voterToken as string) || '';
      const poll = await storage.getPoll(id);
      if (!poll) return res.status(404).json({ message: 'Poll not found' });
      const results = await storage.getPollResults(id);
      const voterChoice = voterToken ? await storage.getVoterChoice(id, voterToken) : null;
      const total = Object.values(results).reduce((s, n) => s + n, 0);
      res.json({ poll, results, voterChoice, total });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/polls/:id/vote', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { option, voterToken } = api.polls.vote.input.parse(req.body);
      const result = await storage.vote(id, option, voterToken);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch('/api/polls/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { question, options } = req.body;
      const updated = await storage.updatePoll(id, { question, options });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  return httpServer;
}
