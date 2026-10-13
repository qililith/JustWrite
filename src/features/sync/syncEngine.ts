import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DocumentRecord } from "@/storage/types";
import { getAllDocuments, getDocument, getMeta, putDocument, putMeta } from "@/storage/db";
import { getSupabase, isCloudConfigured } from "@/features/auth/supabaseClient";
import { useSyncStore, type SyncLabel } from "./syncStore";

type RemoteRow = {
  id: string;
  user_id: string;
  title: string;
  content: DocumentRecord["content"];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  rev: number;
};

let pushTimer: number | null = null;
let pullTimer: number | null = null;
let flushing: Promise<void> | null = null;
let flushAgain = false;
let pulling: Promise<void> | null = null;
let pullAgain = false;
let listenersBound = false;
let channel: RealtimeChannel | null = null;

function setLabel(label: SyncLabel) {
  useSyncStore.getState().setLabel(label);
}

function toRemote(doc: DocumentRecord, userId: string): RemoteRow {
  return {
    id: doc.id,
    user_id: userId,
    title: doc.title,
    content: doc.content,
    created_at: new Date(doc.createdAt).toISOString(),
    updated_at: new Date(doc.updatedAt).toISOString(),
    deleted_at: doc.deletedAt ? new Date(doc.deletedAt).toISOString() : null,
    rev: doc.rev,
  };
}

function fromRemote(row: RemoteRow): DocumentRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined,
    rev: row.rev,
    syncStatus: "synced",
  };
}

let applyDocuments: (documents: DocumentRecord[]) => void = () => {};

export function onRemoteDocuments(handler: (documents: DocumentRecord[]) => void) {
  applyDocuments = handler;
}

async function applyToWorkspace() {
  applyDocuments(await getAllDocuments());
}

async function currentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}

export function refreshSyncLabel(loggedIn: boolean, hasError = false) {
  if (!isCloudConfigured()) {
    setLabel("未配置云同步");
    return;
  }
  if (!loggedIn) {
    setLabel("登录以同步");
    return;
  }
  if (!navigator.onLine) {
    setLabel("离线");
    return;
  }
  setLabel(hasError ? "同步失败" : "已同步");
}

export function schedulePush(_doc?: DocumentRecord) {
  if (!isCloudConfigured()) return;
  if (pushTimer) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    void flushPending();
  }, 600);
}

export const syncAfterLocalChange = schedulePush;

async function flushOnce() {
  const supabase = getSupabase();
  const userId = await currentUserId();
  if (!supabase || !userId) {
    refreshSyncLabel(false);
    return;
  }
  if (!navigator.onLine) {
    setLabel("离线");
    return;
  }

  const outgoing = (await getAllDocuments()).filter(
    (doc) => doc.syncStatus === "pending" || doc.syncStatus === "error",
  );
  if (!outgoing.length) {
    refreshSyncLabel(true);
    return;
  }

  setLabel("同步中");
  let failed = false;
  for (const doc of outgoing) {
    const { error } = await supabase.from("documents").upsert(toRemote(doc, userId));
    if (error) failed = true;
    const latest = await getDocument(doc.id);
    if (!latest || latest.updatedAt !== doc.updatedAt) continue;
    await putDocument({ ...latest, syncStatus: error ? "error" : "synced" });
  }
  await applyToWorkspace();
  refreshSyncLabel(true, failed);
}

export function flushPending(): Promise<void> {
  if (flushing) {
    flushAgain = true;
    return flushing;
  }
  flushing = (async () => {
    do {
      flushAgain = false;
      await flushOnce();
    } while (flushAgain);
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function pullOnce() {
  const supabase = getSupabase();
  const userId = await currentUserId();
  if (!supabase || !userId || !navigator.onLine) return;

  setLabel("同步中");
  const { data, error } = await supabase.from("documents").select("*").eq("user_id", userId);
  if (error || !data) {
    refreshSyncLabel(true, true);
    return;
  }

  const localMap = new Map((await getAllDocuments()).map((doc) => [doc.id, doc]));
  for (const row of data as RemoteRow[]) {
    const remote = fromRemote(row);
    const existing = localMap.get(remote.id);
    localMap.delete(remote.id);
    if (!existing) {
      await putDocument(remote);
      continue;
    }
    if (existing.syncStatus === "pending" || existing.syncStatus === "error") continue;
    if (remote.updatedAt > existing.updatedAt) await putDocument(remote);
  }

  for (const local of localMap.values()) {
    if (local.syncStatus === "synced" || local.syncStatus === "local") {
      await putDocument({ ...local, syncStatus: "pending" });
    }
  }

  await putMeta({ ...(await getMeta()), lastPulledAt: Date.now() });
  await applyToWorkspace();
  await flushPending();
}

export function pullAndMerge(): Promise<void> {
  if (pulling) {
    pullAgain = true;
    return pulling;
  }
  pulling = (async () => {
    do {
      pullAgain = false;
      await pullOnce();
    } while (pullAgain);
  })().finally(() => {
    pulling = null;
  });
  return pulling;
}

function schedulePull() {
  if (pullTimer) window.clearTimeout(pullTimer);
  pullTimer = window.setTimeout(() => {
    pullTimer = null;
    void pullAndMerge();
  }, 1000);
}

function bindListeners() {
  if (listenersBound) return;
  listenersBound = true;
  window.addEventListener("online", () => void pullAndMerge());
  window.addEventListener("offline", () => setLabel("离线"));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedulePull();
  });
}

export async function startSyncRuntime() {
  const supabase = getSupabase();
  const userId = await currentUserId();
  refreshSyncLabel(Boolean(userId));
  if (!supabase || !userId) return;

  bindListeners();
  if (!channel) {
    channel = supabase
      .channel(`documents-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents", filter: `user_id=eq.${userId}` },
        schedulePull,
      )
      .subscribe();
  }
  await pullAndMerge();
}

export async function stopSyncRuntime() {
  const supabase = getSupabase();
  if (channel && supabase) await supabase.removeChannel(channel);
  channel = null;
  refreshSyncLabel(false);
}
