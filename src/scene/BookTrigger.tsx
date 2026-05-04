import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Object3D } from "three";
import { useBook } from "../state/book";

const TAG = "sketchfab_model005_click_glow";
const WOOSH_URL = "/audio/swoosh.mp3";
const WOOSH_VOLUME = 0.05;

export function BookTrigger() {
  const { scene } = useThree();
  const bookRef = useRef<Object3D | null>(null);
  const ownNames = useRef<Set<string>>(new Set());
  const wooshRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(WOOSH_URL);
    a.volume = WOOSH_VOLUME;
    a.addEventListener("error", () =>
      console.warn("[woosh] failed to load:", WOOSH_URL, a.error),
    );
    wooshRef.current = a;
    return () => {
      a.pause();
      a.src = "";
      wooshRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onInteract = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string }>).detail;
      if (!detail?.name || !ownNames.current.has(detail.name)) return;
      if (useBook.getState().open) return;
      useBook.getState().setOpen(true);
      document.exitPointerLock();
      const w = wooshRef.current;
      if (w) {
        w.currentTime = 0;
        w.play().catch((err) => console.warn("[woosh] play:", err));
      }
    };
    window.addEventListener("interact", onInteract);
    return () => window.removeEventListener("interact", onInteract);
  }, []);

  useFrame(() => {
    if (bookRef.current) return;
    let found: Object3D | null = null;
    scene.traverse((o) => {
      if (found) return;
      if (o.name.toLowerCase().includes(TAG)) found = o;
    });
    if (!found) return;
    bookRef.current = found;
    const names = new Set<string>();
    (found as Object3D).traverse((o) => {
      if (o.name) names.add(o.name);
    });
    ownNames.current = names;
  });

  return null;
}
