import type { Editor } from "@tiptap/react";

let current: Editor | null = null;
let pendingSave: (() => Promise<void>) | null = null;

export function setPendingSaveFlusher(flush: (() => Promise<void>) | null) {
  pendingSave = flush;
}

/** 立即写入 debounce 中尚未保存的正文。 */
export async function flushPendingSave() {
  await pendingSave?.();
}

export function setCurrentEditor(editor: Editor | null) {
  current = editor;
  if (import.meta.env.DEV) {
    (window as unknown as { __editor?: Editor | null }).__editor = editor;
  }
}

export function jumpToHeading(id: string) {
  const el = document.getElementById(id);
  const scroller = el?.closest<HTMLElement>(".app-main");
  if (el && scroller) {
    const top =
      el.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop -
      32;
    const far = Math.abs(top - scroller.scrollTop) > window.innerHeight * 2;
    scroller.scrollTo({ top, behavior: far ? "auto" : "smooth" });
  }
  if (!current) return;
  let target = -1;
  current.state.doc.forEach((node, offset) => {
    if (target < 0 && node.type.name === "heading" && node.attrs.id === id) {
      target = offset + node.nodeSize - 1;
    }
  });
  if (target >= 0) {
    current.commands.focus(target, { scrollIntoView: false });
  }
}

export function applyBlockLevel(level: number) {
  if (!current) return;
  if (level === 0) {
    current.chain().focus().setParagraph().run();
    return;
  }
  if (level >= 1 && level <= 5) {
    const id = current.getAttributes("heading").id as string | undefined;
    current
      .chain()
      .focus()
      .setHeading({ level: level as 1 | 2 | 3 | 4 | 5 })
      .run();
    if (id) current.chain().updateAttributes("heading", { id }).run();
  }
}
