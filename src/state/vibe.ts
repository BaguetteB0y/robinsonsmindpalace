import { create } from "zustand";

type VibeState = {
  values: Record<string, Record<string, unknown>>;
  push: (group: string, slice: Record<string, unknown>) => void;
};

export const useVibe = create<VibeState>((set) => ({
  values: {},
  push: (group, slice) =>
    set((s) => ({ values: { ...s.values, [group]: slice } })),
}));
