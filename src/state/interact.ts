import { create } from "zustand";
import { Mesh } from "three";

type InteractState = {
  meshes: Mesh[];
  targetName: string | null;
  setMeshes: (m: Mesh[]) => void;
  setTarget: (name: string | null) => void;
};

export const useInteract = create<InteractState>((set) => ({
  meshes: [],
  targetName: null,
  setMeshes: (meshes) => set({ meshes }),
  setTarget: (targetName) => set({ targetName }),
}));
