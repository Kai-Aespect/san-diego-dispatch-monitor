import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { syncData, lastSyncTime } from "./scraper";
import bcrypt from "bcryptjs";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" })
  : null;

const PRICE_IDS = {
  weekly:  "price_1T8WtePyfpGf4shhI7P9UJTq",
  monthly: "price_1T8WthPyfpGf4shh0EoW3INa",
  yearly:  "price_1T8WtjPyfpGf4shhkt651jp6",
};

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
  next();
}

async function requireSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.subscriptionStatus !== "active") {
    return res.status(403).json({ message: "Subscription required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  syncData(storage).catch(console.error);
  
  setInterval(() => {
    syncData(storage).catch(console.error);
  }, 60000);

  setInterval(() => {
    storage.pruneOldIncidents().catch(console.error);
  }, 60 * 60 * 1000);
  storage.pruneOldIncidents().catch(console.error);

  // ── Auth ──────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
      }).parse(req.body);

      const existing = await storage.getUserByEmail(email.toLowerCase());
      if (existing) return res.status(400).json({ message: "Email already in use" });

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await storage.createUser({ email: email.toLowerCase(), passwordHash, name });
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name, subscriptionStatus: user.subscriptionStatus, role: user.role });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string(),
      }).parse(req.body);

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) return res.status(401).json({ message: "Invalid email or password" });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });

      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name, subscriptionStatus: user.subscriptionStatus, role: user.role });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ id: user.id, email: user.email, name: user.name, subscriptionStatus: user.subscriptionStatus, role: user.role });
  });

  // ── Personal Notes ────────────────────────────────────────────
  app.get("/api/notes/me", requireAuth, requireSubscription, async (req, res) => {
    const note = await storage.getUserNotes(req.session.userId!);
    res.json({ content: note?.content ?? "" });
  });

  app.put("/api/notes/me", requireAuth, requireSubscription, async (req, res) => {
    const { content } = z.object({ content: z.string() }).parse(req.body);
    const note = await storage.upsertUserNotes(req.session.userId!, content);
    res.json({ content: note.content });
  });

  // ── Stripe ────────────────────────────────────────────────────
  app.post("/api/stripe/create-checkout", requireAuth, async (req, res) => {
    if (!stripe) return res.status(503).json({ message: "Stripe not configured" });
    try {
      const { priceId } = z.object({ priceId: z.string() }).parse(req.body);
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const validPriceIds = Object.values(PRICE_IDS);
      if (!validPriceIds.includes(priceId)) {
        return res.status(400).json({ message: "Invalid price ID" });
      }

      const origin = req.headers.origin || `https://${req.headers.host}`;
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: user.stripeCustomerId ? undefined : user.email,
        customer: user.stripeCustomerId || undefined,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/subscribe/cancel`,
        metadata: { userId: String(user.id) },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/stripe/portal", requireAuth, async (req, res) => {
    if (!stripe) return res.status(503).json({ message: "Stripe not configured" });
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user?.stripeCustomerId) return res.status(400).json({ message: "No Stripe customer found" });

      const origin = req.headers.origin || `https://${req.headers.host}`;
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${origin}/`,
      });

      res.json({ url: portalSession.url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripe) return res.status(503).json({ message: "Stripe not configured" });
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(503).json({ message: "Webhook secret not configured" });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody as Buffer, sig, webhookSecret);
    } catch (err: any) {
      console.error("Stripe webhook signature error:", err.message);
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId ? parseInt(session.metadata.userId) : null;
        if (userId && session.customer && session.subscription) {
          await storage.updateUserSubscription(userId, {
            stripeCustomerId: String(session.customer),
            subscriptionId: String(session.subscription),
            subscriptionStatus: "active",
          });
        }
      } else if (event.type === "customer.subscription.updated") {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = String(sub.customer);
        const users = await findUserByCustomerId(customerId);
        if (users) {
          await storage.updateUserSubscription(users.id, {
            subscriptionStatus: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled",
            subscriptionId: sub.id,
          });
        }
      } else if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = String(sub.customer);
        const user = await findUserByCustomerId(customerId);
        if (user) {
          await storage.updateUserSubscription(user.id, { subscriptionStatus: "canceled", subscriptionId: null });
        }
      } else if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = String(invoice.customer);
        const user = await findUserByCustomerId(customerId);
        if (user) {
          await storage.updateUserSubscription(user.id, { subscriptionStatus: "past_due" });
        }
      }
    } catch (err: any) {
      console.error("Stripe webhook handler error:", err);
    }

    res.json({ received: true });
  });

  // ── Incidents ─────────────────────────────────────────────────
  app.get(api.incidents.list.path, async (req, res) => {
    const incidents = await storage.getIncidents();
    res.json(incidents);
  });

  app.patch(api.incidents.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = req.body;
      
      if (input.notes !== undefined || input.tags !== undefined) {
        if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
        const user = await storage.getUserById(req.session.userId);
        if (!user || user.subscriptionStatus !== "active") {
          return res.status(403).json({ message: "Subscription required" });
        }
      }

      const { pin: _pin, ...updates } = input;
      const updated = await storage.updateIncident(id, updates);
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

  // ── Unit Notes ──────────────────────────────────────────────
  app.get('/api/units/:unitId/note', async (req, res) => {
    const note = await storage.getUnitNote(req.params.unitId);
    res.json(note || { content: "" });
  });

  app.post('/api/units/:unitId/note', requireAuth, requireSubscription, async (req, res) => {
    const { content } = req.body;
    const note = await storage.upsertUnitNote(req.params.unitId, content);
    res.json(note);
  });

  // ── Auth Keys ──────────────────────────────────────────────
  app.get('/api/admin/keys', async (req, res) => {
    const keys = await storage.getAuthKeys();
    res.json(keys);
  });

  app.post('/api/admin/keys', async (req, res) => {
    try {
      const input = req.body;
      const key = await storage.createAuthKey(input);
      res.json(key);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete('/api/admin/keys/:id', async (req, res) => {
    await storage.deleteAuthKey(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.get('/api/daily-stats', async (req, res) => {
    const stats = await storage.getDailyStats();
    res.json(stats);
  });

  return httpServer;
}

async function findUserByCustomerId(customerId: string) {
  const { db } = await import("./db");
  const { users } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");
  const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
  return user;
}
