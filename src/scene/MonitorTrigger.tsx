import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Object3D } from "three";
import { useMonitor } from "../state/monitor";

const TAG = "monitor_click_glow";
const PERIPHERAL_NAMES = new Set(["Keyboard_click", "Mouse_click", "CPU_click"]);
const DIALUP_URL = "/audio/dialup.mp3";
const DIALUP_VOLUME = 0.3;

export function MonitorTrigger() {
  const { scene } = useThree();
  const monitorRef = useRef<Object3D | null>(null);
  const ownNames = useRef<Set<string>>(new Set());
  const dialupRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(DIALUP_URL);
    a.volume = DIALUP_VOLUME;
    a.addEventListener("error", () =>
      console.warn("[dialup] failed to load:", DIALUP_URL, a.error),
    );
    dialupRef.current = a;
    return () => {
      a.pause();
      a.src = "";
      dialupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onInteract = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string }>).detail;
      if (!detail?.name) return;
      const isMonitor = ownNames.current.has(detail.name);
      const isPeripheral = PERIPHERAL_NAMES.has(detail.name);
      if (!isMonitor && !isPeripheral) return;
      if (useMonitor.getState().open) return;
      useMonitor.getState().setOpen(true);
      document.exitPointerLock();
      const d = dialupRef.current;
      if (d) {
        d.currentTime = 0;
        d.play().catch((err) => console.warn("[dialup] play:", err));
      }
    };
    window.addEventListener("interact", onInteract);
    return () => window.removeEventListener("interact", onInteract);
  }, []);

  useEffect(() => {
    let prev = useMonitor.getState().open;
    return useMonitor.subscribe((s) => {
      if (prev && !s.open) {
        const d = dialupRef.current;
        if (d) {
          d.pause();
          d.currentTime = 0;
        }
      }
      prev = s.open;
    });
  }, []);

  useFrame(() => {
    if (monitorRef.current) return;
    let found: Object3D | null = null;
    scene.traverse((o) => {
      if (found) return;
      if (o.name.toLowerCase().includes(TAG)) found = o;
    });
    if (!found) return;
    monitorRef.current = found;
    const names = new Set<string>();
    (found as Object3D).traverse((o) => {
      if (o.name) names.add(o.name);
    });
    ownNames.current = names;
  });

  return null;
}
