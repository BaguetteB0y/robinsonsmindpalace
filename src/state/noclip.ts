import { create } from "zustand";

type State = {
  on: boolean;
  speed: number;
  setOn: (on: boolean) => void;
  setSpeed: (speed: number) => void;
};

export const useNoclip = create<State>((set) => ({
  on: false,
  speed: 6,
  setOn: (on) => set({ on }),
  setSpeed: (speed) => set({ speed }),
}));
