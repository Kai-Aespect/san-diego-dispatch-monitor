import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shield, Link, FileText, ExternalLink, BarChart2, RefreshCw, LockKeyhole, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { type AdminCardListResponse } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

const COLOR_MAP: Record<string, string> = {
  blue:   "bg-blue-500/15 border-blue-500/25 text-blue-400",
  green:  "bg-emerald-500/15 border-emerald-500/25 text-emerald-400",
  amber:  "bg-amber-500/15 border-amber-500/25 text-amber-400",
  red:    "bg-red-500/15 border-red-500/25 text-red-400",
  purple: "bg-purple-500/15 border-purple-500/25 text-purple-400",
  slate:  "bg-slate-500/15 border-slate-500/25 text-slate-400",
};

function getColorClass(c: string) {
  return COLOR_MAP[c] || COLOR_MAP.blue;
}

function getVoterToken(): string {
  const key = "sd_dispatch_voter_token";
  let tok = localStorage.getItem(key);
  if (!tok) {
    tok = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    localStorage.setItem(key, tok);
  }
  return tok;
}

function PollCard({ pollId, cardColor }: { pollId: number; cardColor: string }) {
  const voterToken = getVoterToken();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/polls', pollId, 'results', voterToken],
    queryFn: async () => {
      const res = await fetch(`/api/polls/${pollId}/results?voterToken=${encodeURIComponent(voterToken)}`);
      return res.json() as Promise<{
        poll: { question: string; options: string[] };
        results: Record<string, number>;
        voterChoice: string | null;
        total: number;
      }>;
    },
    refetchInterval: 30000,
  });

  const [voting, setVoting] = useState(false);

  const handleVote = async (option: string) => {
    if (data?.voterChoice || voting) return;
    setVoting(true);
    try {
      await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option, voterToken }),
      });
      qc.invalidateQueries({ queryKey: ['/api/polls', pollId, 'results', voterToken] });
    } finally {
      setVoting(false);
    }
  };

  if (isLoading || !data) {
    return <div className="text-xs text-muted-foreground animate-pulse py-2">Loading poll...</div>;
  }

  const { poll, results, voterChoice, total } = data;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground leading-snug">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map(option => {
          const count = results[option] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isChosen = voterChoice === option;
          return (
            <button
              key={option}
              onClick={() => handleVote(option)}
              disabled={!!voterChoice || voting}
              className={cn(
                "w-full text-left rounded-lg px-3 py-1.5 relative overflow-hidden border transition-all text-xs",
                voterChoice
                  ? isChosen
                    ? "border-white/20 bg-white/10"
                    : "border-white/5 bg-white/5 opacity-70"
                  : "border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer"
              )}
            >
              {voterChoice && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-current opacity-10 transition-all"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className={cn("font-medium", isChosen && "font-bold")}>
                  {isChosen && "✓ "}{option}
                </span>
                {voterChoice && (
                  <span className="font-mono text-[10px] opacity-70">{pct}% · {count}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
        <span>{total} vote{total !== 1 ? 's' : ''} total</span>
        {voterChoice && <span className="opacity-50">Results update live</span>}
      </div>
    </div>
  );
}

export function InfoBoard() {
  const { isSubscribed } = useAuth();
  const [, setLocation] = useLocation();

  const { data: cards = [], isLoading } = useQuery<AdminCardListResponse>({
    queryKey: ['/api/admin/cards'],
    refetchInterval: 60000,
  });

  const hasLockedCards = cards.some(c => c.keyLocked);
  const visibleCards = isSubscribed
    ? cards
    : cards.filter(c => !c.keyLocked);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="text-muted-foreground/40 space-y-1">
          <Shield className="w-6 h-6 mx-auto opacity-30" />
          <p className="text-xs">No info cards yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pt-3 space-y-3">
      {hasLockedCards && !isSubscribed && (
        <button
          onClick={() => setLocation("/?tab=notes")}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-left rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <LockKeyhole className="w-3.5 h-3.5 text-primary/70 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-primary/80">Some cards require Dispatch Pro</p>
            <p className="text-[10px] text-muted-foreground/50">Subscribe to unlock all info board cards</p>
          </div>
          <Zap className="w-3.5 h-3.5 text-primary/60 ml-auto shrink-0" />
        </button>
      )}

      {visibleCards.map(card => {
        const colorClass = getColorClass(card.color);
        const typeIcon =
          card.type === "link" ? <Link className="w-3 h-3 shrink-0" /> :
          card.type === "announcement" ? <Shield className="w-3 h-3 shrink-0" /> :
          card.type === "poll" ? <BarChart2 className="w-3 h-3 shrink-0" /> :
          <FileText className="w-3 h-3 shrink-0" />;

        return (
          <div key={card.id} className={cn("rounded-xl border p-3 space-y-1.5", colorClass)}>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {typeIcon}
              <span>{card.title}</span>
              <div className="ml-auto flex items-center gap-1 shrink-0">
                {card.keyLocked && <LockKeyhole className="w-3 h-3 opacity-40" />}
                {card.pinned && <span className="text-[9px] opacity-40">PINNED</span>}
              </div>
            </div>

            {card.type === "poll" && card.pollId ? (
              <PollCard pollId={card.pollId} cardColor={card.color} />
            ) : (
              <>
                {card.content && (
                  <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{card.content}</p>
                )}
                {card.type === "link" && card.url && (
                  <a
                    href={card.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-mono hover:underline opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {card.url.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
