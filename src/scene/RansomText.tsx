import { useMemo } from "react";
import manifest from "./ransom_manifest.json";

const ATLAS_URL = "/textures/ransom";

type Glyph = { kind: "img"; src: string; key: string } | { kind: "space" };

function charKey(c: string): string | null {
  if (c === " ") return null;
  if (c === ".") return "Period";
  const up = c.toUpperCase();
  if (manifest[up as keyof typeof manifest]) return up;
  return null;
}

function pickVariant(key: string): string {
  const variants = (manifest as Record<string, string[]>)[key];
  if (!variants || variants.length === 0) return "1.webp";
  return variants[Math.floor(Math.random() * variants.length)];
}

type Props = {
  text: string;
  heightPx?: number;
  gapPx?: number;
  className?: string;
};

export function RansomText({
  text,
  heightPx = 36,
  gapPx = 4,
  className,
}: Props) {
  const glyphs = useMemo<Glyph[]>(() => {
    const out: Glyph[] = [];
    for (const ch of text) {
      const key = charKey(ch);
      if (key === null) {
        out.push({ kind: "space" });
        continue;
      }
      const variant = pickVariant(key);
      out.push({
        kind: "img",
        src: `${ATLAS_URL}/${key}/${variant}`,
        key: `${key}-${variant}-${out.length}`,
      });
    }
    return out;
  }, [text]);

  const spaceWidth = Math.round(heightPx * 0.4);

  return (
    <div
      className={`flex flex-wrap items-end justify-center ${className ?? ""}`}
      style={{ gap: `${gapPx}px` }}
    >
      {glyphs.map((g, i) =>
        g.kind === "space" ? (
          <span
            key={`sp-${i}`}
            style={{ width: spaceWidth, height: heightPx }}
            aria-hidden
          />
        ) : (
          <img
            key={g.key}
            src={g.src}
            alt=""
            draggable={false}
            style={{ height: heightPx, width: "auto", objectFit: "contain" }}
          />
        ),
      )}
    </div>
  );
}
