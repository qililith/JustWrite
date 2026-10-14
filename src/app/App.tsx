import { useEffect, useRef, useState } from "react";
import { DocumentList } from "@/features/workspace/DocumentList";
import { useWorkspaceStore, selectCurrentDocument } from "@/features/workspace/workspaceStore";
import { EditorPane } from "@/features/editor/EditorPane";
import { Outline } from "@/features/outline/Outline";
import { useOutlineStore } from "@/features/outline/outlineStore";
import { FocusBar } from "@/features/focus/FocusBar";
import { useFocusStore } from "@/features/focus/focusStore";
import { ZenHotspots } from "@/features/zen/ZenHotspots";
import { syncZenWithFullscreen, useZenStore } from "@/features/zen/zenStore";
import { WordCount } from "@/features/word-count/WordCount";
import { AuthModal } from "@/features/auth/AuthModal";
import { useAuthStore } from "@/features/auth/authStore";
import { useSyncStore } from "@/features/sync/syncStore";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { downloadDocument } from "@/storage/folder";
import type { DocumentRecord } from "@/storage/types";
import { applyBlockLevel, flushPendingSave } from "@/features/editor/editorRegistry";
import {
  checkDesktopUpdate,
  isDesktop,
  onWindowClose,
  onWindowFullscreenChange,
  type DesktopUpdate,
} from "@/platform/desktop";

export function App() {
  const ready = useWorkspaceStore((s) => s.ready);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const folder = useWorkspaceStore((s) => s.folder);
  const bindFolder = useWorkspaceStore((s) => s.bindFolder);
  const grantFolder = useWorkspaceStore((s) => s.grantFolder);
  const removeDocument = useWorkspaceStore((s) => s.removeDocument);
  const focusId = useFocusStore((s) => s.focusId);
  const setFocus = useFocusStore((s) => s.setFocus);
  const isZen = useZenStore((s) => s.isZen);
  const toggleZen = useZenStore((s) => s.toggleZen);
  const setZen = useZenStore((s) => s.setZen);
  const session = useAuthStore((s) => s.session);
  const configured = useAuthStore((s) => s.configured);
  const openModal = useAuthStore((s) => s.openModal);
  const signOut = useAuthStore((s) => s.signOut);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const syncLabel = useSyncStore((s) => s.label);
  const mainRef = useRef<HTMLElement>(null);
  const idleTimer = useRef<number | null>(null);
  const scrollFrame = useRef(0);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [update, setUpdate] = useState<DesktopUpdate | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return;
    const timer = window.setTimeout(() => {
      checkDesktopUpdate().then(setUpdate, () => undefined);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const installUpdate = async () => {
    if (!update || updating) return;
    setUpdating(true);
    try {
      await flushPendingSave();
      await update.install();
    } catch (error) {
      console.error(error);
      setUpdating(false);
      window.alert(`更新失败：${(error as Error).message ?? error}`);
    }
  };

  useEffect(() => {
    void hydrate();
    void hydrateAuth();
  }, [hydrate, hydrateAuth]);

  useEffect(() => {
    if (isDesktop()) {
      const stopFull = onWindowFullscreenChange((isFull) => syncZenWithFullscreen(isFull));
      const stopClose = onWindowClose(flushPendingSave);
      const onContextMenu = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target?.closest("input, textarea, [contenteditable='true']")) event.preventDefault();
      };
      document.addEventListener("contextmenu", onContextMenu);
      return () => {
        void stopFull.then((stop) => stop());
        void stopClose.then((stop) => stop());
        document.removeEventListener("contextmenu", onContextMenu);
      };
    }
    const onFull = () => syncZenWithFullscreen();
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);

  useEffect(() => {
    const onMove = () => {
      document.documentElement.classList.remove("is-idle");
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      if (!useZenStore.getState().isZen) return;
      idleTimer.current = window.setTimeout(() => {
        document.documentElement.classList.add("is-idle");
      }, 2000);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onMove);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F11") {
        event.preventDefault();
        toggleZen();
        return;
      }
      if (event.ctrlKey && event.key === ".") {
        event.preventDefault();
        toggleZen();
        return;
      }
      if (event.ctrlKey && event.altKey && /^[0-5]$/.test(event.key)) {
        event.preventDefault();
        applyBlockLevel(Number(event.key));
        return;
      }
      if (event.key !== "Escape") return;
      if (useAuthStore.getState().modalOpen) {
        useAuthStore.getState().closeModal();
        return;
      }
      const selection = document.getSelection();
      if (selection && !selection.isCollapsed) {
        selection.collapseToEnd();
        event.preventDefault();
        return;
      }
      if (useFocusStore.getState().focusId) {
        event.preventDefault();
        setFocus(null);
        return;
      }
      if (useZenStore.getState().isZen) {
        event.preventDefault();
        setZen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setFocus, setZen, toggleZen]);

  const onMainScroll = () => {
    if (scrollFrame.current) return;
    scrollFrame.current = window.requestAnimationFrame(() => {
      scrollFrame.current = 0;
      const root = mainRef.current;
      if (!root) return;
      const headings = root.querySelectorAll<HTMLElement>(
        ".ProseMirror > h1, .ProseMirror > h2, .ProseMirror > h3, .ProseMirror > h4, .ProseMirror > h5",
      );
      const top = root.getBoundingClientRect().top + 48;
      let currentId: string | null = null;
      for (const heading of headings) {
        if (heading.offsetParent === null) continue;
        if (heading.getBoundingClientRect().top > top) break;
        currentId = heading.id || currentId;
      }
      if (currentId) useOutlineStore.getState().setActiveId(currentId);
    });
  };

  const importDocument = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<DocumentRecord>;
      if (parsed.content?.type !== "doc") throw new Error("不是写文章导出的文档");
      await useWorkspaceStore.getState().importDocument(parsed.title ?? "", parsed.content);
    } catch (error) {
      window.alert(`导入失败：${(error as Error).message}`);
    }
  };

  if (!ready) {
    return (
      <div className="app" style={{ display: "grid", placeItems: "center" }}>
        <p className="ghost">正在打开文稿…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="brand">写文章</div>
        </div>
        <DocumentList
          onAskDelete={(id, title) => setPendingDelete({ id, title })}
        />
        <div className="section-label">目录</div>
        <Outline />
        <div className="sidebar-footer">
          {update ? (
            <button type="button" className="linkish" onClick={() => void installUpdate()}>
              {updating ? "正在更新…" : `新版本 ${update.version} · 重启更新`}
            </button>
          ) : null}
          {folder.supported ? (
            folder.needsPermission ? (
              isDesktop() ? (
                <button type="button" className="linkish" onClick={() => void bindFolder()}>
                  文件夹不可用，重新选择
                </button>
              ) : (
                <button type="button" className="linkish" onClick={() => void grantFolder()}>
                  重新允许访问文件夹
                </button>
              )
            ) : (
              <button type="button" className="linkish" onClick={() => void bindFolder()}>
                {folder.bound ? `已绑定：${folder.name}` : "绑定文件夹"}
              </button>
            )
          ) : (
            <button
              type="button"
              className="linkish"
              onClick={() => {
                const current = selectCurrentDocument(useWorkspaceStore.getState());
                if (current) downloadDocument(current);
              }}
            >
              导出当前文档
            </button>
          )}
          {!folder.supported ? (
            <label className="linkish">
              导入文档
              <input
                type="file"
                accept="application/json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importDocument(file);
                  event.target.value = "";
                }}
              />
            </label>
          ) : null}
          {session ? (
            <button type="button" className="linkish" onClick={() => void signOut()}>
              {syncLabel} · 退出
            </button>
          ) : (
            <button type="button" className="linkish" onClick={openModal}>
              {configured ? syncLabel : "未配置云同步"}
            </button>
          )}
        </div>
      </aside>

      {focusId && !isZen ? <FocusBar /> : null}

      <main className="app-main" ref={mainRef} onScroll={onMainScroll}>
        {!isZen ? (
          <div className="editor-toolbar">
            <button
              type="button"
              className="icon-btn zen-entry"
              aria-label="全屏"
              title="全屏（Ctrl+. 或 F11）"
              onClick={() => toggleZen()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
              </svg>
            </button>
          </div>
        ) : null}
        <EditorPane />
      </main>

      {!isZen ? (
        <footer className="app-status">
          <WordCount />
        </footer>
      ) : null}

      <ZenHotspots />
      <AuthModal />
      {pendingDelete ? (
        <ConfirmDialog
          title="删除文档"
          message={`确定删除「${pendingDelete.title}」？`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            void removeDocument(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}
