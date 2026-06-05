import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useSymspy, type SymspyPhase } from "../state/symspy";
import manifest from "./ransom_manifest.json";

const FINAL_MESSAGE = "You will soon come to find that things are rarely as they seem";
const DOT_REVEAL_INTERVAL_MS = 300;
const DOTS_PER_SET = 3;
const DOT_HEIGHT_PX = 28;
const DOT_GAP_PX = 6;

const WORD_REVEAL_INTERVAL_MS = 200;
// How long after the last word lands before Leave fires.
const MESSAGE_READ_AFTER_REVEAL_MS = 1500;
// How long after Leave starts before the text begins fading out — i.e., the
// Leave animation gets this much head-start with the message still on screen.
const MESSAGE_FADE_AFTER_LEAVE_MS = 2500;
const MESSAGE_HEIGHT_PX = 32;
const MESSAGE_LETTER_GAP_PX = 4;
const MESSAGE_WORD_GAP_PX = 16;

const isDotPhase = (p: SymspyPhase) =>
  p === "dots-1" || p === "dots-2" || p === "dots-3";

type Glyph = { src: string; key: string };

const ATLAS_URL = "/textures/ransom";

// Hardcoded, deterministic variant index per char position. Stable across
// mounts so we can preload exactly the set of images we'll show.
function buildFinalWords(): { words: Glyph[][]; srcs: string[] } {
  const words: Glyph[][] = [];
  const srcs: string[] = [];
  let charIndex = 0;
  for (const word of FINAL_MESSAGE.split(" ")) {
    const wordGlyphs: Glyph[] = [];
    for (const ch of word) {
      const key = ch === "." ? "Period" : ch.toUpperCase();
      const variants = (manifest as Record<string, string[]>)[key];
      if (!variants || variants.length === 0) {
        charIndex++;
        continue;
      }
      const variant = variants[charIndex % variants.length];
      const src = `${ATLAS_URL}/${key}/${variant}`;
      wordGlyphs.push({ src, key: `${key}-${charIndex}` });
      srcs.push(src);
      charIndex++;
    }
    if (wordGlyphs.length) words.push(wordGlyphs);
  }
  return { words, srcs };
}

const FINAL_WORDS = buildFinalWords();

const PERIOD_SRCS: string[] = (
  (manifest as Record<string, string[]>).Period ?? []
).map((v) => `${ATLAS_URL}/Period/${v}`);

const BOOT_PRELOAD_SRCS = Array.from(
  new Set([...FINAL_WORDS.srcs, ...PERIOD_SRCS]),
);

// Kick the fetches at module-load time (i.e., as soon as App imports this
// component), so the browser starts streaming the WebPs during the splash
// screen instead of waiting for the user to click Subconscious.
if (typeof window !== "undefined") {
  for (const src of BOOT_PRELOAD_SRCS) {
    const img = new Image();
    img.src = src;
  }
}

function pickDotVariants(): string[] {
  const variants = (manifest as Record<string, string[]>).Period ?? ["1.webp"];
  const out: string[] = [];
  for (let i = 0; i < DOTS_PER_SET; i++) {
    out.push(variants[Math.floor(Math.random() * variants.length)]);
  }
  return out;
}

export function SymspyDialogue() {
  const phase = useSymspy((s) => s.phase);
  const [revealedDots, setRevealedDots] = useState(0);
  const [revealedWords, setRevealedWords] = useState(0);
  const [messageFading, setMessageFading] = useState(false);

  // Belt-and-suspenders: also kick fetches on mount. Module-load preload runs
  // when App imports this file; this useEffect covers HMR cases where the
  // module is re-evaluated mid-session without the browser re-fetching.
  useEffect(() => {
    for (const src of BOOT_PRELOAD_SRCS) {
      const img = new Image();
      img.src = src;
    }
  }, []);

  const dotVariants = useMemo<string[]>(() => {
    if (!isDotPhase(phase)) return [];
    return pickDotVariants();
  }, [phase]);

  // useLayoutEffect so the reset to revealedDots=1 happens BEFORE paint
  // when phase transitions dots-1 -> dots-2 -> dots-3. Otherwise the first
  // frame of the new phase would render with the previous phase's
  // revealedDots=3 and the new (random) variants, showing all three dots
  // for one frame before snapping back to one.
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
    if (phase !== "message") {
      if (phase !== "leave") setRevealedWords(0);
      return;
    }
    setRevealedWords(1);
    setMessageFading(false);
    const timers: number[] = [];
    for (let i = 1; i < FINAL_WORDS.words.length; i++) {
      timers.push(
        window.setTimeout(
          () => setRevealedWords(i + 1),
          WORD_REVEAL_INTERVAL_MS * i,
        ),
      );
    }
    const totalRevealMs = WORD_REVEAL_INTERVAL_MS * FINAL_WORDS.words.length;
    timers.push(
      window.setTimeout(() => {
        if (useSymspy.getState().phase === "message") {
          useSymspy.getState().setPhase("leave");
        }
      }, totalRevealMs + MESSAGE_READ_AFTER_REVEAL_MS),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "leave") {
      if (phase !== "message") setMessageFading(false);
      return;
    }
    const t = window.setTimeout(
      () => setMessageFading(true),
      MESSAGE_FADE_AFTER_LEAVE_MS,
    );
    return () => window.clearTimeout(t);
  }, [phase]);

  if (isDotPhase(phase)) {
    const allRevealed = revealedDots >= DOTS_PER_SET;
    return (
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none text-center">
        <div
          className="flex flex-wrap items-end justify-center"
          style={{ gap: `${DOT_GAP_PX}px` }}
        >
          {dotVariants.map((variant, i) => (
            <img
              key={`${phase}-${i}`}
              src={`${ATLAS_URL}/Period/${variant}`}
              alt=""
              draggable={false}
              style={{
                height: DOT_HEIGHT_PX,
                width: "auto",
                objectFit: "contain",
                opacity: i < revealedDots ? 1 : 0,
                transition: "opacity 120ms linear",
              }}
            />
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
    );
  }

  if (phase === "message" || phase === "leave") {
    return (
      <div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none text-center transition-opacity duration-700 ease-linear"
        style={{
          opacity: messageFading ? 0 : 1,
          maxWidth: "min(90vw, 1100px)",
        }}
      >
        <div
          className="flex flex-wrap items-end justify-center"
          style={{ rowGap: `${MESSAGE_LETTER_GAP_PX * 2}px`, columnGap: `${MESSAGE_WORD_GAP_PX}px` }}
        >
          {FINAL_WORDS.words.map((wordGlyphs, wi) => (
            <div
              key={`w-${wi}`}
              className="flex items-end"
              style={{
                gap: `${MESSAGE_LETTER_GAP_PX}px`,
                opacity: wi < revealedWords ? 1 : 0,
                transition: "opacity 500ms ease-out",
              }}
            >
              {wordGlyphs.map((g) => (
                <img
                  key={g.key}
                  src={g.src}
                  alt=""
                  draggable={false}
                  style={{
                    height: MESSAGE_HEIGHT_PX,
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
