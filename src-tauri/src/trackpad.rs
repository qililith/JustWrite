use std::sync::atomic::{AtomicBool, Ordering};

use webview2_com::Microsoft::Web::WebView2::Win32::{
  ICoreWebView2Controller, ICoreWebView2ZoomFactorChangedEventHandler,
};
use webview2_com::ZoomFactorChangedEventHandler;
use windows_core::PCWSTR;

static RESETTING: AtomicBool = AtomicBool::new(false);

/// WebView2 默认关掉窗口缩放后，触控板捏合不会变成页面里的滚轮事件。
/// 这里只打开窗口缩放，捏合一改变比例就立刻拨回 1，并把比例交给页面去缩放正文。
pub unsafe fn install(controller: &ICoreWebView2Controller) -> windows_core::Result<()> {
  let core = controller.CoreWebView2()?;
  core.Settings()?.SetIsZoomControlEnabled(true)?;

  let handler: ICoreWebView2ZoomFactorChangedEventHandler =
    ZoomFactorChangedEventHandler::create(Box::new(|sender, _| {
      if RESETTING.load(Ordering::SeqCst) {
        return Ok(());
      }
      let Some(controller) = sender else {
        return Ok(());
      };
      let mut factor = 0.0;
      controller.ZoomFactor(&mut factor)?;
      if (factor - 1.0).abs() < 0.001 {
        return Ok(());
      }
      RESETTING.store(true, Ordering::SeqCst);
      let reset = controller.SetZoomFactor(1.0);
      RESETTING.store(false, Ordering::SeqCst);
      reset?;

      if let Ok(core) = controller.CoreWebView2() {
        let script = format!(
          "window.__justwriteHostZoom&&window.__justwriteHostZoom({factor:.6})"
        );
        let mut wide: Vec<u16> = script.encode_utf16().collect();
        wide.push(0);
        let _ = core.ExecuteScript(PCWSTR(wide.as_ptr()), None);
      }
      Ok(())
    }));

  let mut token = 0i64;
  controller.add_ZoomFactorChanged(&handler, &mut token)?;
  Ok(())
}
