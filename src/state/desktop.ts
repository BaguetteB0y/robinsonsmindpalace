import { create } from "zustand";

export type DesktopWindowId = "contact" | "mementos";

export type DesktopWindow = {
  id: DesktopWindowId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
};

type State = {
  wins: Record<string, DesktopWindow>;
  topZ: number;
  open: (id: DesktopWindowId, defaults: Omit<DesktopWindow, "id" | "z">) => void;
  close: (id: DesktopWindowId) => void;
  focus: (id: DesktopWindowId) => void;
  move: (id: DesktopWindowId, x: number, y: number) => void;
};

export const useDesktop = create<State>((set) => ({
  wins: {},
  topZ: 1,
  open: (id, defaults) =>
    set((s) => {
      const nextZ = s.topZ + 1;
      const existing = s.wins[id];
      if (existing) {
        return {
          wins: { ...s.wins, [id]: { ...existing, z: nextZ } },
          topZ: nextZ,
        };
      }
      return {
        wins: {
          ...s.wins,
          [id]: { id, z: nextZ, ...defaults },
        },
        topZ: nextZ,
      };
    }),
  close: (id) =>
    set((s) => {
      if (!s.wins[id]) return s;
      const next = { ...s.wins };
      delete next[id];
      return { wins: next };
    }),
  focus: (id) =>
    set((s) => {
      const w = s.wins[id];
      if (!w || w.z === s.topZ) return s;
      const nextZ = s.topZ + 1;
      return {
        wins: { ...s.wins, [id]: { ...w, z: nextZ } },
        topZ: nextZ,
      };
    }),
  move: (id, x, y) =>
    set((s) => {
      const w = s.wins[id];
      if (!w) return s;
      return { wins: { ...s.wins, [id]: { ...w, x, y } } };
    }),
}));
