import { useEffect, useRef } from "react";
import { type IncidentListResponse } from "@shared/routes";
import { useSettings } from "@/hooks/use-settings";

interface AudioNotifierProps {
  incidents: IncidentListResponse;
  enabled: boolean;
}

function contentHash(i: IncidentListResponse[0]): string {
  return `${JSON.stringify(i.units)}|${i.callType}|${i.status}|${i.callTypeFamily}|${i.active}`;
}

export function AudioNotifier({ incidents, enabled }: AudioNotifierProps) {
  const knownIds = useRef<Set<number>>(new Set());
  const knownHashes = useRef<Map<number, string>>(new Map());
  const initialLoadDone = useRef(false);
  const { settings } = useSettings();

  const playTripleTone = () => {
    if (!enabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const tones = [
        { freq: 440, start: 0 },
        { freq: 660, start: 0.35 },
        { freq: 880, start: 0.7 },
      ];

      tones.forEach(({ freq, start }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.05);
        gain.gain.setValueAtTime(0.4, ctx.currentTime + start + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + 0.4);
      });
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  useEffect(() => {
    if (!incidents.length) return;

    if (!initialLoadDone.current) {
      incidents.forEach(i => {
        knownIds.current.add(i.id);
        knownHashes.current.set(i.id, contentHash(i));
      });
      initialLoadDone.current = true;
      return;
    }

    let shouldPlay = false;
    const ackMode = settings.ackMode;

    incidents.forEach(i => {
      const hash = contentHash(i);
      if (!knownIds.current.has(i.id)) {
        if (ackMode === "new" || ackMode === "both") shouldPlay = true;
        knownIds.current.add(i.id);
        knownHashes.current.set(i.id, hash);
      } else {
        const prev = knownHashes.current.get(i.id);
        if (prev !== undefined && prev !== hash) {
          if (ackMode === "updates" || ackMode === "both") shouldPlay = true;
          knownHashes.current.set(i.id, hash);
        }
      }
    });

    if (shouldPlay) playTripleTone();
  }, [incidents, settings.ackMode]);

  return null;
}
