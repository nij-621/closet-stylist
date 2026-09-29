-- 005: 착용 후기. 입은 기록(wear_log)에 만족도·메모 칸을 더한다.
-- Supabase SQL Editor에서 한 번 실행. 여러 번 실행해도 안전.
alter table public.wear_log add column if not exists rating      text check (rating in ('good','ok','bad'));
alter table public.wear_log add column if not exists note        text;
alter table public.wear_log add column if not exists reviewed_at timestamptz;
