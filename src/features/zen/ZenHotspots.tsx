import { useState } from "react";
import { useZenStore } from "./zenStore";
import { useFocusStore } from "@/features/focus/focusStore";
import { Outline } from "@/features/outline/Outline";
import { WordCount } from "@/features/word-count/WordCount";
import { Icon } from "@/shared/ui/Icon";

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
            <button
              type="button"
              aria-label="退出聚焦"
              title="退出聚焦（Esc）"
              onClick={() => setFocus(null)}
            >
              <Icon name="close" size={14} />
              <span>{focusTitle || "本节"}</span>
            </button>
          ) : null}
          <button
            type="button"
            aria-label="退出全屏"
            title="退出全屏（Esc）"
            onClick={() => setZen(false)}
          >
            <Icon name="exit-fullscreen" />
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
