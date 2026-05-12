import { ReactNode, useRef } from "react";
import { DesktopWindowId, useDesktop } from "../state/desktop";
import { CRTPanel } from "./CRTPanel";

type Props = {
  id: DesktopWindowId;
  children: ReactNode;
};

export function DesktopWindow({ id, children }: Props) {
  const win = useDesktop((s) => s.wins[id]);
  const focus = useDesktop((s) => s.focus);
  const move = useDesktop((s) => s.move);
  const close = useDesktop((s) => s.close);
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(
    null,
  );

  if (!win) return null;

  const onTitleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    focus(id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y };
    (e.target as Element).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onTitleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    let nx = d.winX + (e.clientX - d.startX);
    let ny = d.winY + (e.clientY - d.startY);
    const bounds = (e.currentTarget as Element).closest(
      "[data-desktop-bounds]",
    ) as HTMLElement | null;
    if (bounds) {
      const pw = bounds.clientWidth;
      const ph = bounds.clientHeight;
      nx = Math.max(0, Math.min(Math.max(0, pw - win.w), nx));
      ny = Math.max(0, Math.min(Math.max(0, ph - win.h), ny));
    }
    move(id, nx, ny);
  };

  const onTitleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <CRTPanel
      className="bg-[#F5F1E5] border-2 border-[#3B362C] shadow-[4px_4px_0_rgba(59,54,44,0.4)] flex flex-col select-none"
      style={{
        position: "absolute",
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
        fontFamily: "'LowresPixel', 'VT323', 'Courier New', monospace",
        pointerEvents: "auto",
      }}
    >
      <div
        className="h-full flex flex-col"
        onPointerDown={() => focus(id)}
        style={{ position: "relative", zIndex: 1 }}
      >
        <div
          className="h-7 bg-[#B5483B] border-b-2 border-[#3B362C] flex items-center justify-between px-2 cursor-grab active:cursor-grabbing"
          onPointerDown={onTitleDown}
          onPointerMove={onTitleMove}
          onPointerUp={onTitleUp}
          onPointerCancel={onTitleUp}
        >
          <span className="text-[#F5F1E5] text-[14px] font-bold tracking-wide">{win.title}</span>
          <button
            className="w-2.5 h-2.5 bg-[#F5F1E5] border border-[#3B362C] hover:bg-[#FFD93D]"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => close(id)}
            aria-label="Close"
          />
        </div>
        <div className="flex-1 overflow-auto p-3 text-[#1A1A1A] text-[18px] leading-tight">
          {children}
        </div>
      </div>
    </CRTPanel>
  );
}
