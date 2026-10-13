import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isCloudConfigured } from "./supabaseClient";
import {
  refreshSyncLabel,
  startSyncRuntime,
  stopSyncRuntime,
} from "@/features/sync/syncEngine";

type AuthState = {
  configured: boolean;
  session: Session | null;
  modalOpen: boolean;
  error: string | null;
  notice: string | null;
  busy: boolean;
  hydrate: () => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

let hydrated = false;

export const useAuthStore = create<AuthState>((set) => ({
  configured: isCloudConfigured(),
  session: null,
  modalOpen: false,
  error: null,
  notice: null,
  busy: false,

  hydrate: async () => {
    const supabase = getSupabase();
    if (!supabase) {
      refreshSyncLabel(false);
      return;
    }
    if (hydrated) return;
    hydrated = true;
    supabase.auth.onAuthStateChange((event, next) => {
      set({ session: next });
      // supabase-js 回调内不可 await auth 调用，否则会死锁
      window.setTimeout(() => {
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          if (next) void startSyncRuntime();
          else refreshSyncLabel(false);
        } else if (event === "SIGNED_OUT") {
          void stopSyncRuntime();
        }
      }, 0);
    });
  },

  openModal: () => set({ modalOpen: true, error: null, notice: null }),
  closeModal: () => set({ modalOpen: false, error: null, notice: null }),

  signIn: async (email, password) => {
    const supabase = getSupabase();
    if (!supabase) {
      set({ error: "未配置云同步" });
      return;
    }
    set({ busy: true, error: null, notice: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ busy: false, error: error?.message ?? null, modalOpen: Boolean(error) });
  },

  signUp: async (email, password) => {
    const supabase = getSupabase();
    if (!supabase) {
      set({ error: "未配置云同步" });
      return;
    }
    set({ busy: true, error: null, notice: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ busy: false, error: error.message });
      return;
    }
    if (data.session) {
      set({ busy: false, modalOpen: false });
      return;
    }
    set({ busy: false, notice: "注册成功，请查收确认邮件后再登录" });
  },

  signOut: async () => {
    await getSupabase()?.auth.signOut();
    set({ session: null });
  },
}));
