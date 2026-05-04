import { useEffect, useRef, useState } from "react";
import { useControls, folder } from "leva";
import { useBook } from "../state/book";

const FLIP_URLS = [
  "/audio/flip1.mp3",
  "/audio/flip2.mp3",
  "/audio/flip3.mp3",
];
const FLIP_VOLUME = 0.21;

const PAGES = [
  "/book/cover.jpg",
  ...Array.from({ length: 33 }, (_, i) =>
    `/book/spread_${String(i + 1).padStart(2, "0")}.jpg`,
  ),
];

export function BookOverlay() {
  const open = useBook((s) => s.open);
  const pageIndex = useBook((s) => s.pageIndex);
  const setPageIndex = useBook((s) => s.setPageIndex);

  const { framePadding, tileSize, tileOpacity, frameDarken, slideMs } =
    useControls({
      book: folder({
        framePadding: { value: 6, min: 0, max: 60, step: 1 },
        tileSize: { value: 460, min: 32, max: 800, step: 4 },
        tileOpacity: { value: 0.82, min: 0, max: 1, step: 0.01 },
        frameDarken: { value: 0.29, min: 0, max: 1, step: 0.01 },
        slideMs: { value: 800, min: 0, max: 2000, step: 10 },
      }),
    });

  const flipAudiosRef = useRef<HTMLAudioElement[]>([]);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const r = requestAnimationFrame(() =>
      requestAnimationFrame(() => setEntered(true)),
    );
    return () => cancelAnimationFrame(r);
  }, [open]);

  useEffect(() => {
    const audios = FLIP_URLS.map((url) => {
      const a = new Audio(url);
      a.volume = FLIP_VOLUME;
      a.addEventListener("error", () =>
        console.warn("[flip] failed to load:", url, a.error),
      );
      return a;
    });
    flipAudiosRef.current = audios;
    return () => {
      for (const a of audios) {
        a.pause();
        a.src = "";
      }
      flipAudiosRef.current = [];
    };
  }, []);

  const playFlip = () => {
    const audios = flipAudiosRef.current;
    if (audios.length === 0) return;
    const a = audios[Math.floor(Math.random() * audios.length)];
    a.currentTime = 0;
    a.play().catch((err) => console.warn("[flip] play:", err));
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        const i = useBook.getState().pageIndex;
        if (i > 0) {
          playFlip();
          setPageIndex(i - 1);
        }
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        const i = useBook.getState().pageIndex;
        if (i < PAGES.length - 1) {
          playFlip();
          setPageIndex(i + 1);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setPageIndex]);

  if (!open) return null;

  const atFirst = pageIndex === 0;
  const atLast = pageIndex === PAGES.length - 1;

  return (
    <div className="absolute inset-0 z-30 bg-black/15 flex items-center justify-center select-none">
      <div
        className="relative inline-block"
        style={{
          padding: `${framePadding}px`,
          transform: entered ? "translateY(0)" : "translateY(110vh)",
          transition: `transform ${slideMs}ms cubic-bezier(0.1, 0.75, 0.25, 1)`,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url('/book/herringbone_tile_1600.png')",
            backgroundRepeat: "repeat",
            backgroundSize: `${tileSize}px`,
            opacity: tileOpacity,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `rgba(0,0,0,${frameDarken})` }}
        />
      <div className="relative inline-block">
        <img
          src={PAGES[pageIndex]}
          alt={`page ${pageIndex + 1}`}
          draggable={false}
          className="block max-w-[88vw] max-h-[88vh]"
        />

        {!atFirst && (
          <>
            <div
              className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-12 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.13) 50%, transparent 100%)",
                mixBlendMode: "multiply",
              }}
            />
            <div
              className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] pointer-events-none"
              style={{
                background: "rgba(0,0,0,0.35)",
                mixBlendMode: "multiply",
              }}
            />
          </>
        )}

        {!atFirst && (
          <button
            type="button"
            aria-label="previous page"
            onClick={() => {
              playFlip();
              setPageIndex(pageIndex - 1);
            }}
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
          aria-label="next page"
          onClick={() => {
            playFlip();
            setPageIndex(pageIndex + 1);
          }}
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
      </div>
    </div>
  );
}
