import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type IncidentListResponse } from "@shared/routes";

interface AudioNotifierProps {
  incidents: IncidentListResponse;
}

export function AudioNotifier({ incidents }: AudioNotifierProps) {
  const [enabled, setEnabled] = useState(false);
  const knownIncidentIds = useRef<Set<number>>(new Set());
  const initialLoadDone = useRef(false);

  // Play a synthesized beep to avoid external assets
  const playBeep = () => {
    if (!enabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime); // Louder
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); // Longer decay
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  useEffect(() => {
    if (!incidents.length) return;

    if (!initialLoadDone.current) {
      // First load, just record IDs
      incidents.forEach(i => knownIncidentIds.current.add(i.id));
      initialLoadDone.current = true;
      return;
    }

    // Check for new incidents
    let hasNew = false;
    incidents.forEach(i => {
      if (!knownIncidentIds.current.has(i.id)) {
        hasNew = true;
        knownIncidentIds.current.add(i.id);
      }
    });

    if (hasNew) {
      playBeep();
    }
  }, [incidents, enabled]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setEnabled(!enabled)}
      title={enabled ? "Mute New Call Alerts" : "Enable New Call Alerts"}
      className={`relative hover-elevate transition-colors ${enabled ? 'text-primary' : 'text-muted-foreground'}`}
    >
      {enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      {enabled && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-ping" />
      )}
    </Button>
  );
}
