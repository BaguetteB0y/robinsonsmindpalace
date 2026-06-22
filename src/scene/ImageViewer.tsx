import { useEffect, useState } from "react";
import { DesktopWindow } from "./DesktopWindow";
import { useDesktop } from "../state/desktop";
import { MEMENTO_IMAGES } from "./MementosPage";

export function ImageViewer() {
  const viewer = useDesktop((s) => s.viewer);
  const setViewer = useDesktop((s) => s.setViewer);
  const open = useDesktop((s) => s.open);
  const win = useDesktop((s) => s.wins["image-viewer"]);
  const [revealPct, setRevealPct] = useState(0);

  useEffect(() => {
    if (!viewer?.src) return;
    setRevealPct(0);
    let cancelled = false;
    let pct = 0;
    const tick = () => {
      if (cancelled || pct >= 100) return;
      pct = Math.min(100, pct + 10 + Math.random() * 15);
      setRevealPct(pct);
      window.setTimeout(tick, 100 + Math.random() * 150);
    };
    const startId = window.setTimeout(tick, 30 + Math.random() * 60);
    return () => {
      cancelled = true;
      window.clearTimeout(startId);
    };
  }, [viewer?.src]);

  const go = (delta: number) => {
    const v = useDesktop.getState().viewer;
    if (!v) return;
    const next = v.index + delta;
    if (next < 0 || next >= MEMENTO_IMAGES.length) return;
    const entry = MEMENTO_IMAGES[next];
    setViewer({ src: entry.src, name: entry.name, index: next });
    const w = useDesktop.getState().wins["image-viewer"];
    if (w) {
      open("image-viewer", {
        title: entry.name,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
      });
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "ArrowLeft" && e.code !== "ArrowRight") return;
      const s = useDesktop.getState();
      const w = s.wins["image-viewer"];
      if (!w || w.z !== s.topZ) return;
      e.preventDefault();
      go(e.code === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!viewer || !win) return null;

  const atFirst = viewer.index === 0;
  const atLast = viewer.index === MEMENTO_IMAGES.length - 1;

  return (
    <DesktopWindow id="image-viewer">
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={viewer.src}
          alt={viewer.name}
          draggable={false}
          className="max-w-full max-h-full object-contain select-none"
          style={{ clipPath: `inset(0 0 ${100 - revealPct}% 0)` }}
        />

        {!atFirst && (
          <button
            type="button"
            aria-label="previous"
            onClick={() => go(-1)}
            className="group absolute bottom-2 left-2 bg-transparent border-0 p-0 cursor-pointer"
          >
            <img
              src="/book/cursor_left_inactive.png"
              alt=""
              draggable={false}
              className="block group-hover:hidden h-8 w-auto object-contain"
              style={{ imageRendering: "pixelated" }}
            />
            <img
              src="/book/cursor_left.png"
              alt=""
              draggable={false}
              className="hidden group-hover:block h-8 w-auto object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          </button>
        )}

        {!atLast && (
          <button
            type="button"
            aria-label="next"
            onClick={() => go(1)}
            className="group absolute bottom-2 right-2 bg-transparent border-0 p-0 cursor-pointer"
          >
            <img
              src="/book/cursor_right_inactive.png"
              alt=""
              draggable={false}
              className="block group-hover:hidden h-8 w-auto object-contain"
              style={{ imageRendering: "pixelated" }}
            />
            <img
              src="/book/cursor_right.png"
              alt=""
              draggable={false}
              className="hidden group-hover:block h-8 w-auto object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          </button>
        )}
      </div>
    </DesktopWindow>
  );
}
