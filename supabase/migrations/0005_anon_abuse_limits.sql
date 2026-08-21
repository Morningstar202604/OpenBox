-- ============================================================
-- OpenBox —— 匿名写接口滥用防护（0005）
--
-- 背景：0004 已强制 created_at 服务端写入并限制评论昵称长度，但匿名
--       投稿 / 反馈 / 投票仍缺字段级约束与投票去重，脚本刷量成本极低。
--
-- 本次加固三件事（均幂等，可重复执行）：
--   1) submissions / reports 加字段长度与 URL 格式约束（与前端校验对齐，
--      防绕过前端直插超长文本撑库）；
--   2) verifications 增加 voter_fp 设备指纹列 + (resource_id, voter_fp)
--      唯一索引：同一设备对同一资源只能投一票（服务端去重，
--      不再仅依赖前端 localStorage）；
--   3) 约束失败返回 Postgres 错误码 23505/23514，前端已按错误提示兜底。
--
-- 用法：在 Supabase 控制台 SQL Editor 执行一次即可。
-- ============================================================

-- ---------- 1) submissions：字段约束 ----------
alter table public.submissions
  drop constraint if exists submissions_name_len_check;
alter table public.submissions
  add constraint submissions_name_len_check
  check (char_length(name) between 1 and 100);

alter table public.submissions
  drop constraint if exists submissions_url_format_check;
alter table public.submissions
  add constraint submissions_url_format_check
  check (url ~ '^https?://\S{1,500}$');

alter table public.submissions
  drop constraint if exists submissions_summary_len_check;
alter table public.submissions
  add constraint submissions_summary_len_check
  check (char_length(summary) between 1 and 300);

alter table public.submissions
  drop constraint if exists submissions_description_len_check;
alter table public.submissions
  add constraint submissions_description_len_check
  check (description is null or char_length(description) <= 2000);

alter table public.submissions
  drop constraint if exists submissions_submitter_len_check;
alter table public.submissions
  add constraint submissions_submitter_len_check
  check (submitter is null or char_length(submitter) <= 30);

alter table public.submissions
  drop constraint if exists submissions_subtype_len_check;
alter table public.submissions
  add constraint submissions_subtype_len_check
  check (char_length(subType) between 1 and 50);

-- ---------- 2) reports：反馈内容长度 ----------
alter table public.reports
  drop constraint if exists reports_reason_len_check;
alter table public.reports
  add constraint reports_reason_len_check
  check (reason is null or char_length(reason) <= 600);

-- ---------- 3) verifications：设备指纹 + 服务端去重 ----------
alter table public.verifications
  add column if not exists voter_fp text not null default '';

alter table public.verifications
  drop constraint if exists verifications_voter_fp_len_check;
alter table public.verifications
  add constraint verifications_voter_fp_len_check
  check (char_length(voter_fp) <= 64);

-- 同一设备指纹对同一资源只允许一票（历史无指纹的行不受影响）
create unique index if not exists uq_verifications_resource_voter
  on public.verifications (resource_id, voter_fp)
  where voter_fp <> '';
