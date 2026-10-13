import { useEffect, useRef, useState, type RefObject } from "react";
import { useFocusStore } from "@/features/focus/focusStore";

type Target = { id: string; title: string; top: number; left: number };

const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5"]);
const HIDE_DELAY = 400;
const BUTTON_HEIGHT = 26;
const GUTTER = 96;

type Props = {
  shellRef: RefObject<HTMLDivElement | null>;
};

function headingAtRow(editorDom: HTMLElement, y: number): HTMLElement | null {
  const rect = editorDom.getBoundingClientRect();
  const hit = document.elementFromPoint(rect.left + 4, y);
  let node = hit instanceof HTMLElement ? hit : null;
  while (node && node.parentElement !== editorDom) node = node.parentElement;
  return node && HEADING_TAGS.has(node.tagName) && node.id ? node : null;
}

export function HeadingFocusButton({ shellRef }: Props) {
  const [target, setTarget] = useState<Target | null>(null);
  const setFocus = useFocusStore((s) => s.setFocus);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    const scroller = shell?.closest<HTMLElement>(".app-main");
    if (!shell || !scroller) return;

    let hideTimer: number | null = null;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const cancelHide = () => {
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = null;
    };
    const scheduleHide = () => {
      if (hideTimer) return;
      hideTimer = window.setTimeout(() => {
        hideTimer = null;
        setTarget(null);
      }, HIDE_DELAY);
    };

    const evaluate = () => {
      frame = 0;
      const editorDom = shell.querySelector<HTMLElement>(".ProseMirror");
      if (!pointer || !editorDom) return;
      if (buttonRef.current?.matches(":hover")) {
        cancelHide();
        return;
      }
      const editorRect = editorDom.getBoundingClientRect();
      const inBand =
        pointer.x >= editorRect.left - GUTTER && pointer.x <= editorRect.right;
      const heading = inBand ? headingAtRow(editorDom, pointer.y) : null;
      if (!heading) {
        scheduleHide();
        return;
      }
      cancelHide();
      const shellRect = shell.getBoundingClientRect();
      const rect = heading.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(heading).lineHeight) || rect.height;
      const top = Math.round(
        rect.top - shellRect.top + Math.min(lineHeight, rect.height) / 2 - BUTTON_HEIGHT / 2,
      );
      const minLeft = scroller.getBoundingClientRect().left - shellRect.left + 64;
      const left = Math.round(Math.max(editorRect.left - shellRect.left - 10, minLeft));
      setTarget((prev) =>
        prev?.id === heading.id && prev.top === top && prev.left === left
          ? prev
          : { id: heading.id, title: heading.textContent?.trim() || "无标题", top, left },
      );
    };

    const request = () => {
      if (!frame) frame = window.requestAnimationFrame(evaluate);
    };
    const onMove = (event: MouseEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      request();
    };
    const onLeave = () => {
      pointer = null;
      scheduleHide();
    };

    scroller.addEventListener("mousemove", onMove);
    scroller.addEventListener("mouseleave", onLeave);
    scroller.addEventListener("scroll", request, { passive: true });
    return () => {
      cancelHide();
      if (frame) window.cancelAnimationFrame(frame);
      scroller.removeEventListener("mousemove", onMove);
      scroller.removeEventListener("mouseleave", onLeave);
      scroller.removeEventListener("scroll", request);
    };
  }, [shellRef]);

  if (!target) return null;

  return (
    <button
      ref={buttonRef}
      type="button"
      className="heading-focus"
      title={`只看「${target.title}」这一节`}
      style={{ top: target.top, left: target.left }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        if (shellRef.current?.querySelector(`[id="${target.id}"]`)) {
          setFocus(target.id, target.title);
        }
        setTarget(null);
      }}
    >
      聚焦
    </button>
  );
}
