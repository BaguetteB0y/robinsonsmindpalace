import { execSync } from "node:child_process";
import { renameSync, statSync, existsSync } from "node:fs";

const SRC = "public/models/scene.glb";
const TMP = "public/models/scene.opt.tmp.glb";

if (!existsSync(SRC)) {
  console.error(`Missing ${SRC}`);
  process.exit(1);
}

const before = statSync(SRC).size;
console.log(`Before: ${(before / 1e6).toFixed(2)} MB`);

execSync(`npx -y @gltf-transform/cli webp "${SRC}" "${TMP}" --slots "*"`, {
  stdio: "inherit",
});

renameSync(TMP, SRC);
const after = statSync(SRC).size;
console.log(
  `After:  ${(after / 1e6).toFixed(2)} MB  (${(((before - after) / before) * 100).toFixed(1)}% smaller)`,
);
