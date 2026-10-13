import { create } from "zustand";

export type SyncLabel =
  | "未配置云同步"
  | "登录以同步"
  | "同步中"
  | "已同步"
  | "离线"
  | "同步失败";

type SyncUiState = {
  label: SyncLabel;
  setLabel: (label: SyncLabel) => void;
};

export const useSyncStore = create<SyncUiState>((set) => ({
  label: "登录以同步",
  setLabel: (label) => set({ label }),
}));
