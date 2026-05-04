import { create } from "zustand";

type State = {
  open: boolean;
  pageIndex: number;
  setOpen: (open: boolean) => void;
  setPageIndex: (i: number) => void;
};

export const useBook = create<State>((set) => ({
  open: false,
  pageIndex: 0,
  setOpen: (open) =>
    set((s) => ({ open, pageIndex: open ? 0 : s.pageIndex })),
  setPageIndex: (pageIndex) => set({ pageIndex }),
}));
