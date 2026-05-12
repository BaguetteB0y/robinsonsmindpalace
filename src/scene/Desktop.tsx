import { useLayoutEffect, useRef } from "react";
import { useDesktop } from "../state/desktop";
import { useCrt, curveScreenInset } from "../state/crt";
import { ContactPage } from "./ContactPage";
import { MementosPage } from "./MementosPage";
import { DesktopWindow } from "./DesktopWindow";

const TASKBAR_PX = 56;

type Props = {
  visible: boolean;
};

export function Desktop({ visible }: Props) {
  const wins = useDesktop((s) => s.wins);
  const move = useDesktop((s) => s.move);
  const curve = useCrt((s) => s.curve);
  const insetPct = `${(curveScreenInset(curve) * 100).toFixed(2)}%`;
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pw = el.clientWidth;
    const ph = el.clientHeight;
    if (pw === 0 || ph === 0) return;
    for (const w of Object.values(wins)) {
      const maxX = Math.max(0, pw - w.w);
      const maxY = Math.max(0, ph - w.h);
      const nx = Math.max(0, Math.min(maxX, w.x));
      const ny = Math.max(0, Math.min(maxY, w.y));
      if (nx !== w.x || ny !== w.y) move(w.id, nx, ny);
    }
  }, [wins, curve, move]);

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
    </div>
  );
}
