import { useFocusStore } from "./focusStore";
import { Icon } from "@/shared/ui/Icon";

export function FocusBar() {
  const focusId = useFocusStore((s) => s.focusId);
  const focusTitle = useFocusStore((s) => s.focusTitle);
  const setFocus = useFocusStore((s) => s.setFocus);

  if (!focusId) return null;

  return (
    <div className="app-focusbar">
      <span>正在聚焦：{focusTitle || "本节"}</span>
      <button
        type="button"
        className="icon-btn icon-only"
        aria-label="退出聚焦"
        title="退出聚焦（Esc）"
        onClick={() => setFocus(null)}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
