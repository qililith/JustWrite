import type { DocumentRecord, WorkspaceMeta } from "./types";
import { getFolderHandle, getFolderPath, putFolderHandle, putFolderPath } from "./db";
import {
  desktopFolderExists,
  desktopFolderRemove,
  desktopFolderWrite,
  isDesktop,
  pickDesktopFolder,
} from "@/platform/desktop";

const READ_WRITE = { mode: "readwrite" as const };

/** 绑定的文件夹。网页版背后是目录句柄，桌面版背后是磁盘路径。`rel` 只会是 `manifest.json` 或 `docs/{id}.json`。 */
export type FolderTarget = {
  name: string;
  hasPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  writeText: (rel: string, text: string) => Promise<void>;
  remove: (rel: string) => Promise<void>;
};

export function canPickFolder(): boolean {
  if (isDesktop()) return true;
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

async function handlePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return ((await handle.queryPermission?.(READ_WRITE)) ?? "granted") === "granted";
  } catch {
    return false;
  }
}

async function parentDir(root: FileSystemDirectoryHandle, rel: string) {
  const parts = rel.split("/");
  const name = parts.pop() as string;
  let dir = root;
  for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
  return { dir, name };
}

function handleTarget(handle: FileSystemDirectoryHandle): FolderTarget {
  return {
    name: handle.name,
    hasPermission: () => handlePermission(handle),
    requestPermission: async () => {
      if (await handlePermission(handle)) return true;
      try {
        return ((await handle.requestPermission?.(READ_WRITE)) ?? "denied") === "granted";
      } catch {
        return false;
      }
    },
    writeText: async (rel, text) => {
      const { dir, name } = await parentDir(handle, rel);
      const file = await dir.getFileHandle(name, { create: true });
      const writable = await file.createWritable();
      await writable.write(text);
      await writable.close();
    },
    remove: async (rel) => {
      const { dir, name } = await parentDir(handle, rel);
      try {
        await dir.removeEntry(name);
      } catch {
        // 文件不存在
      }
    },
  };
}

function pathTarget(root: string): FolderTarget {
  const exists = () => desktopFolderExists(root);
  return {
    name: root.split(/[\\/]/).filter(Boolean).pop() ?? root,
    hasPermission: exists,
    requestPermission: exists,
    writeText: (rel, text) => desktopFolderWrite(root, rel, text),
    remove: (rel) => desktopFolderRemove(root, rel),
  };
}

export async function loadFolderTarget(): Promise<FolderTarget | null> {
  if (isDesktop()) {
    const path = await getFolderPath();
    return path ? pathTarget(path) : null;
  }
  const handle = await getFolderHandle();
  return handle ? handleTarget(handle) : null;
}

export async function pickWorkspaceFolder(): Promise<FolderTarget> {
  if (isDesktop()) {
    const path = await pickDesktopFolder();
    if (!path) throw new DOMException("未选择文件夹", "AbortError");
    await putFolderPath(path);
    return pathTarget(path);
  }
  if (!window.showDirectoryPicker) {
    throw new Error("当前浏览器不支持绑定文件夹");
  }
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await putFolderHandle(handle);
  return handleTarget(handle);
}

function manifestOf(documents: DocumentRecord[], meta: WorkspaceMeta) {
  return {
    lastOpenId: meta.lastOpenId,
    documents: documents
      .filter((doc) => !doc.deletedAt)
      .map((doc) => ({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt })),
  };
}

function json(data: unknown) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function writeDocument(target: FolderTarget, doc: DocumentRecord) {
  const rel = `docs/${doc.id}.json`;
  if (doc.deletedAt) {
    await target.remove(rel);
    return;
  }
  await target.writeText(
    rel,
    json({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      rev: doc.rev,
    }),
  );
}

export async function writeToFolder(
  target: FolderTarget,
  documents: DocumentRecord[],
  meta: WorkspaceMeta,
  changed: DocumentRecord[] = documents,
): Promise<void> {
  for (const doc of changed) await writeDocument(target, doc);
  await target.writeText("manifest.json", json(manifestOf(documents, meta)));
}

export function downloadDocument(doc: DocumentRecord): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.title || "未命名"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
