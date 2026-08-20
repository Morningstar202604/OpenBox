-- ============================================================================
-- OpenBox 数据库扩展脚本（幂等，可重复执行）
-- 用途：补全「分维度评分」与「我的评论」所需的表结构 + RLS 策略。
-- 执行方式：登录 Supabase 控制台 → SQL Editor → 粘贴本文件 → Run。
-- 说明：comments / verifications / favorites / submissions / reports 等表已存在，
--       本脚本仅做「增量补全 + 确保 RLS」，不会破坏现有数据。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) comments 增加 user_id（支持「我的评论」；匿名留言 user_id 为 null）
-- ---------------------------------------------------------------------------
alter table if exists public.comments
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2) 分维度评分表 ratings
-- ---------------------------------------------------------------------------
create table if not exists public.ratings (
  id          uuid primary key default gen_random_uuid(),
  resource_id text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  dimension   text not null,
  score       int  not null check (score between 1 and 5),
  created_at  timestamptz not null default now(),
  unique (resource_id, user_id, dimension)
);
create index if not exists idx_ratings_resource on public.ratings(resource_id);
create index if not exists idx_ratings_user on public.ratings(user_id);

-- ---------------------------------------------------------------------------
-- 3) RLS：ratings（公开可读；仅本人可写/改/删）
-- ---------------------------------------------------------------------------
alter table public.ratings enable row level security;
drop policy if exists "ratings_select" on public.ratings;
create policy "ratings_select" on public.ratings for select using (true);
drop policy if exists "ratings_insert" on public.ratings;
create policy "ratings_insert" on public.ratings for insert with check (auth.uid() = user_id);
drop policy if exists "ratings_update" on public.ratings;
create policy "ratings_update" on public.ratings for update using (auth.uid() = user_id);
drop policy if exists "ratings_delete" on public.ratings;
create policy "ratings_delete" on public.ratings for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4) RLS：comments（公开可读；允许匿名/登录插入；仅本人可改/删）
--    - 匿名留言（user_id 为 null）也可写入，保证社区「避坑分享」零门槛。
-- ---------------------------------------------------------------------------
alter table public.comments enable row level security;
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments for select using (true);
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert with check (true);
drop policy if exists "comments_update" on public.comments;
create policy "comments_update" on public.comments for update using (auth.uid() = user_id);
drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments for delete using (auth.uid() = user_id);
