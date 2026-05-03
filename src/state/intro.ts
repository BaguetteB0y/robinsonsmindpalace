import { create } from "zustand";
import { AnimationAction, Object3D } from "three";

type State = {
  played: boolean;
  playing: boolean;
  cam: Object3D | null;
  action: AnimationAction | null;
  setRefs: (cam: Object3D | null, action: AnimationAction | null) => void;
  start: () => void;
  end: () => void;
};

export const useIntro = create<State>((set) => ({
  played: false,
  playing: false,
  cam: null,
  action: null,
  setRefs: (cam, action) => set({ cam, action }),
  start: () => set({ playing: true }),
  end: () => set({ played: true, playing: false }),
}));
