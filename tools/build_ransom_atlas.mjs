/**
 * Build ransom-note glyph library from the "Resource Boy" PNG scans.
 *
 * Picks N variants per character, downscales to MAX_HEIGHT, encodes as WebP,
 * writes to public/textures/ransom/{char}/{n}.webp, and emits a manifest.json
 * mapping each character to its available WebP filenames.
 *
 * Run with: npm run build-ransom
 */

import sharp from "sharp";
import {
  readdir,
  mkdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

const SRC = "Resource Boy - Ransom Note Letters";
const DST = "public/textures/ransom";
const SRC_MANIFEST = "src/scene/ransom_manifest.json";
const VARIANTS_PER_CHAR = 3;
const MAX_HEIGHT = 192;
const WEBP_QUALITY = 80;
const CHARS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"];
const SPECIAL_CHARS = {
  Period: [
    "_Special Characters/Dot.png",
    "_Special Characters/dot1.png",
    "_Special Characters/dot2.png",
  ],
};

await rm(DST, { recursive: true, force: true });
await mkdir(DST, { recursive: true });

const manifest = {};
let totalBytes = 0;
let totalFiles = 0;

for (const char of CHARS) {
  const srcDir = join(SRC, char);
  let files;
  try {
    files = (await readdir(srcDir))
      .filter((f) => f.toLowerCase().endsWith(".png"))
      .sort()
      .slice(0, VARIANTS_PER_CHAR);
  } catch (e) {
    console.warn(`[ransom] skipping '${char}': ${e.message}`);
    continue;
  }
  if (!files.length) continue;

  const dstDir = join(DST, char);
  await mkdir(dstDir, { recursive: true });

  const outputs = [];
  for (let i = 0; i < files.length; i++) {
    const srcFile = join(srcDir, files[i]);
    const dstFile = join(dstDir, `${i + 1}.webp`);
    await sharp(srcFile)
      .resize({ height: MAX_HEIGHT, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, alphaQuality: 100 })
      .toFile(dstFile);
    const { size } = await stat(dstFile);
    totalBytes += size;
    totalFiles++;
    outputs.push(`${i + 1}.webp`);
  }
  manifest[char] = outputs;
  console.log(`[ransom] ${char}: ${outputs.length} variants`);
}

for (const [key, srcList] of Object.entries(SPECIAL_CHARS)) {
  const dstDir = join(DST, key);
  await mkdir(dstDir, { recursive: true });
  const outputs = [];
  for (let i = 0; i < srcList.length; i++) {
    const srcRel = srcList[i];
    const srcFile = join(SRC, srcRel);
    const dstFile = join(dstDir, `${i + 1}.webp`);
    try {
      await sharp(srcFile)
        .resize({ height: MAX_HEIGHT, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, alphaQuality: 100 })
        .toFile(dstFile);
      const { size } = await stat(dstFile);
      totalBytes += size;
      totalFiles++;
      outputs.push(`${i + 1}.webp`);
      console.log(`[ransom] ${key}/${i + 1}: from ${srcRel}`);
    } catch (e) {
      console.warn(`[ransom] skipping ${key}/${i + 1} (${srcRel}): ${e.message}`);
    }
  }
  if (outputs.length) manifest[key] = outputs;
}

const manifestJson = JSON.stringify(manifest, null, 2);
await writeFile(join(DST, "manifest.json"), manifestJson);
await writeFile(SRC_MANIFEST, manifestJson);

console.log(
  `\n[ransom] wrote ${totalFiles} files, ${(totalBytes / 1e6).toFixed(2)} MB total -> ${DST}`,
);
console.log(`[ransom] manifest also written to ${SRC_MANIFEST}`);
