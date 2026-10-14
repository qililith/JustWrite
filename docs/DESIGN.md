# 设计

设计语言：**黑白**。白纸黑字、中性灰阶、无衬线标题、深色浮动工具条、大量留白。界面不带色相（不偏青、不偏黄），只在侧栏、选区用极浅的中性灰底区分层次；Highlight 用淡黄。参考 Craft 的克制，不复制其品牌资产，也不做成 Word 工具栏。

所有颜色从 `src/shared/theme/tokens.css` 取，组件里不要写新的色值。

## Token

```css
--canvas: #ffffff;          /* 编辑区 */
--surface: #f7f7f7;         /* 侧栏，极浅灰，用色块而非边框分区 */
--surface-raised: #ffffff;  /* 浮起的卡片、输入框、当前文档、弹窗 */
--ink: #111111;             /* 标题、加粗、强调文字 */
--ink-soft: #2e2e2e;        /* 正文、列表项 */
--muted: #8c8c8c;           /* 次要文字、占位符 */
--line: #e6e6e6;
--hover: rgba(0, 0, 0, 0.04);
--accent: #111111;          /* 强调即黑色：光标、聚焦栏文字、主按钮、键盘焦点 */
--accent-soft: #ededed;     /* 当前目录项、聚焦按钮悬停 */
--highlight: #fff1a8;       /* 高亮：淡黄底，正文里唯一的彩色 */
--selection: #d4d4d4;
--focus-bar: #f3f3f3;
--danger: #b3261e;          /* 唯一的彩色，只用于删除与错误 */
--overlay: rgba(0, 0, 0, 0.24);
--toolbar-bg: #111111;
--toolbar-ink: #b8b8b8;
--radius: 12px;
--radius-item: 6px;
--radius-pill: 999px;
--shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 10px 30px rgba(0, 0, 0, 0.08);
--font-sans: "Source Sans 3", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
--font-heading: var(--font-sans);
--measure: 680px;
--sidebar: 272px;
```

只用中性灰阶。禁止引入任何带色相的颜色；例外只有两个：`--highlight` 淡黄（只用于 Highlight 标记）和 `--danger`（只用于删除确认与错误提示）。

## 字体

- 全部用无衬线。标题 `--font-heading`，字重 700，字距约 `-0.015em`（H1 `-0.02em`）。
- H1 2rem / H2 1.55rem / H3 1.28rem / H4 1.12rem / H5 1rem（H5 用 `--ink-soft`）。
- 正文 1.0625rem，行高 1.8，颜色 `--ink-soft`；加粗用 `--ink`。
- 全屏时正文行高 1.85。

从 Google Fonts 加载 Source Sans 3 与 Noto Sans SC（400 / 500 / 700）。中文回退系统黑体。

## 组件

- 侧栏宽 272px，背景 `--surface`，无右边框。
- 文档项、目录项：圆角 `--radius-item`，悬停为 `--hover`。
  - 当前文档：`--surface-raised` 底 + `--line` 细描边，字重 500，**无左侧竖线**。
  - 当前目录项：`--accent-soft` 底 + `--accent` 文字，**无左侧竖线**。
- 过滤框、弹窗输入框：`--surface-raised` / `--canvas` 底，`--line` 边框，聚焦时边框变 `--accent`。
- 选区工具条：`--toolbar-bg` 黑色胶囊，按钮文字 `--toolbar-ink`，当前状态为白字 + 半透明白底。
- 图标：统一用 `src/shared/ui/Icon.tsx`（16 网格、1.5 线宽、`currentColor`），不要用「改 / 删 / + / ▸」这类字符冒充图标。纯图标按钮必须有 `aria-label` 与 `title`（有快捷键时写进 `title`）。
  - 用图标：新建（加号）、重命名（铅笔）、删除（垃圾桶，悬停才转 `--danger`）、展开折叠（箭头）、聚焦（同心圆）、退出（叉）、全屏 / 退出全屏、高亮。
  - 保留文字：「正文 / H1–H5」「B」、侧栏底部状态链接（同步、文件夹、更新）、弹窗按钮。
- 标题旁「聚焦」：`--surface-raised` 圆形图标按钮，悬停转 `--accent-soft` 底 + `--accent` 字。
- 全屏入口：右上角纯图标按钮，无文字，悬停提示快捷键。
- 主按钮：`--accent` 黑底白字胶囊，悬停 `--ink-soft`；删除确认用 `--danger` 底。
- 弹窗：`--surface-raised` 卡片，遮罩 `--overlay` 加轻微模糊，层级高于选区工具条。
- 键盘焦点：`2px` `--accent` 描边。
- 滚动条：细，浅灰。

## Zen

- 画布仍是 `--canvas`（白）。
- 编辑列居中 `--measure`。
- 热区未激活时 `opacity: 0`，不占视觉；激活后为半透明 `--surface-raised` + 背景模糊，160ms 淡入。
- 光标隐藏用 `html.is-idle { cursor: none }`。
