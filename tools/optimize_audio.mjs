import { execSync } from "node:child_process";
import { existsSync, statSync, unlinkSync } from "node:fs";

const DELETE_ORIGINALS = process.argv.includes("--delete");

const TARGETS = [
  { in: "public/audio/jukebox.mp3", out: "public/audio/jukebox.opus", bitrate: "64k" },
  { in: "public/audio/mementos.mp3", out: "public/audio/mementos.opus", bitrate: "64k" },
  { in: "public/audio/hum.mp3", out: "public/audio/hum.opus", bitrate: "32k" },
];

let totalBefore = 0;
let totalAfter = 0;

for (const t of TARGETS) {
  if (!existsSync(t.in)) {
    console.log(`skip missing: ${t.in}`);
    continue;
  }
  if (existsSync(t.out)) {
    console.log(`skip exists: ${t.out}`);
    continue;
  }
  const before = statSync(t.in).size;
  execSync(
    `ffmpeg -y -hide_banner -loglevel error -i "${t.in}" -c:a libopus -b:a ${t.bitrate} -vbr on -application audio "${t.out}"`,
    { stdio: "inherit" },
  );
  const after = statSync(t.out).size;
  totalBefore += before;
  totalAfter += after;
  const pct = (((before - after) / before) * 100).toFixed(1);
  console.log(
    `${t.in} -> ${t.out} (@${t.bitrate}): ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB (-${pct}%)`,
  );
  if (DELETE_ORIGINALS) unlinkSync(t.in);
}

console.log(
  `\nTotal: ${(totalBefore / 1e6).toFixed(2)} MB -> ${(totalAfter / 1e6).toFixed(2)} MB (saved ${((totalBefore - totalAfter) / 1e6).toFixed(2)} MB)`,
);
if (!DELETE_ORIGINALS) {
  console.log("Originals kept. Re-run with --delete to remove them.");
}
