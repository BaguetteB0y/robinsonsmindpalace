import { create } from "zustand";
import { Box3, Object3D } from "three";

type CollideState = {
  solids: Box3[];
  dynamicSolids: Object3D[];
  setSolids: (s: Box3[]) => void;
  setDynamicSolids: (s: Object3D[]) => void;
};

export const useCollide = create<CollideState>((set) => ({
  solids: [],
  dynamicSolids: [],
  setSolids: (solids) => set({ solids }),
  setDynamicSolids: (dynamicSolids) => set({ dynamicSolids }),
}));
