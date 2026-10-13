import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { DocumentRecord, WorkspaceMeta } from "./types";

interface ChangwenDB extends DBSchema {
  documents: {
    key: string;
    value: DocumentRecord;
  };
  meta: {
    key: string;
    value: WorkspaceMeta | FileSystemDirectoryHandle | unknown;
  };
}

const DB_NAME = "changwen";
const DB_VERSION = 1;

const memoryDocs = new Map<string, DocumentRecord>();
let memoryMeta: WorkspaceMeta = { lastOpenId: null };
let memoryHandle: FileSystemDirectoryHandle | null = null;
let useMemory = false;
let dbPromise: Promise<IDBPDatabase<ChangwenDB>> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("idb-timeout")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function getDb() {
  if (useMemory) throw new Error("memory-only");
  if (!dbPromise) {
    dbPromise = openDB<ChangwenDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("documents")) {
          db.createObjectStore("documents", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
    });
  }
  return withTimeout(dbPromise, 2000);
}

export async function getAllDocuments(): Promise<DocumentRecord[]> {
  try {
    const db = await getDb();
    return db.getAll("documents");
  } catch {
    useMemory = true;
    return [...memoryDocs.values()];
  }
}

export async function getDocument(id: string): Promise<DocumentRecord | undefined> {
  try {
    if (useMemory) return memoryDocs.get(id);
    const db = await getDb();
    return db.get("documents", id);
  } catch {
    useMemory = true;
    return memoryDocs.get(id);
  }
}

export async function putDocument(doc: DocumentRecord): Promise<void> {
  memoryDocs.set(doc.id, doc);
  try {
    if (useMemory) return;
    const db = await getDb();
    await db.put("documents", doc);
  } catch {
    useMemory = true;
  }
}

export async function getMeta(): Promise<WorkspaceMeta> {
  try {
    const db = await getDb();
    const meta = (await db.get("meta", "workspace")) as WorkspaceMeta | undefined;
    return meta ?? { lastOpenId: null };
  } catch {
    useMemory = true;
    return memoryMeta;
  }
}

export async function putMeta(meta: WorkspaceMeta): Promise<void> {
  memoryMeta = meta;
  try {
    if (useMemory) return;
    const db = await getDb();
    await db.put("meta", meta, "workspace");
  } catch {
    useMemory = true;
  }
}

export async function getFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getDb();
    const handle = await db.get("meta", "folderHandle");
    return (handle as FileSystemDirectoryHandle | undefined) ?? null;
  } catch {
    useMemory = true;
    return memoryHandle;
  }
}

let memoryPath: string | null = null;

export async function getFolderPath(): Promise<string | null> {
  try {
    const db = await getDb();
    const path = await db.get("meta", "folderPath");
    return typeof path === "string" ? path : null;
  } catch {
    useMemory = true;
    return memoryPath;
  }
}

export async function putFolderPath(path: string | null): Promise<void> {
  memoryPath = path;
  try {
    if (useMemory) return;
    const db = await getDb();
    if (path) await db.put("meta", path, "folderPath");
    else await db.delete("meta", "folderPath");
  } catch {
    useMemory = true;
  }
}

export async function putFolderHandle(
  handle: FileSystemDirectoryHandle | null,
): Promise<void> {
  memoryHandle = handle;
  try {
    if (useMemory) return;
    const db = await getDb();
    if (handle) await db.put("meta", handle, "folderHandle");
    else await db.delete("meta", "folderHandle");
  } catch {
    useMemory = true;
  }
}
