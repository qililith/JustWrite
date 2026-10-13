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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
    .invoke_handler(tauri::generate_handler![folder_exists, folder_write, folder_remove])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
