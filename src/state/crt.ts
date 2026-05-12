import { create } from "zustand";

type State = {
  curve: number;
  setCurve: (curve: number) => void;
};

export const useCrt = create<State>((set) => ({
  curve: 5,
  setCurve: (curve) => set({ curve }),
}));

export function curveScreenInset(curve: number): number {
  if (curve <= 0) return 0;
  let a = 1;
  const c2 = curve * curve;
  for (let i = 0; i < 10; i++) {
    const f = a + (a * a * a) / c2 - 1;
    const fp = 1 + (3 * a * a) / c2;
    a = a - f / fp;
  }
  if (a < 0) a = 0;
  if (a > 1) a = 1;
  return (1 - a) * 0.5;
}
