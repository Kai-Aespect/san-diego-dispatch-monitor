import { z } from 'zod';
import { incidents, incidentHistory, adminCards, polls, insertAdminCardSchema, insertPollSchema } from './schema';

export const errorSchemas = {
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  incidents: {
    list: {
      method: 'GET' as const,
      path: '/api/incidents' as const,
      responses: {
        200: z.array(z.custom<typeof incidents.$inferSelect>()),
      }
    },
    sync: {
      method: 'POST' as const,
      path: '/api/incidents/sync' as const,
      responses: {
        200: z.object({ success: z.boolean(), message: z.string(), lastUpdated: z.string() })
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/incidents/:id' as const,
      input: z.object({
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        acknowledged: z.boolean().optional(),
        hasUpdate: z.boolean().optional(),
        active: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof incidents.$inferSelect>(),
      }
    },
    clear: {
      method: 'POST' as const,
      path: '/api/incidents/clear' as const,
      input: z.object({ ids: z.array(z.number()) }),
      responses: {
        200: z.object({ success: z.boolean(), cleared: z.number() })
      }
    },
    acknowledgeAll: {
      method: 'POST' as const,
      path: '/api/incidents/acknowledge-all' as const,
      responses: {
        200: z.object({ success: z.boolean() })
      }
    },
    history: {
      method: 'GET' as const,
      path: '/api/incidents/:id/history' as const,
      responses: {
        200: z.array(z.custom<typeof incidentHistory.$inferSelect>()),
      }
    },
  },
  adminCards: {
    list: {
      method: 'GET' as const,
      path: '/api/admin/cards' as const,
      responses: {
        200: z.array(z.custom<typeof adminCards.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/admin/cards' as const,
      input: insertAdminCardSchema,
      responses: {
        200: z.custom<typeof adminCards.$inferSelect>(),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/admin/cards/:id' as const,
      input: insertAdminCardSchema.partial(),
      responses: {
        200: z.custom<typeof adminCards.$inferSelect>(),
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/admin/cards/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() })
      }
    },
    reorder: {
      method: 'POST' as const,
      path: '/api/admin/cards/reorder' as const,
      input: z.object({ orderedIds: z.array(z.number()) }),
      responses: {
        200: z.object({ success: z.boolean() })
      }
    },
  },
  polls: {
    create: {
      method: 'POST' as const,
      path: '/api/polls' as const,
      input: insertPollSchema,
      responses: {
        200: z.custom<typeof polls.$inferSelect>(),
      }
    },
    results: {
      method: 'GET' as const,
      path: '/api/polls/:id/results' as const,
      responses: {
        200: z.object({
          poll: z.custom<typeof polls.$inferSelect>(),
          results: z.record(z.string(), z.number()),
          voterChoice: z.string().nullable(),
          total: z.number(),
        })
      }
    },
    vote: {
      method: 'POST' as const,
      path: '/api/polls/:id/vote' as const,
      input: z.object({ option: z.string(), voterToken: z.string() }),
      responses: {
        200: z.object({ success: z.boolean(), alreadyVoted: z.boolean() })
      }
    },
  },
  status: {
    get: {
      method: 'GET' as const,
      path: '/api/status' as const,
      responses: {
        200: z.object({ lastUpdated: z.string(), isStale: z.boolean() })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type IncidentListResponse = z.infer<typeof api.incidents.list.responses[200]>;
export type SyncResponse = z.infer<typeof api.incidents.sync.responses[200]>;
export type StatusResponse = z.infer<typeof api.status.get.responses[200]>;
export type IncidentHistoryResponse = z.infer<typeof api.incidents.history.responses[200]>;
export type AdminCardListResponse = z.infer<typeof api.adminCards.list.responses[200]>;
export type PollResultsResponse = z.infer<typeof api.polls.results.responses[200]>;
