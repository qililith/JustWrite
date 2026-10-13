import { useMemo } from "react";
import { useWorkspaceStore, selectCurrentDocument } from "@/features/workspace/workspaceStore";
import { useFocusStore } from "@/features/focus/focusStore";
import { collectFocusedJsonNodes } from "@/features/focus/focusRange";
import { countContent, countNodes } from "./countWords";

export function WordCount() {
  const doc = useWorkspaceStore(selectCurrentDocument);
  const focusId = useFocusStore((s) => s.focusId);

  const count = useMemo(() => {
    if (!doc) return 0;
    if (focusId) {
      const focused = collectFocusedJsonNodes(doc.content, focusId);
      return focused ? countNodes(focused.nodes) : countContent(doc.content);
    }
    return countContent(doc.content);
  }, [doc, focusId]);

  if (!doc) return <span>0 字</span>;
  return <span>{focusId ? `本节 ${count} 字` : `${count} 字`}</span>;
}
