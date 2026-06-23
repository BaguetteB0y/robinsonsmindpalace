import { create } from "zustand";

type Mode = "idle" | "walk" | "sprint";

type State = {
  mode: Mode;
  set: (mode: Mode) => void;
};

export const useWalk = create<State>((set) => ({
  mode: "idle",
  set: (mode) => set({ mode }),
}));
