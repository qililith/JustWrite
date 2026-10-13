import { useState } from "react";
import { useZenStore } from "./zenStore";
import { useFocusStore } from "@/features/focus/focusStore";
import { Outline } from "@/features/outline/Outline";
import { WordCount } from "@/features/word-count/WordCount";

export function ZenHotspots() {
  const isZen = useZenStore((s) => s.isZen);
  const setZen = useZenStore((s) => s.setZen);
  const focusId = useFocusStore((s) => s.focusId);
  const focusTitle = useFocusStore((s) => s.focusTitle);
  const setFocus = useFocusStore((s) => s.setFocus);
  const [leftOpen, setLeftOpen] = useState(false);

  if (!isZen) return null;

  return (
    <>
      <div className="zen-hotspot top">
        <div className="zen-strip">
          {focusId ? (
            <button type="button" onClick={() => setFocus(null)}>
              退出聚焦{focusTitle ? ` · ${focusTitle}` : ""}
            </button>
          ) : null}
          <button type="button" onClick={() => setZen(false)}>
            退出全屏
          </button>
        </div>
      </div>
      <div
        className={`zen-hotspot left${leftOpen ? " is-open" : ""}`}
        onMouseEnter={() => setLeftOpen(true)}
        onMouseLeave={() => setLeftOpen(false)}
      >
        {leftOpen ? (
          <div className="zen-float">
            <Outline />
          </div>
        ) : null}
      </div>
      <div className="zen-hotspot bottom">
        <div className="zen-strip">
          <WordCount />
        </div>
      </div>
    </>
  );
}
