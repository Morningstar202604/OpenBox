-- ============================================================
-- OpenBox —— 分维度评分表（0007）
--
-- 背景：src/lib/ratings.ts 上线起即查询 public.ratings，但历史迁移
--       （0001-0006）从未创建该表 —— 评分功能一直 404（PGRST205）。
--       本迁移补齐：详情页聚合读取 + 登录用户按维度 upsert。
--
-- 结构对齐前端调用：
--   select: dimension, score        （getRatings 按 resource_id 聚合均值）
--   upsert : resource_id, user_id, dimension, score
--            onConflict 'resource_id,user_id,dimension'
--
-- 用法：Supabase 控制台 SQL Editor 执行一次（幂等）。
-- ============================================================

create table if not exists public.ratings (
  id          uuid primary key default gen_random_uuid(),
  resource_id text not null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  dimension   text not null check (char_length(dimension) between 1 and 40),
  score       int  not null check (score between 1 and 5),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 前端 upsert 的冲突目标
create unique index if not exists uq_ratings_resource_user_dimension
  on public.ratings (resource_id, user_id, dimension);

create index if not exists idx_ratings_resource
  on public.ratings (resource_id);

alter table public.ratings enable row level security;

-- 聚合均值公开可读（匿名可看）
drop policy if exists "ratings_read" on public.ratings;
create policy "ratings_read" on public.ratings for select using (true);

-- 仅登录用户可写自己的评分；updated_at 由触发器维护
drop policy if exists "ratings_write_own" on public.ratings;
create policy "ratings_write_own" on public.ratings
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "ratings_update_own" on public.ratings;
create policy "ratings_update_own" on public.ratings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ratings_touch on public.ratings;
create trigger trg_ratings_touch
  before update on public.ratings
  for each row execute function public.touch_updated_at();
