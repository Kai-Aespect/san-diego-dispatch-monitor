import { useEffect, useRef } from "react";
import { type IncidentListResponse } from "@shared/routes";

interface AudioNotifierProps {
  incidents: IncidentListResponse;
  enabled: boolean;
}

export function AudioNotifier({ incidents, enabled }: AudioNotifierProps) {
  const knownIncidentIds = useRef<Set<number>>(new Set());
  const knownUpdateTimes = useRef<Map<number, string>>(new Map());
  const initialLoadDone = useRef(false);

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
        knownIncidentIds.current.add(i.id);
        knownUpdateTimes.current.set(i.id, i.lastUpdated as string);
      });
      initialLoadDone.current = true;
      return;
    }

    let shouldPlay = false;
    incidents.forEach(i => {
      if (!knownIncidentIds.current.has(i.id)) {
        shouldPlay = true;
        knownIncidentIds.current.add(i.id);
        knownUpdateTimes.current.set(i.id, i.lastUpdated as string);
      } else {
        const prev = knownUpdateTimes.current.get(i.id);
        if (prev && prev !== (i.lastUpdated as string)) {
          shouldPlay = true;
          knownUpdateTimes.current.set(i.id, i.lastUpdated as string);
        }
      }
    });

    if (shouldPlay) playTripleTone();
  }, [incidents, enabled]);

  return null;
}
