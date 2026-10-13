import { create } from "zustand";
import { isDesktop, setWindowFullscreen } from "@/platform/desktop";

type ZenState = {
  isZen: boolean;
  setZen: (value: boolean) => void;
  toggleZen: () => void;
};

async function enterFullscreen() {
  if (isDesktop()) {
    await setWindowFullscreen(true).catch(() => undefined);
    return;
  }
  const root = document.documentElement;
  if (!document.fullscreenElement && root.requestFullscreen) {
    try {
      await root.requestFullscreen();
    } catch {
      // API 不可用或被拒绝时仍进入 zen
    }
  }
}

async function exitFullscreen() {
  if (isDesktop()) {
    await setWindowFullscreen(false).catch(() => undefined);
    return;
  }
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
    if (value) void enterFullscreen();
    else void exitFullscreen();
  },
  toggleZen: () => {
    get().setZen(!get().isZen);
  },
}));

/** 全屏被外部改变（浏览器 Esc、系统快捷键）时让 zen 跟上。 */
export function syncZenWithFullscreen(isFull = Boolean(document.fullscreenElement)) {
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
