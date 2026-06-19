import { useEffect, useRef } from "react";
import { useDesktop } from "../state/desktop";
import { useMonitor } from "../state/monitor";

const URL = "/audio/mementos.opus";
const VOLUME = 0.25;
const FADE_MS = 1500;

export function MementosAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef<number | null>(null);

  useEffect(() => {
    const a = new Audio(URL);
    a.volume = 0;
    a.preload = "auto";
    a.addEventListener("error", () =>
      console.warn("[mementos audio] failed:", URL, a.error),
    );
    audioRef.current = a;
    return () => {
      a.pause();
      a.src = "";
      audioRef.current = null;
      if (fadeRafRef.current !== null) {
        cancelAnimationFrame(fadeRafRef.current);
        fadeRafRef.current = null;
      }
    };
  }, []);

  const stop = () => {
    if (fadeRafRef.current !== null) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
      a.volume = 0;
    }
  };

  const startFade = () => {
    const a = audioRef.current;
    if (!a) return;
    if (fadeRafRef.current !== null) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
    a.currentTime = 0;
    a.volume = 0;
    a.play().catch((err) => console.warn("[mementos audio] play:", err));
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / FADE_MS);
      a.volume = t * VOLUME;
      if (t < 1) {
        fadeRafRef.current = requestAnimationFrame(tick);
      } else {
        fadeRafRef.current = null;
      }
    };
    fadeRafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    let prev = !!useDesktop.getState().wins.mementos;
    return useDesktop.subscribe((s) => {
      const now = !!s.wins.mementos;
      if (!prev && now) startFade();
      prev = now;
    });
  }, []);

  useEffect(() => {
    let prev = useMonitor.getState().open;
    return useMonitor.subscribe((s) => {
      if (prev && !s.open) stop();
      prev = s.open;
    });
  }, []);

  return null;
}
