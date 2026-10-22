# 写文章

英文名 JustWrite。连续滚动的写作工具。左侧是文档列表与长目录，中间是正文；选中文字即可设标题层级、加粗、高亮；可从目录或标题聚焦某一节；一键进入无干扰全屏；登录后可在多设备同步。

本 README 是跨模型开发的**唯一入口**。改代码前先读完本文和 `docs/`，再对照 `docs/TASKS.md` 验收。

## 做 / 不做

**做**

- 文本编辑（连续画布，无分页、无页眉页脚、无打印）
- 多文档：新建 / 重命名 / 删除 / 切换，自动保存
- 长目录：层级、折叠、滚动定位、当前节高亮、虚拟列表、轻量过滤
- 选中文字后设 **正文 / H1–H5**（标题层级 = 目录层级）
- Highlight（淡黄底，可开关）
- 加粗
- 中英混合字数统计
- 章节聚焦：只显示该标题及其下属段落
- 无干扰全屏：藏掉全部界面骨架，进入浏览器全屏
- 侧栏开关：收起 / 展开左侧栏（`Ctrl+\`），记住上次状态
- 云同步（Supabase，可选）：邮箱登录后多设备同步；未登录时本地仍完整可用

**不做**

斜体、下划线、字体、字号、列表、链接、图片、表格、Markdown 源码、查找替换、评论、协同编辑、实时光标、插件、斜杠命令、打印 / 导出 PDF、暗色主题。

禁止“顺手加功能”。不在上面清单里的，就不要做。

## 锁定决策

- 标题层级与目录层级是同一字段：`heading.level` 为 1–5，出现在目录；段落不进目录。
- 选区设标题：把当前块（或多个块）转成对应 heading，而不是只给选中的几个字套标题样式。
- **章节聚焦** 与 **无干扰全屏** 是两件事，可叠加：
  - 章节聚焦 = 过滤正文，只留该节
  - 无干扰全屏 = 藏掉边栏 / 底栏，并请求浏览器全屏
- 存储永远先写 IndexedDB；绑定本机文件夹、云同步都是增强，不是前提。
- 云同步是「单用户多设备」，不是协同写作；冲突用 **最后写入获胜（LWW）**。
- 未登录必须能完整写作、保存、全屏、聚焦；登录只是多了一条同步通道。

## 快速开始

```bash
npm install
npm run dev
```

开发服务器默认 `http://localhost:5173`。请用 Chrome 或 Edge。

```bash
npm run build
npm run preview
```

### 可选：云同步

1. 在 [Supabase](https://supabase.com) 新建项目。
2. 在 SQL Editor 执行 [`supabase/migrations/001_documents.sql`](supabase/migrations/001_documents.sql)。
3. 复制 `.env.example` 为 `.env`，填入项目 URL 与 anon key。
4. 重启开发服务器。

未配置环境变量时，应用照常运行，登录入口会提示「未配置云同步」。

### 部署（Cloudflare Pages）

线上地址：<https://justwrite-cr0.pages.dev>（Pages 项目名 `justwrite`，生产分支 `main`）。

```bash
npx wrangler login   # 首次
npm run deploy       # 构建并上传 dist
```

- `VITE_SUPABASE_*` 在构建时写进产物，所以部署前本机 `.env` 里是什么，线上就是什么。改了 `.env` 要重新 `npm run deploy`。
- 启用云同步后，要在 Supabase → Authentication → URL Configuration 里把线上地址加进 Site URL / Redirect URLs，否则确认邮件会跳回 localhost。
- 需要代理才能访问 Cloudflare 时，先设 `HTTPS_PROXY`，wrangler 会自动使用。

### 桌面版（Tauri 2，Windows）

同一套前端，套 Tauri 壳。首次需要 [Rust](https://rustup.rs)（stable MSVC）与 VS 2022 Build Tools「使用 C++ 的桌面开发」；WebView2 系统自带。

```bash
npm run desktop:dev     # 开发：起 Vite 并打开桌面窗口
npm run desktop:build   # 打包：src-tauri/target/release/bundle/nsis/写文章_*_x64-setup.exe
```

与网页版的差别只在 `src/platform/desktop.ts` 这一层：

- 文稿仍存 IndexedDB（在应用自己的数据目录，清浏览器数据不影响）。
- 绑定文件夹用系统目录选择框，路径存 `meta.folderPath`，由 Rust 命令写盘，没有授权弹窗。
- 无干扰全屏用窗口原生全屏，没有浏览器提示条，Esc 分层完全由应用控制。
- 关窗前先写入尚未保存的正文；只允许运行一个实例。
- 中文字体走 Google Fonts，离线时回退到系统黑体。
- 启动 3 秒后静默检查更新；有新版本时侧栏底部出现「新版本 x.y.z · 重启更新」。

### 发布新版本

版本号只在 `package.json` 里改（`tauri.conf.json` 的 `version` 指向它）。不要手改，用发布命令：

```bash
$env:HTTPS_PROXY='http://127.0.0.1:7897'   # 需要代理时
npm run release            # 0.1.0 → 0.1.1
npm run release -- minor   # 0.1.x → 0.2.0
```

`scripts/release.mjs` 依次：检查工作区干净且在 `main` → `npm version`（提交并打 `vX.Y.Z` 标签）→ `npm run deploy`（网页）→ 签名打包桌面安装包 → 把安装包与 `latest.json` 部署到 Cloudflare Pages 项目 `justwrite-updates`（自动更新源）→ `git push --follow-tags` → `gh release create`（GitHub Release，留存安装包与更新说明，说明取自上个标签以来的提交标题）。

- 更新签名私钥在 `~/.tauri/justwrite.key`，**不进仓库，务必备份**。丢了它，已安装的桌面版就再也收不到更新，只能手动重装。若私钥仍在旧路径 `~/.tauri/changwen.key`，发布脚本会继续用它。
- 更新源放在 Cloudflare Pages 项目 `justwrite-updates`。GitHub Release 同时留存安装包与更新说明。
- 已安装的桌面版点「重启更新」后，安装器以 passive 模式覆盖安装并重启应用；文稿在应用数据目录，不受影响。

## 技术栈

- Vite + React + TypeScript
- TipTap（ProseMirror）
- Zustand
- IndexedDB（`idb`）+ 可选 File System Access API
- `@tanstack/react-virtual`
- `@supabase/supabase-js`
- CSS 变量，无重型 UI 库

**不用** PowerSync / CRDT / Yjs。

## 目录地图

```
README.md                 # 本文件：产品、范围、架构入口
AGENTS.md                 # Agent 硬约束
docs/PRODUCT.md           # 用户流程与交互细则
docs/ARCHITECTURE.md      # 数据流、schema、存储、聚焦与全屏
docs/DESIGN.md            # token、字体、组件外观、zen 态
docs/SYNC.md              # Supabase 表、RLS、LWW、拉取/推送
docs/TASKS.md             # 阶段任务与完成定义
supabase/migrations/      # 建表 + RLS
src/app/                  # 壳、布局
src/features/workspace/   # 文档列表与切换
src/features/editor/      # TipTap、气泡菜单
src/features/outline/     # 长目录
src/features/focus/       # 章节聚焦
src/features/zen/         # 无干扰全屏
src/features/word-count/  # 计数
src/features/auth/        # 登录注册
src/features/sync/        # 推拉与状态
src/storage/              # IndexedDB + 文件夹绑定
src/platform/             # 桌面版（Tauri）专用调用，唯一允许 import @tauri-apps 的地方
src-tauri/                # Tauri 壳：窗口、打包、写盘命令
src/shared/theme/         # CSS 变量
```

## 数据模型

```ts
type DocumentRecord = {
  id: string              // 客户端 UUID，跨设备稳定
  title: string
  content: TipTapJSON     // 最小 schema，见 docs/ARCHITECTURE.md
  createdAt: number
  updatedAt: number       // LWW 比较键
  deletedAt?: number      // 软删除
  rev: number
  syncStatus: "local" | "pending" | "synced" | "error"
}

type WorkspaceState = {
  lastOpenId: string | null
  lastPulledAt?: number
}
```

标题节点必须带稳定 `id`。详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 设计要点

设计语言「黑白」：白纸黑字、中性灰阶、无衬线标题、黑色浮动工具条、大量留白，不带色相。中文界面。token 与组件规则见 [docs/DESIGN.md](docs/DESIGN.md)。

- 画布 `#FFF6EC`，侧栏 `#FFFCF7`
- 标题：Source Serif 4 + Noto Serif SC
- 正文 / UI：Source Sans 3 + Noto Sans SC
- 高亮：`#FDE99B`
- 选区工具条：悬浮胶囊

## 无干扰全屏

进入后屏上默认无常驻按钮。顶 / 左 / 底热区悬停才出现退出、临时目录、字数。`Esc` 由内向外：工具条 → 章节聚焦 → 全屏。详见 [docs/PRODUCT.md](docs/PRODUCT.md)。

## 同步规则

IndexedDB 是读写主路径。登录后防抖 upsert；登录 / 重连先 pull 再 flush pending。Realtime 只作提示。详见 [docs/SYNC.md](docs/SYNC.md)。

## 阶段验收

按 [docs/TASKS.md](docs/TASKS.md) 逐阶段完成。后一阶段不得回改已验收行为，也不得扩大 schema。

## AI 协作约定

1. 改前阅读 `README.md`、`AGENTS.md` 和本次涉及的 `docs/*`。
2. 禁止扩大 TipTap schema（不要加列表、斜体、链接、图片、表格）。
3. 界面文案用中文。
4. 改完对照 `docs/TASKS.md` 对应阶段的验收项。
5. 云同步逻辑以 `docs/SYNC.md` 为准，不要另起一套冲突策略。
6. 标题 `id` 必须稳定；章节聚焦只做视图过滤，禁止从文档树删节点。
