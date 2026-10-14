import { useState } from "react";
import { useVisibleDocuments, useWorkspaceStore } from "./workspaceStore";
import { displayTitle } from "@/shared/lib/text";
import { Icon } from "@/shared/ui/Icon";

type Props = {
  onAskDelete: (id: string, title: string) => void;
};

export function DocumentList({ onAskDelete }: Props) {
  const documents = useVisibleDocuments();
  const currentId = useWorkspaceStore((s) => s.currentId);
  const docsOpen = useWorkspaceStore((s) => s.docsOpen);
  const selectDocument = useWorkspaceStore((s) => s.selectDocument);
  const renameDocument = useWorkspaceStore((s) => s.renameDocument);
  const createDocument = useWorkspaceStore((s) => s.createDocument);
  const setDocsOpen = useWorkspaceStore((s) => s.setDocsOpen);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const commitRename = () => {
    if (!editingId) return;
    void renameDocument(editingId, draft.trim() || "未命名");
    setEditingId(null);
  };

  return (
    <>
      <div className="section-label">
        <button
          type="button"
          className="linkish section-toggle"
          aria-expanded={docsOpen}
          onClick={() => setDocsOpen(!docsOpen)}
        >
          文档
          <Icon name={docsOpen ? "chevron-down" : "chevron-right"} size={12} />
        </button>
        <button
          type="button"
          className="icon-btn icon-only"
          aria-label="新建文档"
          title="新建文档"
          onClick={() => void createDocument()}
        >
          <Icon name="plus" size={14} />
        </button>
      </div>
      {docsOpen ? (
        <div className="doc-list">
          {documents.map((doc) => {
            const title = displayTitle(doc.title, doc.content);
            if (editingId === doc.id) {
              return (
                <input
                  key={doc.id}
                  className="doc-rename"
                  value={draft}
                  autoFocus
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitRename();
                    }
                    if (event.key === "Escape") {
                      event.stopPropagation();
                      setEditingId(null);
                    }
                  }}
                />
              );
            }
            return (
              <div
                key={doc.id}
                className={`doc-item${currentId === doc.id ? " is-active" : ""}`}
              >
                <button
                  type="button"
                  className="doc-title"
                  onClick={() => void selectDocument(doc.id)}
                  onDoubleClick={() => {
                    setEditingId(doc.id);
                    setDraft(title);
                  }}
                >
                  {title}
                </button>
                <button
                  type="button"
                  className="item-action"
                  aria-label="重命名"
                  title="重命名"
                  onClick={() => {
                    setEditingId(doc.id);
                    setDraft(title);
                  }}
                >
                  <Icon name="pencil" size={14} />
                </button>
                <button
                  type="button"
                  className="item-action danger"
                  aria-label="删除"
                  title="删除"
                  onClick={() => onAskDelete(doc.id, title)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
