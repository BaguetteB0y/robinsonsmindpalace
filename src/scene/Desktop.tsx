import { useLayoutEffect, useRef } from "react";
import { useDesktop } from "../state/desktop";
import { useCrt, curveScreenInset } from "../state/crt";
import { ContactPage } from "./ContactPage";
import { MementosPage } from "./MementosPage";
import { DesktopWindow } from "./DesktopWindow";
import { ImageViewer } from "./ImageViewer";
import { AudioPlayer } from "./AudioPlayer";

const TASKBAR_PX = 56;

type Props = {
  visible: boolean;
};

export function Desktop({ visible }: Props) {
  const wins = useDesktop((s) => s.wins);
  const move = useDesktop((s) => s.move);
  const resize = useDesktop((s) => s.resize);
  const curve = useCrt((s) => s.curve);
  const insetPct = `${(curveScreenInset(curve) * 100).toFixed(2)}%`;
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const clamp = () => {
      const pw = el.clientWidth;
      const ph = el.clientHeight;
      if (pw === 0 || ph === 0) return;
      for (const w of Object.values(useDesktop.getState().wins)) {
        const newW = Math.min(w.w, pw);
        const newH = Math.min(w.h, ph);
        if (newW !== w.w || newH !== w.h) resize(w.id, newW, newH);
        const maxX = Math.max(0, pw - newW);
        const maxY = Math.max(0, ph - newH);
        const nx = Math.max(0, Math.min(maxX, w.x));
        const ny = Math.max(0, Math.min(maxY, w.y));
        if (nx !== w.x || ny !== w.y) move(w.id, nx, ny);
      }
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [wins, curve, move, resize]);

  return (
    <div
      ref={ref}
      data-desktop-bounds
      className={`absolute transition-opacity duration-300 ${
        visible ? "opacity-100 delay-[1200ms]" : "opacity-0"
      }`}
      style={{
        left: insetPct,
        right: insetPct,
        top: insetPct,
        bottom: `calc(${insetPct} + ${TASKBAR_PX}px)`,
        pointerEvents: "none",
      }}
    >
      {wins.contact && (
        <DesktopWindow id="contact">
          <ContactPage />
        </DesktopWindow>
      )}
      {wins.mementos && (
        <DesktopWindow id="mementos">
          <MementosPage />
        </DesktopWindow>
      )}
      {wins["image-viewer"] && <ImageViewer />}
      {wins["audio-player"] && <AudioPlayer />}
    </div>
  );
}
