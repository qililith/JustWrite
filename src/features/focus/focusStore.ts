import { create } from "zustand";

type FocusState = {
  focusId: string | null;
  focusTitle: string;
  setFocus: (id: string | null, title?: string) => void;
};

export const useFocusStore = create<FocusState>((set) => ({
  focusId: null,
  focusTitle: "",
  setFocus: (id, title = "") => set({ focusId: id, focusTitle: title }),
}));
