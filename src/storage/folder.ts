import type { DocumentRecord, WorkspaceMeta } from "./types";
import { putFolderHandle } from "./db";

const READ_WRITE = { mode: "readwrite" as const };

export function canPickFolder(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export async function hasPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return ((await handle.queryPermission?.(READ_WRITE)) ?? "granted") === "granted";
  } catch {
    return false;
  }
}

export async function requestFolderPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  if (await hasPermission(handle)) return true;
  try {
    return ((await handle.requestPermission?.(READ_WRITE)) ?? "denied") === "granted";
  } catch {
    return false;
  }
}

export async function pickWorkspaceFolder(): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) {
    throw new Error("当前浏览器不支持绑定文件夹");
  }
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await putFolderHandle(handle);
  return handle;
}

function manifestOf(documents: DocumentRecord[], meta: WorkspaceMeta) {
  return {
    lastOpenId: meta.lastOpenId,
    documents: documents
      .filter((doc) => !doc.deletedAt)
      .map((doc) => ({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt })),
  };
}

async function writeDocument(docsDir: FileSystemDirectoryHandle, doc: DocumentRecord) {
  const name = `${doc.id}.json`;
  if (doc.deletedAt) {
    try {
      await docsDir.removeEntry(name);
    } catch {
      // 文件不存在
    }
    return;
  }
  await writeJsonFile(docsDir, name, {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    rev: doc.rev,
  });
}

export async function writeToFolder(
  handle: FileSystemDirectoryHandle,
  documents: DocumentRecord[],
  meta: WorkspaceMeta,
  changed: DocumentRecord[] = documents,
): Promise<void> {
  const docsDir = await handle.getDirectoryHandle("docs", { create: true });
  for (const doc of changed) await writeDocument(docsDir, doc);
  await writeJsonFile(handle, "manifest.json", manifestOf(documents, meta));
}

async function writeJsonFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: unknown,
): Promise<void> {
  const file = await dir.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(`${JSON.stringify(data, null, 2)}\n`);
  await writable.close();
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
