import { create } from "zustand";

export type SymspyPhase =
  | "idle"
  | "dots-1"
  | "dots-2"
  | "dots-3"
  | "turn"
  | "message"
  | "leave"
  | "done";

type State = {
  phase: SymspyPhase;
  setPhase: (p: SymspyPhase) => void;
};

export const useSymspy = create<State>((set) => ({
  phase: "idle",
  setPhase: (phase) => set({ phase }),
}));

export const symspyLocked = (phase: SymspyPhase): boolean =>
  phase !== "idle" && phase !== "done";
