import { z } from 'zod';
import { incidents, insertIncidentSchema } from './schema';

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
    }
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
