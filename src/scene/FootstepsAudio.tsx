import { useEffect, useRef } from "react";
import { useWalk } from "../state/walk";

const URL = "/audio/footsteps.mp3";
const VOLUME = 0.9;
const SPRINT_RATE = 1.6;

export function FootstepsAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(URL);
    a.loop = true;
    a.volume = VOLUME;
    a.preload = "auto";
    a.addEventListener("error", () =>
      console.warn("[footsteps] load failed:", URL, a.error),
    );
    audioRef.current = a;
    return () => {
      a.pause();
      a.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    return useWalk.subscribe((s, prev) => {
      if (s.mode === prev.mode) return;
      const a = audioRef.current;
      if (!a) return;
      if (s.mode === "idle") {
        a.pause();
        return;
      }
      a.playbackRate = s.mode === "sprint" ? SPRINT_RATE : 1.0;
      if (a.paused) {
        a.currentTime = 0;
        a.play().catch((err) => console.warn("[footsteps] play:", err));
      }
    });
  }, []);

  return null;
}
