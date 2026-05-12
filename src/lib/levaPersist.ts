import { levaStore } from "leva";

const KEY = "leva-state-v1";

let started = false;
let saveTimer = 0;

function readStored(): Record<string, any> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function snapshot(): Record<string, any> {
  const data = (levaStore as any).getData?.() ?? {};
  const out: Record<string, any> = {};
  for (const [path, item] of Object.entries(data)) {
    const v = (item as any)?.value;
    if (v === undefined) continue;
    if (typeof v === "function") continue;
    out[path] = v;
  }
  return out;
}

function persist() {
  if (saveTimer) return;
  saveTimer = window.setTimeout(() => {
    saveTimer = 0;
    try {
      localStorage.setItem(KEY, JSON.stringify(snapshot()));
    } catch {}
  }, 250);
}

function applyStored() {
  const stored = readStored();
  if (!stored || Object.keys(stored).length === 0) return;
  const data = (levaStore as any).getData?.() ?? {};
  const toApply: Record<string, any> = {};
  for (const [path, val] of Object.entries(stored)) {
    if (data[path]) toApply[path] = val;
  }
  if (Object.keys(toApply).length > 0) {
    try {
      (levaStore as any).set(toApply, false);
    } catch {}
  }
}

export function initLevaPersistence() {
  if (started) return;
  started = true;

  for (const ms of [0, 100, 400, 1200]) {
    window.setTimeout(applyStored, ms);
  }

  try {
    const useStore = (levaStore as any).useStore;
    useStore?.subscribe?.(() => persist());
  } catch {}
}
