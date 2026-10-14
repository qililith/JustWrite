# 阶段任务

后一阶段不要回改已验收行为，不要扩大 schema。

## 阶段 0 — 规格

文件：`README.md`、`AGENTS.md`、`docs/*.md`。

验收：新模型只读这些文件就能知道做 / 不做、schema、同步顺序。

## 阶段 1 — 壳与气质

文件：Vite 脚手架、`src/shared/theme`、`src/app` 布局。

验收：打开是白纸黑字、浅灰侧栏，左侧栏 + 右侧正文空态，中文字体加载，配色只有中性灰阶。

## 阶段 2 — 编辑器

文件：`src/features/editor`。

验收：可输入；选中文字出现气泡；可设正文与 H1–H5；加粗、高亮可用；标题视觉层级清楚。

## 阶段 3 — 多文档

文件：`src/storage`、`src/features/workspace`。

验收：新建两篇、编辑、刷新后都在；可重命名、删除（需确认）；自动保存。

## 阶段 4 — 长目录

文件：`src/features/outline`。

验收：标题进入目录；点击跳转；当前节高亮；可折叠与过滤；200+ 标题仍用虚拟列表。

## 阶段 5 — 章节聚焦

文件：`src/features/focus`。

验收：聚焦某 H2 只见该节及下属更低级标题；退出后全文在；JSON 未被删节；保存再打开仍是全文。

## 阶段 6 — 无干扰全屏

文件：`src/features/zen`。

验收：进入后无常驻按钮；顶 / 左 / 底热区分别出现退出、目录、字数；Esc 先退聚焦再退全屏；浏览器退出全屏后边栏回来。

## 阶段 7 — 字数与文件夹

文件：`src/features/word-count`、`src/storage/folder.ts`。

验收：中英混合计数合理；聚焦时显示本节字数；绑定文件夹后磁盘上有 json；权限丢失有提示。

## 阶段 8 — 云同步

文件：`supabase/migrations`、`src/features/auth`、`src/features/sync`。

验收：未配密钥时本地不受影响；登录后 A 写 B 可见（或同一浏览器登出再登入能从云拉回——若只有一台设备，可用删本地库再 pull 验证）；断网编辑后恢复会推送。

## 阶段 9 — 收束

验收主路径：建文档 → 写标题与正文 → 设级 / 加粗 / 高亮 → 目录跳转 → 章节聚焦 → 无干扰全屏（热区、Esc）→ 刷新恢复 → 绑文件夹（若浏览器支持）→ 登录入口可见。对照「不做」清单，没有多余功能。

## 阶段 10 — 桌面版（Tauri 2，Windows，自用）

只是换个壳，不加功能。同一套前端代码，网页版行为不变。

文件：`src-tauri/`、`src/platform/`，以及 `src/storage/folder.ts`、`src/storage/repository.ts`、`src/features/zen/zenStore.ts`、`src/app/App.tsx` 里的平台分支。

1. 环境：rustup（stable MSVC）+ VS 2022 Build Tools「使用 C++ 的桌面开发」。WebView2 系统自带。
2. 脚手架：`@tauri-apps/cli` v2，`src-tauri/` 内 productName `写文章`、identifier `app.justwrite.desktop`、窗口 1280×820（最小 900×600）、打包 NSIS 当前用户安装（不要管理员）、简体中文安装界面。
3. 平台判定：`src/platform/desktop.ts` 导出 `isDesktop()`，所有桌面分支只经它判断；`@tauri-apps/*` 只在 `src/platform/` 内 import。
4. 文件夹：桌面用系统目录选择框，路径存 IndexedDB `meta` 键 `folderPath`；写盘走 Rust 命令 `folder_write` / `folder_remove`，只允许 `manifest.json` 与 `docs/{id}.json`。没有权限弹窗。目录结构与网页版一致。
5. 全屏：桌面用窗口原生全屏（`setFullscreen`），不用浏览器 Fullscreen API；靠窗口 resize 事件同步 `isZen`。没有「按 Esc 退出全屏」提示，Esc 分层完全由应用控制。
6. 关窗保存：关闭窗口前先把编辑器未落盘的内容写入 IndexedDB 与文件夹。
7. 插件：单实例（再次打开只聚焦已有窗口）、记住窗口位置大小。
8. 命令：`npm run desktop:dev`、`npm run desktop:build`；`.gitignore` 忽略 `src-tauri/target`。

验收：

- `npm run desktop:build` 产出安装包，安装后开始菜单有「写文章」，无需管理员。
- 桌面主路径同阶段 9；关窗再开内容还在；关窗前最后几个字没丢。
- 绑定文件夹后磁盘出现 `manifest.json` 与 `docs/*.json`，重启后仍绑定且不弹任何授权。
- 全屏无浏览器提示条；Esc 先关工具条、再退聚焦、最后退全屏；F11 / Ctrl+. 可切换。
- 双击第二次只聚焦已开窗口。
- 网页版 `npm run build` 与线上行为不变。

## 阶段 11 — 发布与自动更新

文件：`scripts/release.mjs`、`src-tauri/tauri.conf.json`（`version` 指向 `package.json`、updater 配置）、`src/platform/desktop.ts`（`checkDesktopUpdate`）。

验收：

- `npm run release` 一次完成升版本、打标签、部署网页、签名打包、上传更新源、推送、GitHub Release；工作区不干净或不在 `main` 时拒绝执行。
- 装着旧版的桌面应用启动后侧栏底部出现「新版本 x.y.z · 重启更新」，点击后自动安装并重启为新版本，文稿还在。
- 离线或更新源不可用时不报错、不出现提示。
