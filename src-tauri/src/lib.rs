use std::path::{Path, PathBuf};

use tauri::Manager;
use tauri_plugin_window_state::StateFlags;

/// 文件夹里只允许出现 `manifest.json` 与 `docs/{id}.json`。
fn workspace_file(root: &str, rel: &str) -> Result<PathBuf, String> {
  let is_doc = rel
    .strip_prefix("docs/")
    .and_then(|name| name.strip_suffix(".json"))
    .is_some_and(|id| {
      !id.is_empty() && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    });
  if rel != "manifest.json" && !is_doc {
    return Err(format!("不允许写入 {rel}"));
  }
  let root = Path::new(root);
  if !root.is_dir() {
    return Err("文件夹不存在".into());
  }
  Ok(root.join(rel))
}

#[tauri::command]
fn folder_exists(root: String) -> bool {
  Path::new(&root).is_dir()
}

#[tauri::command]
fn folder_write(root: String, rel: String, text: String) -> Result<(), String> {
  let path = workspace_file(&root, &rel)?;
  if let Some(parent) = path.parent() {
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }
  let tmp = path.with_extension("json.tmp");
  std::fs::write(&tmp, text).map_err(|e| e.to_string())?;
  std::fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn folder_remove(root: String, rel: String) -> Result<(), String> {
  let path = workspace_file(&root, &rel)?;
  match std::fs::remove_file(path) {
    Ok(()) => Ok(()),
    Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
    Err(e) => Err(e.to_string()),
  }
}

/// 应用标识从 `app.changwen.desktop` 改为 `app.justwrite.desktop` 后，
/// 第一次启动把旧数据目录整份复制过来，避免本地文稿留在旧目录。
fn migrate_legacy_profile() {
  const LEGACY: &str = "app.changwen.desktop";
  const CURRENT: &str = "app.justwrite.desktop";
  for key in ["APPDATA", "LOCALAPPDATA"] {
    let Ok(root) = std::env::var(key) else { continue };
    let from = Path::new(&root).join(LEGACY);
    let to = Path::new(&root).join(CURRENT);
    if to.exists() || !from.is_dir() {
      continue;
    }
    if copy_dir_all(&from, &to).is_err() {
      let _ = std::fs::remove_dir_all(&to);
    }
  }
}

fn copy_dir_all(from: &Path, to: &Path) -> std::io::Result<()> {
  std::fs::create_dir_all(to)?;
  for entry in std::fs::read_dir(from)? {
    let entry = entry?;
    let dest = to.join(entry.file_name());
    if entry.file_type()?.is_dir() {
      copy_dir_all(&entry.path(), &dest)?;
    } else {
      std::fs::copy(entry.path(), dest)?;
    }
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  migrate_legacy_profile();
  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
      }
    }))
    .plugin(
      tauri_plugin_window_state::Builder::default()
        .with_state_flags(StateFlags::all() & !StateFlags::FULLSCREEN)
        .build(),
    )
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![folder_exists, folder_write, folder_remove])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
