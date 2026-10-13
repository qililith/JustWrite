import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useOutlineStore } from "./outlineStore";
import type { OutlineItem } from "./extractOutline";
import { useFocusStore } from "@/features/focus/focusStore";
import { jumpToHeading } from "@/features/editor/editorRegistry";

function visibleItems(
  items: OutlineItem[],
  collapsed: Record<string, boolean>,
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (q) return items.filter((item) => item.text.toLowerCase().includes(q));

  const hidden = new Set<string>();
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!collapsed[item.id]) continue;
    for (let j = i + 1; j < items.length; j += 1) {
      if (items[j].level <= item.level) break;
      hidden.add(items[j].id);
    }
  }
  return items.filter((item) => !hidden.has(item.id));
}

function hasChildren(items: OutlineItem[], index: number) {
  const item = items[index];
  const next = items[index + 1];
  return Boolean(next && next.level > item.level);
}

type Props = {
  onJump?: (id: string) => void;
};

export function Outline({ onJump }: Props) {
  const items = useOutlineStore((s) => s.items);
  const activeId = useOutlineStore((s) => s.activeId);
  const query = useOutlineStore((s) => s.query);
  const collapsed = useOutlineStore((s) => s.collapsed);
  const setQuery = useOutlineStore((s) => s.setQuery);
  const toggleCollapsed = useOutlineStore((s) => s.toggleCollapsed);
  const setFocus = useFocusStore((s) => s.setFocus);
  const parentRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () => visibleItems(items, collapsed, query),
    [items, collapsed, query],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 12,
  });

  const setActiveId = useOutlineStore((s) => s.setActiveId);

  useEffect(() => {
    if (!activeId) return;
    const index = rows.findIndex((row) => row.id === activeId);
    if (index >= 0) virtualizer.scrollToIndex(index, { align: "auto" });
  }, [activeId, rows, virtualizer]);

  const jump = (id: string) => {
    jumpToHeading(id);
    setActiveId(id);
    onJump?.(id);
  };

  return (
    <div className="outline-wrap">
      <input
        className="outline-filter"
        value={query}
        placeholder="过滤目录"
        onChange={(event) => setQuery(event.target.value)}
      />
      {items.length === 0 ? (
        <div className="outline-empty">添加标题后生成目录</div>
      ) : (
        <div className="outline-scroll" ref={parentRef}>
          <div
            style={{
              height: virtualizer.getTotalSize(),
              position: "relative",
              width: "100%",
            }}
          >
            {virtualizer.getVirtualItems().map((row) => {
              const item = rows[row.index];
              const sourceIndex = items.findIndex((entry) => entry.id === item.id);
              const children = hasChildren(items, sourceIndex);
              return (
                <div
                  key={item.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${row.start}px)`,
                  }}
                >
                  <div
                    className={`outline-item${activeId === item.id ? " is-active" : ""}`}
                    style={{ paddingLeft: 8 + (item.level - 1) * 14 }}
                  >
                    {children ? (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => toggleCollapsed(item.id)}
                      >
                        {collapsed[item.id] ? "▸" : "▾"}
                      </button>
                    ) : (
                      <span className="ghost">·</span>
                    )}
                    <button
                      type="button"
                      className="outline-text"
                      title={item.text}
                      onClick={() => jump(item.id)}
                    >
                      {item.text}
                    </button>
                    <button
                      type="button"
                      className="item-action"
                      onClick={() => setFocus(item.id, item.text)}
                    >
                      聚焦
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
