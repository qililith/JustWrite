import { create } from "zustand";

type ZenState = {
  isZen: boolean;
  setZen: (value: boolean) => void;
  toggleZen: () => void;
};

async function requestBrowserFullscreen() {
  const root = document.documentElement;
  if (!document.fullscreenElement && root.requestFullscreen) {
    try {
      await root.requestFullscreen();
    } catch {
      // API 不可用或被拒绝时仍进入 zen
    }
  }
}

async function exitBrowserFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen) {
    try {
      await document.exitFullscreen();
    } catch {
      // ignore
    }
  }
}

export const useZenStore = create<ZenState>((set, get) => ({
  isZen: false,
  setZen: (value) => {
    set({ isZen: value });
    document.documentElement.dataset.zen = value ? "true" : "false";
    document.documentElement.classList.toggle("is-zen", value);
    if (value) void requestBrowserFullscreen();
    else void exitBrowserFullscreen();
  },
  toggleZen: () => {
    get().setZen(!get().isZen);
  },
}));

export function syncZenWithFullscreen() {
  const isFull = Boolean(document.fullscreenElement);
  const { isZen, setZen } = useZenStore.getState();
  if (!isFull && isZen) {
    document.documentElement.dataset.zen = "false";
    document.documentElement.classList.remove("is-zen");
    useZenStore.setState({ isZen: false });
  }
  if (isFull && !isZen) {
    setZen(true);
  }
}
