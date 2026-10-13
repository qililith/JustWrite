import { useEffect, useRef } from "react";
import type { Node as ProseNode } from "@tiptap/pm/model";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { editorExtensions } from "./extensions";
import { BubbleBar } from "./BubbleBar";
import { HeadingFocusButton } from "./HeadingFocusButton";
import { useWorkspaceStore } from "@/features/workspace/workspaceStore";
import { useFocusStore } from "@/features/focus/focusStore";
import { useOutlineStore } from "@/features/outline/outlineStore";
import { sectionFocusKey } from "@/features/focus/SectionFocus";
import { extractOutline } from "@/features/outline/extractOutline";
import { setCurrentEditor } from "./editorRegistry";

function syncActiveHeading(doc: ProseNode, from: number) {
  const $from = doc.resolve(from);
  for (let i = Math.min($from.index(0), doc.childCount - 1); i >= 0; i -= 1) {
    const node = doc.child(i);
    if (node.type.name === "heading" && node.attrs.id) {
      useOutlineStore.getState().setActiveId(node.attrs.id as string);
      return;
    }
  }
}

function contentOf(id: string | null): JSONContent | undefined {
  if (!id) return undefined;
  return useWorkspaceStore.getState().documents.find((doc) => doc.id === id)?.content;
}

export function EditorPane() {
  const currentId = useWorkspaceStore((s) => s.currentId);
  const saveContent = useWorkspaceStore((s) => s.saveContent);
  const focusId = useFocusStore((s) => s.focusId);
  const shellRef = useRef<HTMLDivElement>(null);
  const loading = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const docIdRef = useRef(currentId);
  const lastSaved = useRef("");

  const editor = useEditor(
    {
      extensions: editorExtensions,
      content: contentOf(currentId),
      editorProps: {
        attributes: { spellcheck: "false" },
      },
      onUpdate: ({ editor: instance }) => {
        const json = instance.getJSON();
        useOutlineStore.getState().setItems(extractOutline(json));
        if (loading.current || !docIdRef.current) return;
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        const id = docIdRef.current;
        saveTimer.current = window.setTimeout(() => {
          saveTimer.current = null;
          const latest = instance.getJSON();
          const serialized = JSON.stringify(latest);
          if (serialized === lastSaved.current) return;
          lastSaved.current = serialized;
          void saveContent(id, latest);
        }, 400);
      },
      onSelectionUpdate: ({ editor: instance }) => {
        syncActiveHeading(instance.state.doc, instance.state.selection.from);
      },
    },
    [],
  );

  useEffect(() => {
    setCurrentEditor(editor);
    return () => setCurrentEditor(null);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const load = (content: JSONContent | undefined) => {
      if (!content) return;
      loading.current = true;
      editor.commands.setContent(content, false);
      loading.current = false;
      lastSaved.current = JSON.stringify(editor.getJSON());
      useOutlineStore.getState().setItems(extractOutline(editor.getJSON()));
    };

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      const prevId = docIdRef.current;
      if (prevId && prevId !== currentId) {
        const pending = editor.getJSON();
        if (JSON.stringify(pending) !== lastSaved.current) void saveContent(prevId, pending);
      }
      saveTimer.current = null;
    }
    docIdRef.current = currentId;
    useOutlineStore.getState().setActiveId(null);
    load(contentOf(currentId));

    return useWorkspaceStore.subscribe((state, prev) => {
      if (state.documents === prev.documents) return;
      const doc = state.documents.find((item) => item.id === docIdRef.current);
      if (!doc) return;
      const serialized = JSON.stringify(doc.content);
      if (serialized === lastSaved.current) return;
      if (serialized === JSON.stringify(editor.getJSON())) {
        lastSaved.current = serialized;
        return;
      }
      if (doc.syncStatus === "synced" && !saveTimer.current) load(doc.content);
    });
  }, [editor, currentId, saveContent]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr.setMeta(sectionFocusKey, { focusId }));
    if (focusId) {
      editor.state.doc.forEach((node, offset) => {
        if (node.type.name === "heading" && node.attrs.id === focusId) {
          editor.commands.setTextSelection(offset + node.nodeSize - 1);
        }
      });
      shellRef.current?.closest(".app-main")?.scrollTo({ top: 0 });
      useOutlineStore.getState().setActiveId(focusId);
    }
  }, [editor, focusId]);

  useEffect(() => {
    useFocusStore.getState().setFocus(null);
  }, [currentId]);

  if (!currentId) {
    return (
      <div className="editor-shell">
        <p className="ghost">新建一篇文档开始写作</p>
      </div>
    );
  }

  return (
    <div className="editor-shell" ref={shellRef}>
      {editor ? <BubbleBar editor={editor} /> : null}
      <HeadingFocusButton key={currentId} shellRef={shellRef} />
      <EditorContent editor={editor} />
    </div>
  );
}
