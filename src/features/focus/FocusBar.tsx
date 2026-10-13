import { useFocusStore } from "./focusStore";

export function FocusBar() {
  const focusId = useFocusStore((s) => s.focusId);
  const focusTitle = useFocusStore((s) => s.focusTitle);
  const setFocus = useFocusStore((s) => s.setFocus);

  if (!focusId) return null;

  return (
    <div className="app-focusbar">
      <span>正在聚焦：{focusTitle || "本节"}</span>
      <button type="button" className="linkish" onClick={() => setFocus(null)}>
        退出
      </button>
    </div>
  );
}
