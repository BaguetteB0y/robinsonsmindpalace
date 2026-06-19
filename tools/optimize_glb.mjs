import { execSync } from "node:child_process";
import { renameSync, statSync, existsSync, unlinkSync } from "node:fs";

const SRC = "public/models/scene.glb";
const STAGE = (i) => `public/models/scene.stage${i}.tmp.glb`;
const OUT = "public/models/scene.opt.tmp.glb";

if (!existsSync(SRC)) {
  console.error(`Missing ${SRC}`);
  process.exit(1);
}

const before = statSync(SRC).size;
console.log(`Before: ${(before / 1e6).toFixed(2)} MB`);

const cli = (args, input, output) =>
  execSync(`npx -y @gltf-transform/cli ${args} "${input}" "${output}"`, {
    stdio: "inherit",
  });

cli(`webp --slots "*"`, SRC, STAGE(1));
cli(`prune`, STAGE(1), STAGE(2));
cli(`dedup`, STAGE(2), STAGE(3));
cli(`draco --method edgebreaker`, STAGE(3), OUT);

for (let i = 1; i <= 3; i++) {
  try {
    unlinkSync(STAGE(i));
  } catch {}
}

renameSync(OUT, SRC);
const after = statSync(SRC).size;
console.log(
  `After:  ${(after / 1e6).toFixed(2)} MB  (${(((before - after) / before) * 100).toFixed(1)}% smaller)`,
);
