import { create } from "zustand";

export type DesktopWindowId =
  | "contact"
  | "mementos"
  | "image-viewer"
  | "audio-player";

export type DesktopWindow = {
  id: DesktopWindowId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
};

export type ViewerContent = {
  src: string;
  name: string;
  index: number;
};

export type PlayerContent = {
  src: string;
  name: string;
};

type State = {
  wins: Record<string, DesktopWindow>;
  topZ: number;
  viewer: ViewerContent | null;
  player: PlayerContent | null;
  open: (id: DesktopWindowId, defaults: Omit<DesktopWindow, "id" | "z">) => void;
  close: (id: DesktopWindowId) => void;
  focus: (id: DesktopWindowId) => void;
  move: (id: DesktopWindowId, x: number, y: number) => void;
  setViewer: (v: ViewerContent | null) => void;
  setPlayer: (p: PlayerContent | null) => void;
};

export const useDesktop = create<State>((set) => ({
  wins: {},
  topZ: 1,
  viewer: null,
  player: null,
  open: (id, defaults) =>
    set((s) => {
      const nextZ = s.topZ + 1;
      const existing = s.wins[id];
      if (existing) {
        return {
          wins: {
            ...s.wins,
            [id]: { ...existing, z: nextZ, title: defaults.title },
          },
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
      const patch: Partial<State> = { wins: next };
      if (id === "image-viewer") patch.viewer = null;
      if (id === "audio-player") patch.player = null;
      return patch as State;
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
  setViewer: (v) => set({ viewer: v }),
  setPlayer: (p) => set({ player: p }),
}));
