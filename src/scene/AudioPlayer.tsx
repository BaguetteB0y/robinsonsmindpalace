import { useEffect, useRef, useState } from "react";
import { DesktopWindow } from "./DesktopWindow";
import { useDesktop } from "../state/desktop";

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function AudioPlayer() {
  const player = useDesktop((s) => s.player);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!player) return;
    const a = new Audio(player.src);
    a.volume = 0.7;
    a.preload = "auto";
    audioRef.current = a;

    const onTime = () => setCurrent(a.currentTime);
    const onLoaded = () => setDuration(a.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);

    a.play().catch((err) => console.warn("[audio-player] autoplay:", err));

    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.src = "";
      audioRef.current = null;
    };
  }, [player?.src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const t = Number(e.target.value);
    a.currentTime = t;
    setCurrent(t);
  };

  if (!player) return null;

  return (
    <DesktopWindow id="audio-player">
      <div className="flex flex-col gap-2 h-full">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="w-10 h-10 flex items-center justify-center border-2 border-[#3B362C] bg-[#F5F1E5] hover:bg-[#FFD93D] active:bg-[#FFC02D] text-[#1A1A1A] text-[18px] leading-none"
            aria-label={playing ? "pause" : "play"}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <div className="text-[14px] tabular-nums text-[#4A4538]">
            {formatTime(current)} / {formatTime(duration)}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={current}
          onChange={onScrub}
          className="w-full accent-[#B5483B]"
        />
      </div>
    </DesktopWindow>
  );
}
