import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type IncidentListResponse, type StatusResponse } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useIncidents() {
  return useQuery({
    queryKey: [api.incidents.list.path],
    queryFn: async () => {
      const res = await fetch(api.incidents.list.path, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch incidents');
      const data = await res.json();
      return parseWithLogging(api.incidents.list.responses[200], data, "incidents.list");
    },
    // Poll every 30 seconds
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useStatus() {
  return useQuery({
    queryKey: [api.status.get.path],
    queryFn: async () => {
      const res = await fetch(api.status.get.path, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      return parseWithLogging(api.status.get.responses[200], data, "status.get");
    },
    refetchInterval: 30000,
  });
}

export function useSyncIncidents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.incidents.sync.path, {
        method: api.incidents.sync.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error('Failed to sync incidents');
      const data = await res.json();
      return parseWithLogging(api.incidents.sync.responses[200], data, "incidents.sync");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.incidents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.status.get.path] });
      toast({
        title: "Sync Complete",
        description: data.message,
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  });
}
