import { useEffect, useLayoutEffect, useState } from "react";
import { useSymspy, type SymspyPhase } from "../state/symspy";

const FINAL_MESSAGE = "You will soon come to find that things are rarely as they seem";
const DOT_REVEAL_INTERVAL_MS = 300;
const DOTS_PER_SET = 3;

const MESSAGE_DURATION_MS = 5000;

const FONT_CLASS =
  "text-white font-mono tracking-wider pointer-events-none text-center leading-tight";

const isDotPhase = (p: SymspyPhase) =>
  p === "dots-1" || p === "dots-2" || p === "dots-3";

export function SymspyDialogue() {
  const phase = useSymspy((s) => s.phase);
  const [revealedDots, setRevealedDots] = useState(0);
  const [messageMounted, setMessageMounted] = useState(false);
  const [messageVisible, setMessageVisible] = useState(false);

  useLayoutEffect(() => {
    if (!isDotPhase(phase)) {
      setRevealedDots(0);
      return;
    }
    setRevealedDots(1);
    const timers: number[] = [];
    for (let i = 1; i < DOTS_PER_SET; i++) {
      timers.push(
        window.setTimeout(
          () => setRevealedDots(i + 1),
          DOT_REVEAL_INTERVAL_MS * i,
        ),
      );
    }
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "message") return;
    const t = window.setTimeout(() => {
      if (useSymspy.getState().phase === "message") {
        useSymspy.getState().setPhase("leave");
      }
    }, MESSAGE_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Mirrors the intro splash in App.tsx: mount the element first at opacity 0,
  // then setTimeout to flip opacity to 1 on a later tick so the browser paints
  // the opacity:0 frame before the transition starts.
  useEffect(() => {
    const timers: number[] = [];
    if (phase === "message") {
      setMessageMounted(true);
      timers.push(window.setTimeout(() => setMessageVisible(true), 50));
    } else if (phase === "leave") {
      setMessageVisible(false);
      timers.push(window.setTimeout(() => setMessageMounted(false), 1000));
    } else {
      setMessageVisible(false);
      setMessageMounted(false);
    }
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [phase]);

  const allRevealed = revealedDots >= DOTS_PER_SET;

  return (
    <>
      {isDotPhase(phase) && (
        <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 ${FONT_CLASS}`}>
          <div className="flex items-baseline justify-center gap-[6px] text-[28px]">
            {Array.from({ length: DOTS_PER_SET }).map((_, i) => (
              <span
                key={`${phase}-${i}`}
                style={{
                  opacity: i < revealedDots ? 1 : 0,
                  transition: "opacity 120ms linear",
                }}
              >
                .
              </span>
            ))}
          </div>
          <div
            className="w-0 h-0 mx-auto mt-3
                       border-l-[6px] border-r-[6px] border-t-[8px]
                       border-l-transparent border-r-transparent border-t-white
                       animate-[symspyBlink_900ms_steps(2,end)_infinite]"
            style={{ opacity: allRevealed ? 1 : 0 }}
          />
        </div>
      )}
      {messageMounted && (
        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white text-[18px] font-mono tracking-wider pointer-events-none text-center leading-tight transition-opacity duration-1000 ease-linear"
          style={{
            opacity: messageVisible ? 1 : 0,
            maxWidth: "min(90vw, 1100px)",
          }}
        >
          {FINAL_MESSAGE}
        </div>
      )}
    </>
  );
}
