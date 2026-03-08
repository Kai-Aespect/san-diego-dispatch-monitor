import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StickyNote, Save } from "lucide-react";

export function PersonalNotes() {
  const { data, isLoading } = useQuery<{ content: string }>({
    queryKey: ["/api/notes/me"],
    staleTime: 30000,
  });

  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (data?.content !== undefined) {
      setContent(data.content);
    }
  }, [data?.content]);

  const saveMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("PUT", "/api/notes/me", { content: text });
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["/api/notes/me"] });
    },
  });

  const handleChange = (val: string) => {
    setContent(val);
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveMutation.mutate(val);
    }, 1500);
  };

  const handleManualSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveMutation.mutate(content);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2.5 border-b border-white/5 flex items-center gap-2 shrink-0">
        <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">Personal Notes</span>
        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <span className="text-[9px] text-muted-foreground/50 font-mono">unsaved</span>
          )}
          {saveMutation.isPending && (
            <span className="text-[9px] text-primary animate-pulse font-mono">saving...</span>
          )}
          {!saveMutation.isPending && !dirty && content && (
            <span className="text-[9px] text-emerald-400/60 font-mono">saved</span>
          )}
          <button
            onClick={handleManualSave}
            disabled={saveMutation.isPending || !dirty}
            title="Save now"
            className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-3 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={e => handleChange(e.target.value)}
            placeholder="Your personal notes — auto-saved to the cloud..."
            data-testid="textarea-personal-notes"
            className="flex-1 w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none leading-relaxed"
          />
        )}
      </div>
    </div>
  );
}
