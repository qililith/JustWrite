# 同步协议

其它模型必须遵守本文件，不要另起冲突策略或引入 PowerSync / Yjs。

## 原则

- IndexedDB 是读写主路径。云是已登录用户的副本。
- 未登录、离线、未配置密钥：本地功能完整可用。
- 单用户多设备，不是协同编辑。
- 冲突：最后写入获胜，比较 `updated_at` / `updatedAt`。
- 本地记录为 `pending` 时，本地优先，推到云上。
- Realtime `postgres_changes` 只表示「远端可能变了」，必须再 `fetch`。不能把 realtime payload 当唯一真相。

## 环境

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

只许 anon key。禁止 service role 进仓库或前端。

未配置时 `isCloudConfigured() === false`，登录入口显示「未配置云同步」。

## 表

见 `supabase/migrations/001_documents.sql`。

- `id` 由客户端生成，跨设备不变。
- `updated_at` 由客户端写入，作 LWW 键。
- `deleted_at` 非空表示软删除。
- RLS：`auth.uid() = user_id` 的 SELECT / INSERT / UPDATE / DELETE。

`syncStatus`、文件夹句柄不上传。

## 推送

1. `repo.save` 先写 IndexedDB，若已登录则 `syncStatus = pending`。
2. 400–800ms 防抖后 `upsert` 整行（id, user_id, title, content, created_at, updated_at, deleted_at, rev）。
3. 成功：`syncStatus = synced`。失败：`syncStatus = error`，下次 flush 重试。
4. 标记前重新读本地记录：若 `updatedAt` 已变（推送期间用户又写了），保持 `pending`，不要用旧快照覆盖。
5. flush 与 pull 各自串行：进行中再被触发只置「再跑一次」标记。

编辑器只在两种条件同时满足时才把 store 里的远端内容载入：记录为 `synced`，且没有尚未落盘的输入（400ms 防抖计时中）。

## 拉取

在这些时机 pull：登录成功、`visibilitychange` 变为 visible、`online` 事件、realtime 提示之后。

1. `select * from documents where user_id = me`（或 `updated_at > lastPulledAt`，但首次必须全量）。
2. 对每一行与本地 LWW：
   - 远端更新且本地不是 `pending` → 覆盖本地。
   - 本地 `pending` → 保留本地，进入 flush。
   - 本地没有 → 插入（含软删，插入后按 `deletedAt` 隐藏）。
3. 写 `lastPulledAt`。
4. flush 所有 `pending`。

## Realtime

订阅 `documents` 的 `*` 事件，`filter: user_id=eq.{uid}`。收到事件后防抖 1s 再 pull，不要直接把 `payload.new` 写入编辑器（除非再 fetch 确认）。

`onAuthStateChange` 回调里不要直接 await supabase 调用（会死锁），用 `setTimeout(…, 0)` 推到回调之后。只在 `INITIAL_SESSION` / `SIGNED_IN` 启动同步，`SIGNED_OUT` 时移除频道。

## 删除

本地设 `deletedAt = Date.now()`，`pending`，从列表隐藏。推送带 `deleted_at`。对端 pull 后隐藏。不要在同步完成前物理删除本地行。

## 退出登录

停止订阅与推送。不清空 IndexedDB。

## 状态文案

- 未配置：未配置云同步
- 未登录：登录以同步
- 推送中：同步中
- 全部 synced：已同步
- `navigator.onLine === false`：离线
- 出错：同步失败
