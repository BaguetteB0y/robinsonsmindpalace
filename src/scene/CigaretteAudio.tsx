import { useEffect, useRef } from "react";
import { useCigarette } from "../state/cigarette";

const URL = "/audio/denzel.mp3";
const VOL = 0.6;

export function CigaretteAudio() {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(URL);
    a.volume = VOL;
    a.preload = "auto";
    const onEnded = () => useCigarette.getState().setTextVisible(false);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", () =>
      console.warn("[denzel] load failed:", URL, a.error),
    );
    ref.current = a;
    return () => {
      a.pause();
      a.src = "";
      a.removeEventListener("ended", onEnded);
      ref.current = null;
    };
  }, []);

  useEffect(() => {
    let prevToken = useCigarette.getState().playToken;
    return useCigarette.subscribe((s) => {
      if (s.playToken === prevToken) return;
      prevToken = s.playToken;
      const a = ref.current;
      if (!a) return;
      a.currentTime = 0;
      a.play().catch((err) => console.warn("[denzel] play:", err));
    });
  }, []);

  return null;
}
