import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Object3D, Vector3 } from "three";
import { useTV } from "../state/tv";

const TV_TAG = "sketchfab_model004_click";
const TV_ON_URL = "/audio/tv_on.mp3";
const HUM_URL = "/audio/hum.mp3";

const FULL_VOLUME_DIST = 1;
const SILENT_DIST = 6;
const TV_ON_MAX_VOLUME = 0.5;
const HUM_MAX_VOLUME = 0.35;

export function TVPlayer() {
  const { camera, scene } = useThree();
  const tvRef = useRef<Object3D | null>(null);
  const ownNames = useRef<Set<string>>(new Set());
  const tvOnAudioRef = useRef<HTMLAudioElement | null>(null);
  const humAudioRef = useRef<HTMLAudioElement | null>(null);
  const worldPos = useRef(new Vector3());
  const camPos = useRef(new Vector3());

  useEffect(() => {
    const tvOn = new Audio(TV_ON_URL);
    tvOn.loop = false;
    tvOn.volume = 0;
    tvOn.addEventListener("error", () =>
      console.warn("[tv] tv_on failed:", tvOn.error),
    );
    tvOnAudioRef.current = tvOn;

    const hum = new Audio(HUM_URL);
    hum.loop = true;
    hum.volume = 0;
    hum.addEventListener("error", () =>
      console.warn("[tv] hum failed:", hum.error),
    );
    humAudioRef.current = hum;

    const onTvOnEnded = () => {
      const h = humAudioRef.current;
      if (!h) return;
      if (useTV.getState().mode === "off") return;
      h.currentTime = 0;
      h.play().catch((err) => console.warn("[tv] hum play:", err));
    };
    tvOn.addEventListener("ended", onTvOnEnded);

    return () => {
      tvOn.removeEventListener("ended", onTvOnEnded);
      tvOn.pause();
      tvOn.src = "";
      hum.pause();
      hum.src = "";
      tvOnAudioRef.current = null;
      humAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onInteract = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string }>).detail;
      if (!detail?.name || !ownNames.current.has(detail.name)) return;
      if (useTV.getState().mode !== "off") return;

      useTV.getState().setMode("menu");
      document.exitPointerLock();

      const tvOn = tvOnAudioRef.current;
      if (tvOn) {
        tvOn.currentTime = 0;
        tvOn.play().catch((err) => console.warn("[tv] tv_on play:", err));
      }
    };
    window.addEventListener("interact", onInteract);
    return () => window.removeEventListener("interact", onInteract);
  }, []);

  useEffect(() => {
    let prev = useTV.getState().mode;
    return useTV.subscribe((s) => {
      if (s.mode === prev) return;
      if (s.mode === "off" && prev !== "off") {
        tvOnAudioRef.current?.pause();
        humAudioRef.current?.pause();
      }
      prev = s.mode;
    });
  }, []);

  useFrame(() => {
    let tv = tvRef.current;
    if (!tv) {
      let found: Object3D | null = null;
      scene.traverse((o) => {
        if (found) return;
        if (o.name.toLowerCase().includes(TV_TAG)) {
          found = o;
        }
      });
      if (!found) return;
      tv = found;
      tvRef.current = tv;
      const names = new Set<string>();
      (tv as Object3D).traverse((o) => {
        if (o.name) names.add(o.name);
      });
      ownNames.current = names;
    }

    tv.getWorldPosition(worldPos.current);
    camera.getWorldPosition(camPos.current);
    const dist = worldPos.current.distanceTo(camPos.current);
    let v: number;
    if (dist <= FULL_VOLUME_DIST) v = 1;
    else if (dist >= SILENT_DIST) v = 0;
    else v = (SILENT_DIST - dist) / (SILENT_DIST - FULL_VOLUME_DIST);

    const tvOn = tvOnAudioRef.current;
    const hum = humAudioRef.current;
    if (tvOn) tvOn.volume = v * TV_ON_MAX_VOLUME;
    if (hum) hum.volume = v * HUM_MAX_VOLUME;
  });

  return null;
}
