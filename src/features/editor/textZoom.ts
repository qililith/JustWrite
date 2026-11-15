declare global {
  interface Window {
    __justwriteHostZoom?: (factor: number) => void;
  }
}

const KEY = "justwrite.textZoom";
const MIN = 0.75;
const MAX = 2;

function clamp(zoom: number) {
  return Math.min(MAX, Math.max(MIN, zoom));
}

function readZoom() {
  const raw = localStorage.getItem(KEY);
  if (raw == null || raw === "") return 1;
  const saved = Number(raw);
  return Number.isFinite(saved) ? clamp(saved) : 1;
}

function distance(touches: TouchList) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

/** 鼠标滚轮一格在 Windows 上大约是 ±100px；触控板捏合是一串很小的增量。 */
function factorFromWheel(dy: number) {
  if (Math.abs(dy) >= 40) return Math.exp(-(dy / 100) * 0.03);
  return Math.exp(-dy * 0.0025);
}

/** 触控板捏合与 Ctrl+滚轮缩放正文。比例记在本机，一行字数不变。 */
export function bindTextZoom() {
  let zoom = readZoom();
  let persist = 0;
  let pinch: { distance: number; zoom: number } | null = null;
  let wheelAt = 0;
  let pendingHost = 0;

  const apply = (next: number) => {
    zoom = clamp(next);
    document.documentElement.style.setProperty("--text-zoom", String(zoom));
    window.clearTimeout(persist);
    persist = window.setTimeout(() => localStorage.setItem(KEY, String(zoom)), 200);
  };

  apply(zoom);

  // 桌面版触控板捏合会先改 WebView 的窗口缩放。若同一手势没有滚轮事件，就把这个比例折到正文上。
  window.__justwriteHostZoom = (factor: number) => {
    if (!Number.isFinite(factor) || Math.abs(factor - 1) < 0.001) return;
    window.clearTimeout(pendingHost);
    pendingHost = window.setTimeout(() => {
      if (performance.now() - wheelAt < 80) return;
      apply(zoom * factor);
    }, 0);
  };

  const onWheel = (event: WheelEvent) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    wheelAt = performance.now();
    window.clearTimeout(pendingHost);
    const dy =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? event.deltaY * window.innerHeight
          : event.deltaY;
    apply(zoom * factorFromWheel(dy));
  };

  const onKey = (event: KeyboardEvent) => {
    if (!event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
    if (event.key === "0") {
      event.preventDefault();
      apply(1);
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      wheelAt = performance.now();
      apply(zoom * 1.04);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      wheelAt = performance.now();
      apply(zoom / 1.04);
    }
  };

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 2) return;
    pinch = { distance: distance(event.touches), zoom };
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!pinch || event.touches.length !== 2) return;
    event.preventDefault();
    const span = distance(event.touches);
    if (pinch.distance > 0) apply(pinch.zoom * (span / pinch.distance));
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (event.touches.length < 2) pinch = null;
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd);
  window.addEventListener("touchcancel", onTouchEnd);

  return () => {
    window.clearTimeout(persist);
    window.clearTimeout(pendingHost);
    delete window.__justwriteHostZoom;
    localStorage.setItem(KEY, String(zoom));
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
  };
}
