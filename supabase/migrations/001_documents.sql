-- 写文章（JustWrite）：文档表与 RLS。在 Supabase SQL Editor 执行本文件。

create table if not exists public.documents (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  rev int not null default 0
);

create index if not exists documents_user_updated_idx
  on public.documents (user_id, updated_at desc);

alter table public.documents enable row level security;

create policy "documents_select_own"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "documents_insert_own"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "documents_update_own"
  on public.documents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "documents_delete_own"
  on public.documents for delete
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.documents;
