import { create } from "zustand";

export const SMOKE_TOTAL_MS = 10_000;
export const SMOKE_FADE_MS = 2_000;
const TEXT_DELAY_MS = 2_250;

type State = {
  smokingUntil: number;
  textVisible: boolean;
  playToken: number;
  triggerSmoke: () => void;
  setTextVisible: (v: boolean) => void;
};

export const useCigarette = create<State>((set) => ({
  smokingUntil: 0,
  textVisible: false,
  playToken: 0,
  triggerSmoke: () => {
    set((s) => ({
      smokingUntil: performance.now() + SMOKE_TOTAL_MS,
      playToken: s.playToken + 1,
    }));
    window.setTimeout(() => {
      set({ textVisible: true });
      // TEMP: audio is muted; auto-hide text 5 s after it appears so it doesn't stick.
      // Remove this block once <CigaretteAudio /> is re-enabled in App.tsx.
      window.setTimeout(() => set({ textVisible: false }), 5_000);
    }, TEXT_DELAY_MS);
  },
  setTextVisible: (v) => set({ textVisible: v }),
}));
