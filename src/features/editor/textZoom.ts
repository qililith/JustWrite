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

/** 触控板捏合与 Ctrl+滚轮缩放正文。比例记在本机，一行字数不变。 */
export function bindTextZoom() {
  let zoom = readZoom();
  let persist = 0;
  let pinch: { distance: number; zoom: number } | null = null;

  const apply = (next: number) => {
    zoom = clamp(next);
    document.documentElement.style.setProperty("--text-zoom", String(zoom));
    window.clearTimeout(persist);
    persist = window.setTimeout(() => localStorage.setItem(KEY, String(zoom)), 200);
  };

  apply(zoom);

  const onWheel = (event: WheelEvent) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const dy =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? event.deltaY * window.innerHeight
          : event.deltaY;
    apply(zoom * Math.exp(-dy * 0.0025));
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
      apply(zoom * 1.1);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      apply(zoom / 1.1);
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
    localStorage.setItem(KEY, String(zoom));
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
  };
}
