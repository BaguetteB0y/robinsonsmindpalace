import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Object3D, Vector3 } from "three";
import { useTV } from "../state/tv";

const JUKEBOX_TAG = "sketchfab_model003_click001";

type Track = {
  url: string;
  fullVolumeDist: number;
  silentDist: number;
  maxVolume: number;
};

const TRACKS: Track[] = [
  {
    url: "/audio/jukebox.mp3",
    fullVolumeDist: 1,
    silentDist: 8,
    maxVolume: 0.35,
  },
  {
    url:
      "/audio/" +
      encodeURIComponent(
        "[ASMR] Vinyl Crackle _ Record Player White Noise _ Vinyl Crackling.mp3",
      ),
    fullVolumeDist: 1,
    silentDist: 3,
    maxVolume: 0.5,
  },
];

const DEFAULT_TRACK = TRACKS.length - 1;

export function Jukebox() {
  const { camera, scene } = useThree();
  const jukeboxRef = useRef<Object3D | null>(null);
  const ownNames = useRef<Set<string>>(new Set());
  const audiosRef = useRef<HTMLAudioElement[]>([]);
  const trackRef = useRef<number>(DEFAULT_TRACK);
  const worldPos = useRef(new Vector3());
  const camPos = useRef(new Vector3());

  useEffect(() => {
    const audios = TRACKS.map((t) => {
      const a = new Audio(t.url);
      a.loop = true;
      a.volume = 0;
      a.addEventListener("error", () =>
        console.warn("[jukebox] failed to load:", t.url, a.error),
      );
      return a;
    });
    audiosRef.current = audios;
    return () => {
      for (const a of audios) {
        a.pause();
        a.src = "";
      }
      audiosRef.current = [];
    };
  }, []);

  useEffect(() => {
    const startDefault = () => {
      const audios = audiosRef.current;
      if (audios.length === 0) return;
      const idx = trackRef.current;
      if (idx < 0 || idx >= TRACKS.length) return;
      audios[idx]
        .play()
        .catch((err) => console.warn("[jukebox] auto-start failed:", err));
    };
    const onFirstGesture = () => {
      startDefault();
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
    window.addEventListener("pointerdown", onFirstGesture);
    window.addEventListener("keydown", onFirstGesture);
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
  }, []);

  useEffect(() => {
    const onInteract = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string }>).detail;
      if (!detail?.name || !ownNames.current.has(detail.name)) return;
      const audios = audiosRef.current;
      if (audios.length === 0) return;

      for (const a of audios) a.pause();

      trackRef.current = (trackRef.current + 1) % TRACKS.length;
      const idx = trackRef.current;
      const a = audios[idx];
      a.currentTime = 0;
      a.play().catch((err) => console.warn("[jukebox] play failed:", err));
    };
    window.addEventListener("interact", onInteract);
    return () => window.removeEventListener("interact", onInteract);
  }, []);

  useEffect(() => {
    let prev = useTV.getState().mode;
    return useTV.subscribe((s) => {
      if (s.mode === prev) return;
      const audios = audiosRef.current;
      if (s.mode !== "off" && prev === "off") {
        for (const a of audios) a.pause();
      } else if (s.mode === "off" && prev !== "off") {
        const idx = trackRef.current;
        if (idx >= 0 && idx < audios.length) {
          audios[idx]
            .play()
            .catch((err) => console.warn("[jukebox] resume:", err));
        }
      }
      prev = s.mode;
    });
  }, []);

  useFrame(() => {
    let jukebox = jukeboxRef.current;
    if (!jukebox) {
      let found: Object3D | null = null;
      scene.traverse((o) => {
        if (found) return;
        if (o.name.toLowerCase().includes(JUKEBOX_TAG)) {
          found = o;
        }
      });
      if (!found) return;
      jukebox = found;
      jukeboxRef.current = jukebox;
      const names = new Set<string>();
      (jukebox as Object3D).traverse((o) => {
        if (o.name) names.add(o.name);
      });
      ownNames.current = names;
    }

    const idx = trackRef.current;
    if (idx < 0 || idx >= TRACKS.length) return;
    const audio = audiosRef.current[idx];
    const track = TRACKS[idx];
    if (!audio || audio.paused) return;

    jukebox.getWorldPosition(worldPos.current);
    camera.getWorldPosition(camPos.current);
    const dist = worldPos.current.distanceTo(camPos.current);
    let v: number;
    if (dist <= track.fullVolumeDist) v = 1;
    else if (dist >= track.silentDist) v = 0;
    else
      v =
        (track.silentDist - dist) / (track.silentDist - track.fullVolumeDist);
    audio.volume = v * track.maxVolume;
  });

  return null;
}
