import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Radio, RefreshCcw, Clock as ClockIcon,
  Volume2, VolumeX, X, ExternalLink, Play, Pause, Loader2
} from "lucide-react";
import { useSyncIncidents } from "@/hooks/use-incidents";
import { useSettings } from "@/hooks/use-settings";
import { type IncidentListResponse } from "@shared/routes";

// Broadcastify CDN stream URL for feed 20530 (SD Fire & Police)
// This is the direct audio stream — same source the Broadcastify web player uses
const STREAM_URL = "https://broadcastify.cdnstream1.com/20530";
const BROADCAST_LISTEN_URL = "https://www.broadcastify.com/listen/feed/20530";

interface DashboardHeaderProps {
  search: string;
  setSearch: (v: string) => void;
  incidents: IncidentListResponse;
}

type PlayerState = "idle" | "loading" | "playing" | "paused" | "error";

export function DashboardHeader({ search, setSearch, incidents }: DashboardHeaderProps) {
  const syncMutation = useSyncIncidents();
  const [time, setTime] = useState(new Date());
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const audioRef = useRef<HTMLAudioElement>(null);
  const { settings, setVolumeEnabled } = useSettings();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const togglePlayer = () => {
    if (!playerOpen) {
      setPlayerOpen(true);
      startStream();
    } else {
      stopStream();
      setPlayerOpen(false);
    }
  };

  const startStream = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlayerState("loading");
    audio.src = STREAM_URL;
    audio.load();
    audio.play().catch(() => setPlayerState("error"));
  };

  const stopStream = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = "";
    setPlayerState("idle");
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playerState === "playing" || playerState === "loading") {
      audio.pause();
      setPlayerState("paused");
    } else if (playerState === "paused") {
      setPlayerState("loading");
      audio.play().catch(() => setPlayerState("error"));
    } else {
      startStream();
    }
  };

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onWaiting={() => setPlayerState("loading")}
        onPlaying={() => setPlayerState("playing")}
        onPause={() => setPlayerState(s => s === "loading" ? s : "paused")}
        onError={() => setPlayerState("error")}
        onStalled={() => setPlayerState("loading")}
        preload="none"
      />

      <header className="sticky top-0 z-50 w-full px-4 py-3 sm:px-6 bg-[#0a0c14]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-display font-bold text-lg tracking-tight hidden sm:block text-foreground leading-none">
                  SD Dispatch<span className="text-primary">.Live</span>
                </h1>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground mt-1">
                  <ClockIcon className="w-3 h-3 text-primary" />
                  {time.toLocaleTimeString('en-US', { hour12: false })}
                </div>
              </div>
            </div>

            <div className="relative flex-1 sm:w-64 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input
                placeholder="Search units, address, type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full h-9 rounded-xl border-white/10 focus-visible:ring-primary/40 focus-visible:ring-2"
                style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}
                data-testid="input-search"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVolumeEnabled(!settings.volumeEnabled)}
              title={settings.volumeEnabled ? "Mute alerts" : "Enable alerts"}
              className={`relative transition-colors ${settings.volumeEnabled ? 'text-primary' : 'text-muted-foreground'}`}
              data-testid="button-toggle-volume"
            >
              {settings.volumeEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              {settings.volumeEnabled && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-ping" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="border-white/10 bg-black/20 hover:bg-white/5"
            >
              <RefreshCcw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin text-primary' : ''}`} />
              {syncMutation.isPending ? 'Syncing...' : 'Sync'}
            </Button>

            <Button
              onClick={togglePlayer}
              size="sm"
              className={`bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white shadow-lg shadow-red-500/20 border-0 transition-all ${playerOpen ? 'ring-2 ring-orange-400/60' : ''}`}
              data-testid="button-listen-live"
            >
              <Radio className={`w-4 h-4 mr-2 ${playerState === 'playing' ? 'animate-pulse' : ''}`} />
              {playerOpen ? 'Stop Audio' : 'Listen Live'}
            </Button>
          </div>
        </div>

        {/* Inline audio player bar */}
        {playerOpen && (
          <div className="mt-3 max-w-screen-2xl mx-auto">
            <div className="rounded-2xl overflow-hidden bg-[#141928]/60 backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="flex items-center gap-4 px-4 py-3">

                {/* Play/Pause button */}
                <button
                  onClick={togglePlayPause}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shrink-0 hover:from-red-500 hover:to-orange-400 transition-all shadow-lg shadow-red-500/30"
                  title={playerState === 'playing' ? 'Pause' : 'Play'}
                >
                  {playerState === 'loading' ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : playerState === 'playing' ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white ml-0.5" />
                  )}
                </button>

                {/* Status + label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {playerState === 'playing' && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    )}
                    <span className="truncate">San Diego Fire &amp; Police — Live Dispatch</span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {playerState === 'idle' && 'Press play to start'}
                    {playerState === 'loading' && 'Connecting to stream...'}
                    {playerState === 'playing' && 'Live · Broadcastify Feed #20530'}
                    {playerState === 'paused' && 'Paused'}
                    {playerState === 'error' && 'Stream unavailable — try opening directly'}
                  </div>
                </div>

                {/* Animated waveform when playing */}
                {playerState === 'playing' && (
                  <div className="flex items-end gap-0.5 h-5 shrink-0">
                    {[3, 5, 4, 6, 3, 5, 4].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-orange-400 rounded-full animate-pulse"
                        style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                )}

                {/* Fallback link if error */}
                {playerState === 'error' && (
                  <a
                    href={BROADCAST_LISTEN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs flex items-center gap-1 text-orange-400 hover:text-orange-300 font-mono"
                  >
                    <ExternalLink className="w-3 h-3" /> Open
                  </a>
                )}

                {/* Close */}
                <button
                  onClick={() => { stopStream(); setPlayerOpen(false); }}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
