import type { JSONContent } from "@tiptap/react";

export type SyncStatus = "local" | "pending" | "synced" | "error";

export type DocumentRecord = {
  id: string;
  title: string;
  content: JSONContent;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  rev: number;
  syncStatus: SyncStatus;
};

export type WorkspaceMeta = {
  lastOpenId: string | null;
  lastPulledAt?: number;
};

export const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const UNNAMED_TITLE = "未命名";
