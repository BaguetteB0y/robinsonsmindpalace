import { create } from "zustand";

export type TVMode = "off" | "menu" | "playing";

type State = {
  mode: TVMode;
  videoIndex: number | null;
  setMode: (m: TVMode) => void;
  setVideoIndex: (i: number | null) => void;
};

export const useTV = create<State>((set) => ({
  mode: "off",
  videoIndex: null,
  setMode: (mode) => set({ mode }),
  setVideoIndex: (videoIndex) => set({ videoIndex }),
}));
