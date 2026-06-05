import { readFile } from "node:fs/promises";

const SRC = "public/models/scene.glb";
const FILTER = process.argv[2]; // optional: substring to filter animation names

const buf = await readFile(SRC);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

const magic = dv.getUint32(0, true);
if (magic !== 0x46546c67) {
  console.error(`Not a GLB (magic=${magic.toString(16)})`);
  process.exit(1);
}

const jsonLen = dv.getUint32(12, true);
const jsonStart = 20;
const jsonBytes = buf.subarray(jsonStart, jsonStart + jsonLen);
const json = JSON.parse(new TextDecoder().decode(jsonBytes));

const anims = json.animations ?? [];
const nodes = json.nodes ?? [];

console.log(`Found ${anims.length} animation(s) in ${SRC}:\n`);
for (let i = 0; i < anims.length; i++) {
  const a = anims[i];
  const name = a.name ?? "(unnamed)";
  if (FILTER && !name.toLowerCase().includes(FILTER.toLowerCase())) continue;

  console.log(`  [${i}] ${name}  — ${a.channels?.length ?? 0} channels`);
  for (const ch of a.channels ?? []) {
    const nodeIdx = ch.target?.node;
    const path = ch.target?.path;
    const nodeName =
      nodeIdx != null ? nodes[nodeIdx]?.name ?? `(unnamed #${nodeIdx})` : "(no node)";
    console.log(`        - ${nodeName}  ::  ${path}`);
  }
}
