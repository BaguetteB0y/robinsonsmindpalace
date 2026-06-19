import sharp from "sharp";
import { readdirSync, statSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const QUALITY = 80;
const DELETE_ORIGINALS = process.argv.includes("--delete");

const TARGETS = [
  { path: "public/book/herringbone_tile_1600.png" },
  { path: "public/book/cover.jpg" },
  { dir: "public/mementos", match: /\.jpe?g$/i },
  { dir: "public/book", match: /^spread_\d+\.jpg$/i },
];

const collect = (t) => {
  if (t.path) return existsSync(t.path) ? [t.path] : [];
  return readdirSync(t.dir)
    .filter((f) => t.match.test(f))
    .map((f) => join(t.dir, f));
};

let totalBefore = 0;
let totalAfter = 0;
let count = 0;

for (const t of TARGETS) {
  for (const inPath of collect(t)) {
    const outPath = inPath.replace(/\.(jpe?g|png)$/i, ".webp");
    if (existsSync(outPath) && outPath !== inPath) {
      console.log(`skip exists: ${outPath}`);
      continue;
    }
    const before = statSync(inPath).size;
    await sharp(inPath).webp({ quality: QUALITY }).toFile(outPath);
    const after = statSync(outPath).size;
    totalBefore += before;
    totalAfter += after;
    count++;
    const pct = (((before - after) / before) * 100).toFixed(1);
    console.log(
      `${inPath} -> ${outPath}: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB (-${pct}%)`,
    );
    if (DELETE_ORIGINALS) unlinkSync(inPath);
  }
}

console.log(
  `\n${count} files. Total: ${(totalBefore / 1e6).toFixed(2)} MB -> ${(totalAfter / 1e6).toFixed(2)} MB (saved ${((totalBefore - totalAfter) / 1e6).toFixed(2)} MB)`,
);
if (!DELETE_ORIGINALS) {
  console.log("Originals kept. Re-run with --delete to remove them.");
}
