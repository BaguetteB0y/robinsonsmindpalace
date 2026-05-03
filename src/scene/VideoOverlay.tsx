import { useEffect, useRef, useState } from "react";
import { useTV } from "../state/tv";

const VIDEOS = [
  {
    id: "out-west",
    url: "https://github.com/BaguetteB0y/robinsonsmindpalace/releases/download/vid/Out.West.Mac.Miller.mp4",
  },
  {
    id: "adios",
    url: "https://github.com/BaguetteB0y/robinsonsmindpalace/releases/download/vid/Adios_Cap_Ferret.mov",
  },
  {
    id: "springwater",
    url: "https://github.com/BaguetteB0y/robinsonsmindpalace/releases/download/vid/springwater.mp4",
  },
];

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  s = Math.round(s);
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

export function VideoOverlay() {
  const mode = useTV((s) => s.mode);
  const videoIndex = useTV((s) => s.videoIndex);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const volTrackRef = useRef<HTMLDivElement | null>(null);

  const [duration, setDuration] = useState(0);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [vol, setVol] = useState(75);
  const [muted, setMuted] = useState(false);
  const [draggingScrub, setDraggingScrub] = useState(false);
  const [draggingVol, setDraggingVol] = useState(false);

  const active =
    mode === "playing" && videoIndex !== null && VIDEOS[videoIndex] != null;
  const videoUrl = active ? VIDEOS[videoIndex!].url : null;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = vol / 100;
      videoRef.current.muted = muted;
    }
  }, [vol, muted]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) v.play().catch((err) => console.warn("[video] play:", err));
      else v.pause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  useEffect(() => {
    if (!draggingScrub) return;
    const onMove = (e: MouseEvent) => {
      const rect = scrubberRef.current?.getBoundingClientRect();
      if (!rect || !duration) return;
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const t = pct * duration;
      setCur(t);
      if (videoRef.current) videoRef.current.currentTime = t;
    };
    const onUp = () => setDraggingScrub(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingScrub, duration]);

  useEffect(() => {
    if (!draggingVol) return;
    const onMove = (e: MouseEvent) => {
      const rect = volTrackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const v = Math.round(pct * 100);
      setVol(v);
      if (v > 0) setMuted(false);
    };
    const onUp = () => setDraggingVol(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingVol]);

  if (!active) return null;

  const scrubPct = duration > 0 ? (cur / duration) * 100 : 0;
  const volPct = muted ? 0 : vol;

  return (
    <div className="absolute inset-0 z-30 bg-black">
      <video
        key={videoUrl!}
        ref={videoRef}
        src={videoUrl!}
        autoPlay
        playsInline
        className="w-full h-full object-contain bg-black"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          e.currentTarget.volume = vol / 100;
          e.currentTarget.muted = muted;
        }}
        onTimeUpdate={(e) => {
          if (!draggingScrub) setCur(e.currentTarget.currentTime);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
        <div
          className="flex items-center gap-2 px-2 py-1.5"
          style={{
            background:
              "linear-gradient(180deg, #f4f4f4 0%, #d8d8d8 50%, #c4c4c4 100%)",
            borderTop: "1px solid #ffffff",
            borderBottom: "1px solid #6a6a6a",
            borderLeft: "1px solid #b8b8b8",
            borderRight: "1px solid #b8b8b8",
          }}
        >
          <button
            type="button"
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              if (v.paused)
                v.play().catch((err) => console.warn("[video] play:", err));
              else v.pause();
            }}
            className="w-[18px] h-[18px] flex items-center justify-center bg-transparent border-0 cursor-pointer p-0 flex-shrink-0"
            aria-label={playing ? "pause" : "play"}
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              {playing ? (
                <>
                  <rect x="3" y="2" width="3" height="10" fill="#1a1a1a" />
                  <rect x="8" y="2" width="3" height="10" fill="#1a1a1a" />
                </>
              ) : (
                <path
                  d="M3 2 L3 12 L12 7 Z"
                  fill="#1a1a1a"
                  stroke="#1a1a1a"
                  strokeWidth="0.5"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </button>

          <div
            ref={scrubberRef}
            className="relative h-[10px] flex-1 cursor-pointer"
            style={{
              background: "linear-gradient(180deg, #5a5a5a 0%, #8a8a8a 100%)",
              border: "1px solid #3a3a3a",
              borderRadius: "1px",
            }}
            onMouseDown={(e) => {
              if (!duration) return;
              setDraggingScrub(true);
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const pct = Math.max(0, Math.min(1, x / rect.width));
              const t = pct * duration;
              setCur(t);
              if (videoRef.current) videoRef.current.currentTime = t;
            }}
          >
            <div
              className="absolute left-0 top-0 bottom-0"
              style={{
                width: `${scrubPct}%`,
                background:
                  "linear-gradient(180deg, #d83838 0%, #b02020 100%)",
                borderRight: "1px solid #6a1010",
              }}
            />
            <div
              className="absolute top-1/2 w-[14px] h-[14px] rounded-full pointer-events-none"
              style={{
                left: `${scrubPct}%`,
                background:
                  "radial-gradient(circle at 35% 30%, #f0f0f0 0%, #b8b8b8 50%, #6a6a6a 100%)",
                border: "1px solid #2a2a2a",
                transform: "translate(-50%, -50%)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
              }}
            />
          </div>

          <div className="font-mono text-[11px] text-[#1a1a1a] whitespace-nowrap px-1">
            {fmt(cur)} / {fmt(duration)}
          </div>

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="w-[18px] h-[18px] flex items-center justify-center bg-transparent border-0 cursor-pointer p-0 flex-shrink-0"
            aria-label="mute"
          >
            <svg width="16" height="14" viewBox="0 0 16 14">
              <path
                d="M1 5 L1 9 L4 9 L8 12 L8 2 L4 5 Z"
                fill="#1a1a1a"
                stroke="#1a1a1a"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
              {!(muted || volPct === 0) && (
                <path
                  d="M9.5 4.5 Q11 7 9.5 9.5"
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              )}
              {!(muted || volPct < 50) && (
                <path
                  d="M11.5 3 Q14 7 11.5 11"
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>

          <div
            ref={volTrackRef}
            className="relative h-[10px] cursor-pointer"
            style={{
              width: "50px",
              background: "linear-gradient(180deg, #5a5a5a 0%, #8a8a8a 100%)",
              border: "1px solid #3a3a3a",
              borderRadius: "1px",
            }}
            onMouseDown={(e) => {
              setDraggingVol(true);
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const pct = Math.max(0, Math.min(1, x / rect.width));
              const v = Math.round(pct * 100);
              setVol(v);
              if (v > 0) setMuted(false);
            }}
          >
            <div
              className="absolute left-0 top-0 bottom-0"
              style={{
                width: `${volPct}%`,
                background: "linear-gradient(180deg, #888 0%, #aaa 100%)",
                borderRight: "1px solid #555",
              }}
            />
            <div
              className="absolute top-1/2 w-[10px] h-[10px] rounded-full pointer-events-none"
              style={{
                left: `${volPct}%`,
                background:
                  "radial-gradient(circle at 35% 30%, #f0f0f0 0%, #b8b8b8 50%, #6a6a6a 100%)",
                border: "1px solid #2a2a2a",
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
