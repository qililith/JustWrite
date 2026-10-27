# 架构

## 数据流

```
UI → Zustand stores → DocumentRepository
                         ├─ IndexedDB（主路径，必写）
                         ├─ FolderBinding（可选，本机目录）
                         └─ SupabaseSync（可选，已登录）
```

界面只通过 store 与 repository 读写文档，不直接碰 IndexedDB / fetch。

## TipTap schema

```
doc
  └─ (paragraph | heading)+
paragraph    → inline*
heading      → inline*   attrs: { level: 1-5, id: string }
inline       → text
text marks   → bold | highlight
```

稳定 heading id：

- 新 heading 在 `create` / 转换时用 `crypto.randomUUID()`（或等价）生成。
- 从 JSON 载入时保留已有 id。
- 输入文字、拆段、合并时不得重发 id。
- 目录、滚动、聚焦全部用这个 id。

空文档：

```json
{
  "type": "doc",
  "content": [{ "type": "paragraph" }]
}
```

## 文档记录

见 README「数据模型」。`syncStatus` 只存在本地，不上云。

## 目录抽取

遍历文档 JSON 的顶层块。每个 `heading` 成为一项 `{ id, level, text }`。`text` 为节点内纯文本。按 level 栈嵌套成树，供折叠使用。扁平列表交给虚拟列表渲染（带缩进）。

当前节：

1. 光标所在块向上找到最近 heading；
2. 若编辑器失焦，用滚动容器里最靠近顶部的 heading；
3. 都没有则无高亮。

## 章节聚焦算法

输入 `focusId`。在顶层块中找到该 heading，记 `start`。向后扫描，遇到 `level <= focusLevel` 的 heading 则结束（不含该节点）。`start..end` 之外的顶层节点加 `data-section-hidden` 或 decoration，CSS `display: none`。

禁止从 ProseMirror 文档树删除节点。保存 / 导出始终用完整 JSON。

## 无干扰全屏

`useZenStore`：`isZen: boolean`。进入时：

1. `isZen = true`
2. `document.documentElement.requestFullscreen()`（失败则忽略）
3. 布局 CSS：`[data-zen] .sidebar, [data-zen] .statusbar { display: none }`
4. 编辑列居中，宽 `--measure`（40 个汉字）。底部多留空白，短文也可滚动。

监听 `fullscreenchange`：若 `document.fullscreenElement === null` 且 `isZen`，则 `isZen = false`。

桌面版第 2 步改为 `getCurrentWindow().setFullscreen(true)`，并用窗口 resize 后的 `isFullscreen()` 代替 `fullscreenchange`（只在状态翻转时同步，忽略切换过程中的中间 resize）。

## 存储

- IndexedDB 库名 `justwrite`，store：`documents`、`meta`。首次打开时若还存在旧库 `changwen`，会把文稿和 meta 复制过来再删掉旧库。
- `documents` 以 `id` 为 key
- `meta` 键 `workspace`：`{ lastOpenId, lastPulledAt }`
- `meta` 键 `folderHandle`：`FileSystemDirectoryHandle`
- IndexedDB 2 秒内打不开时退回内存存储，保证仍能写作

自动保存：editor `onUpdate` → 400ms debounce → `repository.save(doc)`。

本机文件夹（可选）：

- 结构：`manifest.json`（未删除文档的 `id / title / updatedAt` 与 `lastOpenId`）+ `docs/{id}.json`
- 每次保存只写改动的文档与 manifest；软删除的文档从 `docs/` 移除
- 启动和自动保存只查询权限，不弹窗；`requestPermission` 只在用户点「重新允许访问文件夹」时调用
- 不支持 File System Access 的浏览器：侧栏改为「导出当前文档 / 导入文档」（JSON）
- `folder.ts` 把文件夹抽象成 `FolderTarget`（`writeText / remove / hasPermission`）：网页版背后是目录句柄（`meta.folderHandle`），桌面版背后是磁盘路径（`meta.folderPath`），经 Rust 命令 `folder_write / folder_remove` 原子写入；路径不存在时侧栏显示「文件夹不可用，重新选择」

## 桌面壳

`src-tauri/`：Tauri 2。插件：single-instance（再次启动只聚焦已有窗口）、window-state（记住位置大小，不记全屏）、dialog（目录选择）。关窗走 `onCloseRequested`，先 `flushPendingSave()` 把 400ms debounce 里的正文写完再销毁窗口。非输入区域屏蔽 WebView 默认右键菜单。

## 标题聚焦入口

不给 heading 加 React node view（上千个 heading 时会拖慢每次输入）。`HeadingFocusButton` 是正文里唯一的浮动按钮：在编辑区监听 `mousemove`，命中 `.ProseMirror > h1..h5` 时定位到该标题左侧。

## 快捷键

| 键 | 行为 |
| --- | --- |
| Ctrl+B | 加粗 |
| Ctrl+Alt+1..5 | 标题层级 |
| Ctrl+Alt+0 | 正文 |
| Ctrl+. / F11 | 切换无干扰全屏 |
| Ctrl+\ | 收起 / 展开侧栏（全屏时无效） |
| 两指捏合 / Ctrl+滚轮 | 缩放正文（Ctrl+0 恢复，Ctrl++ / Ctrl+- 步进） |
| Esc | 工具条 → 聚焦 → 全屏 |

## 模块边界

| 目录 | 职责 |
| --- | --- |
| `src/storage` | IndexedDB、文件夹读写，无 UI |
| `src/platform` | 桌面版（Tauri）调用：目录选择、写盘、窗口全屏、关窗 |
| `src/features/editor` | TipTap 扩展、气泡、heading id |
| `src/features/outline` | 抽取、虚拟列表、滚动联动 |
| `src/features/focus` | 范围计算、隐藏 decoration |
| `src/features/zen` | 全屏、热区、Esc 分层 |
| `src/features/word-count` | CJK / 拉丁计数 |
| `src/features/workspace` | 列表、新建删除重命名 |
| `src/features/auth` | 登录浮层 |
| `src/features/sync` | pull / push / 状态，遵守 SYNC.md |
