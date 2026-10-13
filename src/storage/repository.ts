import { createId } from "@/shared/lib/id";
import { displayTitle } from "@/shared/lib/text";
import { getAllDocuments, getMeta, putDocument, putMeta } from "./db";
import {
  canPickFolder,
  loadFolderTarget,
  pickWorkspaceFolder,
  writeToFolder,
  type FolderTarget,
} from "./folder";
import {
  EMPTY_DOC,
  UNNAMED_TITLE,
  type DocumentRecord,
  type WorkspaceMeta,
} from "./types";

export type FolderState = {
  bound: boolean;
  needsPermission: boolean;
  supported: boolean;
  name: string | null;
};

let folder: FolderTarget | null = null;
let folderNeedsPermission = false;

function snapshot(): FolderState {
  return {
    bound: Boolean(folder),
    needsPermission: folderNeedsPermission,
    supported: canPickFolder(),
    name: folder?.name ?? null,
  };
}

async function persistFolder(
  documents: DocumentRecord[],
  meta: WorkspaceMeta,
  changed?: DocumentRecord[],
) {
  if (!folder || folderNeedsPermission) return;
  if (!(await folder.hasPermission())) {
    folderNeedsPermission = true;
    return;
  }
  try {
    await writeToFolder(folder, documents, meta, changed);
  } catch (error) {
    console.error(error);
    folderNeedsPermission = true;
  }
}

export const repository = {
  async hydrate(): Promise<{
    documents: DocumentRecord[];
    meta: WorkspaceMeta;
    folder: FolderState;
  }> {
    folder = await loadFolderTarget();
    folderNeedsPermission = folder ? !(await folder.hasPermission()) : false;
    const documents = await getAllDocuments();
    const meta = await getMeta();
    return { documents, meta, folder: snapshot() };
  },

  async create(): Promise<DocumentRecord> {
    const now = Date.now();
    const doc: DocumentRecord = {
      id: createId(),
      title: UNNAMED_TITLE,
      content: EMPTY_DOC,
      createdAt: now,
      updatedAt: now,
      rev: 0,
      syncStatus: "pending",
    };
    await putDocument(doc);
    return doc;
  },

  async save(doc: DocumentRecord, allDocs: DocumentRecord[], meta: WorkspaceMeta) {
    const next: DocumentRecord = {
      ...doc,
      title: displayTitle(doc.title, doc.content),
      updatedAt: Date.now(),
      rev: doc.rev + 1,
      syncStatus: "pending",
    };
    await putDocument(next);
    await putMeta(meta);
    await persistFolder(
      allDocs.map((item) => (item.id === next.id ? next : item)),
      meta,
      [next],
    );
    return next;
  },

  async setMeta(meta: WorkspaceMeta) {
    await putMeta(meta);
  },

  async bindFolder(documents: DocumentRecord[], meta: WorkspaceMeta): Promise<FolderState> {
    folder = await pickWorkspaceFolder();
    folderNeedsPermission = false;
    await persistFolder(documents, meta);
    return snapshot();
  },

  async grantFolder(documents: DocumentRecord[], meta: WorkspaceMeta): Promise<FolderState> {
    if (!folder) return snapshot();
    const granted = await folder.requestPermission();
    folderNeedsPermission = !granted;
    if (granted) await persistFolder(documents, meta);
    return snapshot();
  },

  folderSnapshot: snapshot,
};
