-- ============================================================
-- OpenBox —— 管理员审核闭环 + 投稿去重（0006）
--
-- 内容：
--   1) admin_emails 表：管理员邮箱清单（仅站长手动维护，无任何 API 读策略，
--      只能被 is_admin() 安全定义函数读取，不暴露给客户端）；
--   2) is_admin()：security definer 函数，基于登录 JWT email 判定管理员；
--   3) submissions 管理员策略：可读待审队列、可改 status（approve/reject）；
--   4) 防重复投稿：pending/approved 状态下同 URL 唯一（部分唯一索引）。
--
-- 用法：Supabase SQL Editor 执行一次（幂等）。
-- 站长开通方式：insert into admin_emails values ('you@example.com');
-- ============================================================

-- ---------- 1) 管理员邮箱表 ----------
create table if not exists public.admin_emails (
  email text primary key
);
alter table public.admin_emails enable row level security;
-- 故意不加任何 policy：该表仅允许 service_role / SQL Editor 访问

-- ---------- 2) is_admin() ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- 3) submissions 管理员策略 ----------
drop policy if exists "submissions_admin_read" on public.submissions;
create policy "submissions_admin_read" on public.submissions
  for select to authenticated using (public.is_admin());

drop policy if exists "submissions_admin_update" on public.submissions;
create policy "submissions_admin_update" on public.submissions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- 4) 投稿去重 ----------
-- 同一 URL 同时只允许存在一条 pending（防刷队列）；approved 允许历史多条但同 URL 仅一条
create unique index if not exists uq_submissions_pending_url
  on public.submissions (lower(url))
  where status = 'pending';

create unique index if not exists uq_submissions_approved_url
  on public.submissions (lower(url))
  where status = 'approved';
