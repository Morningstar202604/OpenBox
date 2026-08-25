-- ============================================================
-- OpenBox —— 契约收编与安全收口（0008）
--
-- 背景（深度审查结论）：
--   A. 0001/0005 中 subType 列未加引号，Postgres 标识符折叠后实际列名为
--      小写 subtype，而前端 Supabase 调用统一使用驼峰 subType ——
--      按仓库迁移新建的库投稿写入必报 PGRST204，读取则 subType 静默为
--      undefined。本迁移把两表列名统一收编为带引号的 "subType"。
--   B. comments.user_id 只存在于 schema.sql，迁移链缺失 —— 「我的评论」
--      查询永远为空。本迁移把该列与本人评论改/删策略收编进迁移链，
--      schema.sql 此后仅作文档。
--   C. RLS 过宽：reports 可被任意登录用户整表读取（含匿名拼进的 note），
--      profiles 全表公开可读。本迁移收口。
--   D. 匿名写面零频控：投票可空指纹绕过去重、评论/举报/投稿可脚本灌水。
--      本迁移引入基于请求 IP 的滑动窗口限流（security definer，无 API 读面）。
--
-- 全部幂等，可重复执行；对已按旧文件建成的库与全新库均收敛到同一形态。
-- 用法：Supabase SQL Editor 执行一次。
-- ============================================================

-- ---------- A) 列名收编：小写 subtype -> 带引号 "subType" ----------
-- 说明：仅当「小写列存在且驼峰列不存在」时重命名；全新库（已引号）为 no-op。
-- 重命名后，旧库上已有的索引/约束（按列序号引用）自动跟随，无需重建。

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'submissions'
               and column_name = 'subtype')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'submissions'
               and column_name = 'subType') then
    execute 'alter table public.submissions rename column subtype to "subType"';
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'resources'
               and column_name = 'subtype')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'resources'
               and column_name = 'subType') then
    execute 'alter table public.resources rename column subtype to "subType"';
  end if;
end $$;

-- ---------- B) comments.user_id 收编进迁移链 ----------
alter table public.comments
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_comments_user on public.comments (user_id);

-- 本人可改/删自己的评论（匿名评论 user_id 为 null，不匹配任何身份）
drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments
  for update to authenticated using (auth.uid() = user_id);

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete to authenticated using (auth.uid() = user_id);

-- ---------- C) RLS 收口 ----------
-- 举报内容（reason 含用户自由拼接的 note）仅管理员经 is_admin() 可读；
-- 前端从不读取 reports，管理员在 SQL 控制台/后台审核。
drop policy if exists "reports_read" on public.reports;
create policy "reports_read" on public.reports
  for select to authenticated using (public.is_admin());

-- profiles 仅本人可读（前端当前不读他人资料）
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select using (auth.uid() = id);

-- ---------- D) 匿名写面限流 + 投票指纹校验 ----------
-- 限流桶：仅 security definer 函数读写，无任何对外策略（不暴露 IP 列表）。
create table if not exists public.ob_rate_limit (
  bucket        text primary key,
  window_start  timestamptz not null,
  writes        integer not null default 0
);
alter table public.ob_rate_limit enable row level security;
-- 故意不加任何 policy：该表仅允许 service_role / SQL Editor / 下方函数访问

-- 取请求者 IP：Supabase 网关把真实 IP 追加在 x-forwarded-for 末位，
-- 取末段而非首段（首段可被客户端伪造）。头缺失/为空时统一落 'unknown' 共享桶
-- （fail-closed：无头来源与匿名来源共用额度，不会绕过限流）。
create or replace function public.ob_client_key()
returns text
language sql stable as $$
  with h as (
    select coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', '') as fwd
  )
  select coalesce(
    nullif(btrim((string_to_array(h.fwd, ','))[array_length(string_to_array(h.fwd, ','), 1)]), ''),
    'unknown'
  )
  from h;
$$;

-- 滑动窗口限流：每 bucket_key 每 60 秒最多 max_writes 次；放行返回 true。
-- 附带 2% 概率顺手清理 1 小时前的过期桶，防表无限增长。
create or replace function public.ob_allow_write(bucket text, max_writes int)
returns boolean
language plpgsql
security definer set search_path = public as $$
declare
  key    text := bucket || ':' || public.ob_client_key();
  now_ts timestamptz := now();
begin
  if random() < 0.02 then
    delete from public.ob_rate_limit where window_start < now_ts - interval '1 hour';
  end if;
  insert into public.ob_rate_limit as r (bucket, window_start, writes)
  values (key, now_ts, 1)
  on conflict (bucket) do update
    set writes = case when r.window_start < now_ts - interval '60 seconds'
                      then 1 else r.writes + 1 end,
        window_start = case when r.window_start < now_ts - interval '60 seconds'
                      then now_ts else r.window_start end
    where r.writes < max_writes
       or r.window_start < now_ts - interval '60 seconds';
  return found;
end;
$$;

-- 投票：指纹必须真实存在（8-64 字符，堵住空指纹绕过去重）+ IP 限流
drop policy if exists "verifications_insert_anon" on public.verifications;
create policy "verifications_insert_anon" on public.verifications for insert
  with check (
    char_length(voter_fp) between 8 and 64
    and public.ob_allow_write('verifications', 10)
  );

-- 评论：每 IP 每分钟 5 条
drop policy if exists "comments_insert_anon" on public.comments;
create policy "comments_insert_anon" on public.comments for insert
  with check (public.ob_allow_write('comments', 5));

-- 举报：每 IP 每分钟 5 条（匿名与登录同桶）
drop policy if exists "reports_insert_anon" on public.reports;
create policy "reports_insert_anon" on public.reports for insert
  with check (public.ob_allow_write('reports', 5));

drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert" on public.reports for insert to authenticated
  with check (public.ob_allow_write('reports', 5));

-- 投稿：每 IP 每分钟 3 条
drop policy if exists "submissions_insert" on public.submissions;
create policy "submissions_insert" on public.submissions for insert
  with check (public.ob_allow_write('submissions', 3));
