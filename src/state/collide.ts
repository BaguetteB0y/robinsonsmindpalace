import { create } from "zustand";
import { Box3 } from "three";

type CollideState = {
  solids: Box3[];
  setSolids: (s: Box3[]) => void;
};

export const useCollide = create<CollideState>((set) => ({
  solids: [],
  setSolids: (solids) => set({ solids }),
}));
