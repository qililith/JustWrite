export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function pickDesktopFolder(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const picked = await open({ directory: true, title: "选择保存文稿的文件夹" });
  return typeof picked === "string" ? picked : null;
}

export async function desktopFolderExists(root: string): Promise<boolean> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<boolean>("folder_exists", { root });
}

export async function desktopFolderWrite(root: string, rel: string, text: string) {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("folder_write", { root, rel, text });
}

export async function desktopFolderRemove(root: string, rel: string) {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("folder_remove", { root, rel });
}

export type DesktopUpdate = {
  version: string;
  install: () => Promise<void>;
};

/** 查询更新源；没有新版本或离线时返回 null。安装时 Windows 会退出应用并由安装器重启。 */
export async function checkDesktopUpdate(): Promise<DesktopUpdate | null> {
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return null;
  return { version: update.version, install: () => update.downloadAndInstall() };
}

export async function setWindowFullscreen(value: boolean) {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setFullscreen(value);
}

/** 只在窗口全屏状态真正翻转时回调，忽略切换过程中的中间 resize。 */
export async function onWindowFullscreenChange(
  callback: (isFullscreen: boolean) => void,
): Promise<() => void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  let last = await win.isFullscreen();
  return win.onResized(async () => {
    const next = await win.isFullscreen();
    if (next === last) return;
    last = next;
    callback(next);
  });
}

/** 关窗前等待 `beforeClose` 完成再销毁窗口。 */
export async function onWindowClose(beforeClose: () => Promise<void>): Promise<() => void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  return win.onCloseRequested(async () => {
    try {
      await beforeClose();
    } catch (error) {
      console.error(error);
    }
    // window-state 会把全屏时的尺寸记成窗口尺寸；先退全屏，让它记下普通窗口大小
    if (await win.isFullscreen().catch(() => false)) {
      await win.setFullscreen(false).catch(() => undefined);
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }
  });
}
