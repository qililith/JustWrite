# Agent 硬约束

跨模型开发时每次会话先读本文件和 [README.md](README.md)。

## 范围

只做 README 里列出的功能。不要加斜体、下划线、列表、链接、图片、表格、斜杠命令、查找替换、评论、协同编辑、暗色主题、打印。

## Schema

TipTap 只允许：

- Nodes: `doc` / `paragraph` / `heading(level 1–5, id)` / `text`
- Marks: `bold` / `highlight`

禁止扩展。Heading 的 `id` 在创建时生成，之后不得因输入而更换。

## 存储

1. 先写 IndexedDB，再可选写本机文件夹，再可选推云。
2. 未登录、未绑文件夹、未配 Supabase 时，本地写作必须完整可用。
3. 删除用 `deletedAt` 软删除。
4. 同步冲突：最后写入获胜（比较 `updatedAt`）。本地 `pending` 优先推上去。
5. 不要引入 PowerSync、Yjs、CRDT。
6. 前端只许有 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`。必须有 RLS。

## 交互

- 选区设标题：转换整个块，不是给几个字套 heading 样式。
- 章节聚焦：CSS / decoration 隐藏范围外节点，不改 JSON。
- 无干扰全屏与章节聚焦可叠加。监听 `fullscreenchange`，避免残态。
- `Esc`：工具条 → 退出聚焦 → 退出全屏。
- 界面中文。设计 token 用 `docs/DESIGN.md`：纯黑白中性灰阶，除 Highlight 淡黄与删除/错误红外不要引入带色相的颜色，也不要做成工具栏堆叠的后台风。

## 长目录

必须虚拟化。不要对上千条 heading 做普通 `map` 渲染。

## 验收

每阶段对照 [docs/TASKS.md](docs/TASKS.md)。做完用浏览器走主路径，不要只看截图。
