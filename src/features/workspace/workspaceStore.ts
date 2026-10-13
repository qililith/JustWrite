import { create } from "zustand";
import type { JSONContent } from "@tiptap/react";
import { repository, type FolderState } from "@/storage/repository";
import type { DocumentRecord } from "@/storage/types";
import { displayTitle } from "@/shared/lib/text";
import {
  onRemoteDocuments,
  schedulePush,
  syncAfterLocalChange,
} from "@/features/sync/syncEngine";

type WorkspaceState = {
  ready: boolean;
  documents: DocumentRecord[];
  currentId: string | null;
  folder: FolderState;
  docsOpen: boolean;
  hydrate: () => Promise<void>;
  createDocument: () => Promise<void>;
  selectDocument: (id: string) => Promise<void>;
  renameDocument: (id: string, title: string) => Promise<void>;
  removeDocument: (id: string) => Promise<void>;
  saveContent: (id: string, content: JSONContent) => Promise<void>;
  importDocument: (title: string, content: JSONContent) => Promise<void>;
  replaceDocuments: (documents: DocumentRecord[]) => void;
  bindFolder: () => Promise<void>;
  grantFolder: () => Promise<void>;
  setDocsOpen: (open: boolean) => void;
};

let hydrating: Promise<void> | null = null;

function visibleDocs(documents: DocumentRecord[]) {
  return documents
    .filter((doc) => !doc.deletedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function metaFrom(state: Pick<WorkspaceState, "currentId">) {
  return { lastOpenId: state.currentId };
}

function folderAfterWrite(previous: FolderState): FolderState {
  const next = repository.folderSnapshot();
  return next.needsPermission === previous.needsPermission && next.bound === previous.bound
    ? previous
    : next;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ready: false,
  documents: [],
  currentId: null,
  folder: {
    bound: false,
    needsPermission: false,
    supported: false,
    name: null,
  },
  docsOpen: true,

  hydrate: async () => {
    if (hydrating) return hydrating;
    hydrating = (async () => {
    try {
      const { documents, meta, folder } = await repository.hydrate();
      let docs = documents;
      let currentId = meta.lastOpenId;
      if (!docs.some((doc) => !doc.deletedAt)) {
        const created = await repository.create();
        docs = [...docs, created];
        currentId = created.id;
      }
      if (!currentId || !docs.some((doc) => doc.id === currentId && !doc.deletedAt)) {
        currentId = visibleDocs(docs)[0]?.id ?? null;
      }
      await repository.setMeta({ lastOpenId: currentId });
      set({ documents: docs, currentId, folder, ready: true });
    } catch (error) {
      console.error(error);
      const created = await repository.create();
      set({
        documents: [created],
        currentId: created.id,
        folder: repository.folderSnapshot(),
        ready: true,
      });
    }
    })();
    return hydrating;
  },

  createDocument: async () => {
    const created = await repository.create();
    const documents = [...get().documents, created];
    set({ documents, currentId: created.id });
    await repository.setMeta({ lastOpenId: created.id });
    syncAfterLocalChange(created);
  },

  selectDocument: async (id) => {
    set({ currentId: id });
    await repository.setMeta({ lastOpenId: id });
  },

  renameDocument: async (id, title) => {
    const state = get();
    const current = state.documents.find((doc) => doc.id === id);
    if (!current) return;
    const next = await repository.save(
      { ...current, title },
      state.documents,
      { lastOpenId: id },
    );
    set((latest) => ({
      documents: latest.documents.map((doc) => (doc.id === id ? next : doc)),
      folder: folderAfterWrite(latest.folder),
    }));
    schedulePush(next);
  },

  importDocument: async (title, content) => {
    const created = await repository.create();
    const next = await repository.save(
      { ...created, title, content },
      [...get().documents, created],
      { lastOpenId: created.id },
    );
    set((latest) => ({
      documents: [...latest.documents, next],
      currentId: next.id,
      folder: folderAfterWrite(latest.folder),
    }));
    schedulePush(next);
  },

  removeDocument: async (id) => {
    const state = get();
    const current = state.documents.find((doc) => doc.id === id);
    if (!current) return;
    const removed = await repository.save(
      { ...current, deletedAt: Date.now() },
      state.documents,
      { lastOpenId: state.currentId === id ? null : state.currentId },
    );
    const documents = state.documents.map((doc) => (doc.id === id ? removed : doc));
    const nextId =
      state.currentId === id ? visibleDocs(documents)[0]?.id ?? null : state.currentId;
    if (!nextId) {
      const created = await repository.create();
      documents.push(created);
      set({ documents, currentId: created.id });
      await repository.setMeta({ lastOpenId: created.id });
      schedulePush(removed);
      return;
    }
    set({ documents, currentId: nextId });
    await repository.setMeta({ lastOpenId: nextId });
    schedulePush(removed);
  },

  saveContent: async (id, content) => {
    const state = get();
    const current = state.documents.find((doc) => doc.id === id);
    if (!current) return;
    if (JSON.stringify(current.content) === JSON.stringify(content)) return;
    const next = await repository.save(
      {
        ...current,
        content,
        title: displayTitle(current.title, content),
      },
      state.documents,
      metaFrom(state),
    );
    set((latest) => ({
      documents: latest.documents.map((doc) => (doc.id === id ? next : doc)),
      folder: folderAfterWrite(latest.folder),
    }));
    schedulePush(next);
  },

  replaceDocuments: (incoming) => {
    const { currentId, documents: existing } = get();
    const known = new Map(existing.map((doc) => [doc.id, doc]));
    const documents = incoming.map((doc) => {
      const mine = known.get(doc.id);
      return mine && mine.updatedAt > doc.updatedAt ? mine : doc;
    });
    const still = documents.find((doc) => doc.id === currentId && !doc.deletedAt);
    set({
      documents,
      currentId: still ? currentId : visibleDocs(documents)[0]?.id ?? currentId,
    });
  },

  bindFolder: async () => {
    const state = get();
    try {
      const folder = await repository.bindFolder(state.documents, metaFrom(state));
      set({ folder });
    } catch (error) {
      if ((error as Error).name !== "AbortError") console.error(error);
    }
  },

  grantFolder: async () => {
    const state = get();
    await repository.grantFolder(state.documents, metaFrom(state));
    set({ folder: repository.folderSnapshot() });
  },

  setDocsOpen: (open) => set({ docsOpen: open }),
}));

onRemoteDocuments((documents) => useWorkspaceStore.getState().replaceDocuments(documents));

export function selectVisibleDocuments(state: WorkspaceState) {
  return visibleDocs(state.documents);
}

export function selectCurrentDocument(state: WorkspaceState) {
  return state.documents.find((doc) => doc.id === state.currentId) ?? null;
}

export function useVisibleDocuments() {
  const documents = useWorkspaceStore((s) => s.documents);
  return documents
    .filter((doc) => !doc.deletedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
