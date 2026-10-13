import { create } from "zustand";
import type { OutlineItem } from "./extractOutline";

type OutlineState = {
  items: OutlineItem[];
  activeId: string | null;
  query: string;
  collapsed: Record<string, boolean>;
  setItems: (items: OutlineItem[]) => void;
  setActiveId: (id: string | null) => void;
  setQuery: (query: string) => void;
  toggleCollapsed: (id: string) => void;
};

export const useOutlineStore = create<OutlineState>((set, get) => ({
  items: [],
  activeId: null,
  query: "",
  collapsed: {},
  setItems: (items) => {
    if (JSON.stringify(get().items) === JSON.stringify(items)) return;
    set({ items });
  },
  setActiveId: (id) => {
    if (get().activeId === id) return;
    set({ activeId: id });
  },
  setQuery: (query) => set({ query }),
  toggleCollapsed: (id) =>
    set({ collapsed: { ...get().collapsed, [id]: !get().collapsed[id] } }),
}));
